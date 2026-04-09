/**
 * Exile Island Team Draft Engine
 *
 * How it works:
 * 1. Exiled managers submit waiver claims for real sports players
 * 2. If you claim the KEY POSITION player (NFL=QB, MLB=SP, etc.), you win that player's entire team
 * 3. All players from that team are added to your exile roster, removed from others
 * 4. Other managers must re-claim for next available teams
 * 5. Repeats daily until all exile managers have a full team
 * 6. Weekly scoring: team with most fantasy points earns 1 token
 * 7. Boss (commissioner) also drafts — if boss scores highest, ALL tokens reset to 0
 */

import { prisma } from '@/lib/prisma'
import { EXILE_KEY_POSITION_BY_SPORT } from './constants'

export interface ExileClaimResult {
  ok: boolean
  wonTeam: boolean
  teamName?: string
  teamId?: string
  message: string
}

/**
 * Submit a waiver claim for a player on Exile Island.
 */
export async function submitExileTeamClaim(
  leagueId: string,
  exileId: string,
  userId: string,
  week: number,
  player: {
    playerId: string
    playerName: string
    position: string
    team: string
    teamId: string
    sport: string
  },
): Promise<ExileClaimResult> {
  // Check if user already has a team this week
  const existingRoster = await (prisma as any).exileTeamRoster?.findFirst?.({
    where: { leagueId, userId, week },
  })
  if (existingRoster) {
    return { ok: false, wonTeam: false, message: 'You already have a team assigned this week.' }
  }

  // Check if this team is already claimed by someone else this week
  const teamClaimed = await (prisma as any).exileTeamRoster?.findFirst?.({
    where: { leagueId, week, teamId: player.teamId },
  })
  if (teamClaimed) {
    return { ok: false, wonTeam: false, message: `${player.team} is already claimed by another exile manager this week.` }
  }

  const keyPosition = EXILE_KEY_POSITION_BY_SPORT[player.sport.toUpperCase()] ?? 'QB'
  const isKeyPosition = player.position.toUpperCase() === keyPosition.toUpperCase()

  // Record the claim
  const claim = await (prisma as any).exileTeamClaim?.create?.({
    data: {
      leagueId,
      exileId,
      userId,
      week,
      claimedPlayerId: player.playerId,
      claimedPlayerName: player.playerName,
      claimedPlayerPosition: player.position,
      claimedPlayerTeam: player.team,
      claimedPlayerTeamId: player.teamId,
      sport: player.sport,
      isKeyPosition,
      wonTeam: isKeyPosition,
      status: isKeyPosition ? 'won' : 'pending',
      processedAt: isKeyPosition ? new Date() : null,
    },
  })

  if (isKeyPosition) {
    // Winner! Assign the entire team
    await assignFullTeamToExileManager(leagueId, exileId, userId, week, player.teamId, player.team, player.sport, player.playerId, player.playerName, player.position)

    // Remove this team's players from other managers' pending claims
    await (prisma as any).exileTeamClaim?.updateMany?.({
      where: {
        leagueId,
        week,
        claimedPlayerTeamId: player.teamId,
        userId: { not: userId },
        status: 'pending',
      },
      data: { status: 'reassigned', processedAt: new Date() },
    })

    return {
      ok: true,
      wonTeam: true,
      teamName: player.team,
      teamId: player.teamId,
      message: `You claimed ${player.playerName} (${keyPosition})! You now have the entire ${player.team} roster for this week.`,
    }
  }

  return {
    ok: true,
    wonTeam: false,
    message: `Claim submitted for ${player.playerName} (${player.position}). To win the team, you need to claim the ${keyPosition}. Keep trying!`,
  }
}

/**
 * Assign an entire real-world team to an exile manager's roster.
 */
async function assignFullTeamToExileManager(
  leagueId: string,
  exileId: string,
  userId: string,
  week: number,
  teamId: string,
  teamName: string,
  sport: string,
  keyPlayerId: string,
  keyPlayerName: string,
  keyPlayerPosition: string,
): Promise<void> {
  // Fetch all players on this real-world team from SportsPlayer/SportsTeam
  const teamPlayers = await (prisma as any).sportsPlayer?.findMany?.({
    where: { team: teamName, sport: sport.toUpperCase() },
    select: { id: true, name: true, position: true, team: true },
  }).catch(() => []) ?? []

  const playerData = teamPlayers.length > 0
    ? teamPlayers.map((p: any) => ({
        playerId: p.id,
        playerName: p.name,
        position: p.position,
        team: p.team,
      }))
    : [{ playerId: keyPlayerId, playerName: keyPlayerName, position: keyPlayerPosition, team: teamName }]

  await (prisma as any).exileTeamRoster?.create?.({
    data: {
      leagueId,
      exileId,
      userId,
      week,
      teamId,
      teamName,
      sport,
      keyPlayerId,
      keyPlayerName,
      keyPlayerPosition,
      players: playerData,
      totalPoints: 0,
      isActive: true,
      isBossTeam: false,
    },
  })
}

/**
 * Process weekly exile scoring. Awards tokens and handles boss reset.
 */
export async function processExileWeeklyScoring(
  leagueId: string,
  exileId: string,
  week: number,
): Promise<{
  topScorer: string | null
  tokenAwarded: boolean
  bossWon: boolean
  tokensReset: boolean
}> {
  // Get all exile team rosters for this week
  const rosters = await (prisma as any).exileTeamRoster?.findMany?.({
    where: { leagueId, week, isActive: true },
    select: { userId: true, totalPoints: true, isBossTeam: true },
  }) ?? []

  if (rosters.length === 0) {
    return { topScorer: null, tokenAwarded: false, bossWon: false, tokensReset: false }
  }

  // Find top scorer
  const sorted = [...rosters].sort((a: any, b: any) => (b.totalPoints ?? 0) - (a.totalPoints ?? 0))
  const topRoster = sorted[0]!
  const isBossWin = topRoster.isBossTeam === true

  if (isBossWin) {
    // Boss wins — reset ALL exile tokens to 0
    await (prisma as any).survivorExileToken?.updateMany?.({
      where: { leagueId },
      data: { tokens: 0 },
    })

    // Update exile weekly entries
    await (prisma as any).exileWeeklyEntry?.updateMany?.({
      where: { leagueId, week },
      data: { bossWon: true, tokenWiped: true },
    })

    return { topScorer: 'Boss', tokenAwarded: false, bossWon: true, tokensReset: true }
  }

  // Non-boss top scorer gets 1 token
  const winnerId = topRoster.userId
  const existingToken = await (prisma as any).survivorExileToken?.findFirst?.({
    where: { leagueId, rosterId: winnerId },
  })

  if (existingToken) {
    await (prisma as any).survivorExileToken?.update?.({
      where: { id: existingToken.id },
      data: { tokens: existingToken.tokens + 1, lastAwardedWeek: week },
    })
  } else {
    await (prisma as any).survivorExileToken?.create?.({
      data: { leagueId, rosterId: winnerId, tokens: 1, lastAwardedWeek: week },
    })
  }

  // Update SurvivorPlayer token balance
  await (prisma as any).survivorPlayer?.updateMany?.({
    where: { leagueId, userId: winnerId },
    data: { tokenBalance: (existingToken?.tokens ?? 0) + 1 },
  })

  return { topScorer: winnerId, tokenAwarded: true, bossWon: false, tokensReset: false }
}

/**
 * Process exile return at the configured week.
 * Returns the manager with the most tokens. Full tiebreaker chain.
 */
export async function processExileReturn(
  leagueId: string,
): Promise<{ returneeId: string | null; returneeeName: string | null; tiebreakUsed: string | null }> {
  const exileTokens = await (prisma as any).survivorExileToken?.findMany?.({
    where: { leagueId },
    orderBy: { tokens: 'desc' },
  }) ?? []

  if (exileTokens.length === 0) {
    return { returneeId: null, returneeeName: null, tiebreakUsed: null }
  }

  const maxTokens = exileTokens[0]?.tokens ?? 0
  const candidates = exileTokens.filter((t: any) => t.tokens === maxTokens)

  let winnerId: string
  let tiebreakUsed: string | null = null

  if (candidates.length === 1) {
    winnerId = candidates[0].rosterId
  } else {
    // Tiebreaker 1: Most total tokens earned over career
    const playerRecords = await (prisma as any).survivorPlayer?.findMany?.({
      where: { leagueId, userId: { in: candidates.map((c: any) => c.rosterId) } },
      select: { userId: true, totalTokensEarned: true, eliminatedWeek: true },
    }) ?? []

    const byTotalEarned = [...playerRecords].sort((a: any, b: any) => (b.totalTokensEarned ?? 0) - (a.totalTokensEarned ?? 0))
    const maxEarned = byTotalEarned[0]?.totalTokensEarned ?? 0
    const earnedTied = byTotalEarned.filter((p: any) => (p.totalTokensEarned ?? 0) === maxEarned)

    if (earnedTied.length === 1) {
      winnerId = earnedTied[0].userId
      tiebreakUsed = 'total_tokens_earned'
    } else {
      // Tiebreaker 2: Highest single-week exile score
      const weeklyScores = await (prisma as any).exileWeeklyEntry?.findMany?.({
        where: { leagueId, userId: { in: earnedTied.map((p: any) => p.userId) } },
        orderBy: { weeklyScore: 'desc' },
        take: 1,
      }) ?? []

      if (weeklyScores.length > 0) {
        winnerId = weeklyScores[0].userId
        tiebreakUsed = 'highest_weekly_score'
      } else {
        // Tiebreaker 3: Earliest elimination (longest exile tenure)
        const byElimWeek = [...earnedTied].sort((a: any, b: any) => (a.eliminatedWeek ?? 999) - (b.eliminatedWeek ?? 999))
        winnerId = byElimWeek[0].userId
        tiebreakUsed = byElimWeek.length > 1 && byElimWeek[0].eliminatedWeek === byElimWeek[1]?.eliminatedWeek
          ? 'random'
          : 'earliest_elimination'
      }
    }
  }

  // Execute the return
  const player = await (prisma as any).survivorPlayer?.findFirst?.({
    where: { leagueId, userId: winnerId },
  })

  if (player) {
    // Convert tokens to FAAB (5 per token)
    const faabBonus = (maxTokens ?? 0) * 5

    await (prisma as any).survivorPlayer?.update?.({
      where: { id: player.id },
      data: {
        playerState: 'active',
        canAccessTribeChat: false,  // Will be assigned to merged tribe
        canAccessMergeChat: true,
        canAccessExileChat: false,
        canAccessJuryChat: false,
        exileReturnEligible: false,
        tokenBalance: 0,
      },
    })

    // Reset their exile tokens
    await (prisma as any).survivorExileToken?.updateMany?.({
      where: { leagueId, rosterId: winnerId },
      data: { tokens: 0 },
    })
  }

  return {
    returneeId: winnerId,
    returneeeName: player?.displayName ?? winnerId,
    tiebreakUsed,
  }
}

/**
 * Get available teams for exile draft claims (not yet claimed this week).
 */
export async function getAvailableTeamsForExile(
  leagueId: string,
  week: number,
  sport: string,
): Promise<Array<{ teamId: string; teamName: string; keyPosition: string; claimed: boolean }>> {
  // Get all real-world teams for this sport
  const allTeams = await (prisma as any).sportsTeam?.findMany?.({
    where: { sport: sport.toUpperCase() },
    select: { externalId: true, name: true },
  }).catch(() => []) ?? []

  // Get already-claimed teams this week
  const claimedRosters = await (prisma as any).exileTeamRoster?.findMany?.({
    where: { leagueId, week },
    select: { teamId: true },
  }) ?? []
  const claimedIds = new Set(claimedRosters.map((r: any) => r.teamId))

  const keyPos = EXILE_KEY_POSITION_BY_SPORT[sport.toUpperCase()] ?? 'QB'

  return allTeams.map((t: any) => ({
    teamId: t.externalId,
    teamName: t.name,
    keyPosition: keyPos,
    claimed: claimedIds.has(t.externalId),
  }))
}
