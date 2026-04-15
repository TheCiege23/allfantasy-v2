/**
 * Token Pool Pick'em Engine for Survivor Exile Island.
 *
 * Exiled players earn tokens by making correct game predictions.
 * Tokens are used for re-entry qualification, FAAB conversion, and advantages.
 */

import { prisma } from '@/lib/prisma'

export interface TokenPoolPickInput {
  leagueId: string
  userId: string
  week: number
  sport: string
  pickType: 'win_pick' | 'over_under' | 'prop_bet' | 'exact_score'
  pick: Record<string, unknown>
}

export interface TokenPoolPickResult {
  pickId: string
  isCorrect: boolean
  tokensEarned: number
  tokensLost: number
  newBalance: number
}

/**
 * Submit a pick for the token pool. Validates the user is on exile
 * and the pick hasn't been submitted for this week yet.
 */
export async function submitTokenPoolPick(input: TokenPoolPickInput): Promise<{ pickId: string }> {
  // Verify user is on exile
  const player = await (prisma as any).survivorPlayer.findFirst({
    where: { leagueId: input.leagueId, userId: input.userId },
  })
  if (!player || player.playerState !== 'exile') {
    throw new Error('Only exiled players can submit token pool picks')
  }

  // Check for duplicate pick
  const existing = await (prisma as any).tokenPoolPick.findFirst({
    where: {
      leagueId: input.leagueId,
      userId: input.userId,
      week: input.week,
      pickType: input.pickType,
    },
  })
  if (existing) {
    throw new Error('Pick already submitted for this week and type')
  }

  const pick = await (prisma as any).tokenPoolPick.create({
    data: {
      leagueId: input.leagueId,
      userId: input.userId,
      week: input.week,
      sport: input.sport,
      pickType: input.pickType,
      pick: input.pick,
      isCorrect: false,
      tokensEarned: 0,
      tokensLost: 0,
      submittedAt: new Date(),
    },
  })

  return { pickId: pick.id }
}

/**
 * Resolve picks for a given week against actual game results.
 * Awards or deducts tokens based on correctness and league config.
 */
export async function resolveTokenPoolPicks(
  leagueId: string,
  week: number,
  results: Record<string, { winner?: string; totalScore?: number; correct?: boolean }>,
): Promise<TokenPoolPickResult[]> {
  const picks = await (prisma as any).tokenPoolPick.findMany({
    where: { leagueId, week, isCorrect: false, tokensEarned: 0, tokensLost: 0 },
  })

  const league = await (prisma as any).league.findUnique({
    where: { id: leagueId },
    select: { survivorExileHarshTokenLoss: true },
  })
  const harshMode = league?.survivorExileHarshTokenLoss === true

  const outcomes: TokenPoolPickResult[] = []

  for (const pick of picks) {
    const pickData = pick.pick as Record<string, unknown>
    const gameKey = String(pickData.gameId ?? pickData.gameKey ?? '')
    const result = results[gameKey]

    let isCorrect = false
    if (result) {
      if (pick.pickType === 'win_pick') {
        isCorrect = pickData.winner === result.winner
      } else if (pick.pickType === 'over_under') {
        const line = Number(pickData.line ?? 0)
        const actual = Number(result.totalScore ?? 0)
        const overUnder = String(pickData.selection ?? 'over')
        isCorrect = overUnder === 'over' ? actual > line : actual < line
      } else if (pick.pickType === 'prop_bet') {
        isCorrect = result.correct === true
      } else if (pick.pickType === 'exact_score') {
        isCorrect = Number(pickData.predictedScore) === Number(result.totalScore)
      }
    }

    const tokensEarned = isCorrect ? 1 : 0
    const tokensLost = !isCorrect && harshMode ? 1 : 0

    // Update pick record
    await (prisma as any).tokenPoolPick.update({
      where: { id: pick.id },
      data: { isCorrect, tokensEarned, tokensLost },
    })

    // Update exile token balance
    const exileToken = await (prisma as any).survivorExileToken.findFirst({
      where: { leagueId, rosterId: pick.userId },
    })

    const currentBalance = exileToken?.tokens ?? 0
    const newBalance = Math.max(0, currentBalance + tokensEarned - tokensLost)

    if (exileToken) {
      await (prisma as any).survivorExileToken.update({
        where: { id: exileToken.id },
        data: { tokens: newBalance, lastAwardedWeek: week },
      })
    }

    outcomes.push({
      pickId: pick.id,
      isCorrect,
      tokensEarned,
      tokensLost,
      newBalance,
    })
  }

  return outcomes
}

/**
 * Get token pool picks for a user in a specific week.
 */
export async function getTokenPoolPicks(
  leagueId: string,
  userId: string,
  week?: number,
): Promise<unknown[]> {
  return (prisma as any).tokenPoolPick.findMany({
    where: {
      leagueId,
      userId,
      ...(week != null && { week }),
    },
    orderBy: { submittedAt: 'desc' },
  })
}

/**
 * Get token balance for a user.
 */
export async function getTokenBalance(leagueId: string, userId: string): Promise<number> {
  const token = await (prisma as any).survivorExileToken.findFirst({
    where: { leagueId, rosterId: userId },
  })
  return token?.tokens ?? 0
}
