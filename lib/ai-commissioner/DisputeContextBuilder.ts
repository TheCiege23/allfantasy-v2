import { prisma } from '@/lib/prisma'

export interface DisputeContextInput {
  leagueId: string
  relatedTradeId?: string | null
  relatedMatchupId?: string | null
}

export interface DisputeContextResult {
  summary: string
  payload: Record<string, unknown>
}

function safeObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

export async function buildDisputeContext(input: DisputeContextInput): Promise<DisputeContextResult> {
  const league = await prisma.league.findUnique({
    where: { id: input.leagueId },
    select: { id: true, platformLeagueId: true, sport: true, season: true, settings: true },
  })
  if (!league) {
    return { summary: 'League not found for dispute context.', payload: {} }
  }

  const payload: Record<string, unknown> = {
    leagueId: league.id,
    sport: league.sport,
    season: league.season ?? null,
  }
  const settings = safeObject(league.settings)

  if (input.relatedTradeId) {
    const trade = await prisma.leagueTrade.findFirst({
      where: {
        id: input.relatedTradeId,
        history: { sleeperLeagueId: league.platformLeagueId },
      },
      select: {
        id: true,
        transactionId: true,
        week: true,
        season: true,
        partnerName: true,
        partnerRosterId: true,
        valueGiven: true,
        valueReceived: true,
        analysisResult: true,
      },
    })
    if (trade) {
      payload.trade = trade
      const delta =
        trade.valueGiven != null && trade.valueReceived != null
          ? Math.abs(trade.valueGiven - trade.valueReceived)
          : null
      return {
        summary: `Trade dispute context for transaction ${trade.transactionId}. Value delta ${
          delta != null ? Math.round(delta * 100) / 100 : 'unknown'
        }, review mode ${String(settings.tradeReviewType ?? 'unspecified')}.`,
        payload,
      }
    }
  }

  if (input.relatedMatchupId) {
    const matchup = await prisma.matchupFact.findFirst({
      where: {
        matchupId: input.relatedMatchupId,
        leagueId: input.leagueId,
      },
      select: {
        matchupId: true,
        weekOrPeriod: true,
        season: true,
        teamA: true,
        teamB: true,
        scoreA: true,
        scoreB: true,
        winnerTeamId: true,
      },
    })
    if (matchup) {
      payload.matchup = matchup
      return {
        summary: `Matchup dispute context for period ${matchup.weekOrPeriod}: ${matchup.teamA} (${matchup.scoreA}) vs ${matchup.teamB} (${matchup.scoreB}).`,
        payload,
      }
    }
  }

  return {
    summary: `General governance dispute context. Trade review mode: ${String(
      settings.tradeReviewType ?? 'unspecified'
    )}; veto threshold: ${String(settings.vetoThreshold ?? 'unset')}.`,
    payload: {
      ...payload,
      settings: {
        tradeReviewType: settings.tradeReviewType ?? null,
        vetoThreshold: settings.vetoThreshold ?? null,
      },
    },
  }
}
