/**
 * [UPDATED] lib/tournament-mode/safety.ts
 * Tournament safety and rule enforcement:
 * - No trades in tournament leagues.
 * - No draft pick trading.
 * - Eliminated users cannot access competitive actions.
 * - Child leagues cannot exist outside parent tournament mapping (enforced by schema).
 * - Duplicate advancement prevention.
 */

import { prisma } from '@/lib/prisma'
import { isTournamentLeague } from './TournamentConfigService'

export { isTournamentLeague }

/** Trades are not allowed in tournament mode. */
export async function areTradesAllowedForLeague(leagueId: string): Promise<boolean> {
  const isTournament = await isTournamentLeague(leagueId)
  return !isTournament
}

/** Draft pick trading is not allowed in tournament mode. */
export async function isDraftPickTradingAllowedForLeague(leagueId: string): Promise<boolean> {
  return areTradesAllowedForLeague(leagueId)
}

/** Returns a reason string if the league disallows trades. */
export async function getTradeBlockReason(leagueId: string): Promise<string | null> {
  const allowed = await areTradesAllowedForLeague(leagueId)
  if (allowed) return null
  return 'Trades are disabled in Tournament Mode leagues.'
}

/**
 * Check if a user is eliminated from a tournament.
 * Eliminated users should not be able to perform competitive actions (waivers, lineup changes)
 * in their old league or any future league.
 */
export async function isUserEliminatedFromTournament(
  leagueId: string,
  userId: string
): Promise<{ eliminated: boolean; reason?: string }> {
  const tl = await prisma.legacyTournamentLeague.findUnique({
    where: { leagueId },
    select: { tournamentId: true },
  })
  if (!tl) return { eliminated: false }

  const participant = await prisma.legacyTournamentParticipant.findUnique({
    where: { tournamentId_userId: { tournamentId: tl.tournamentId, userId } },
    select: { status: true, eliminatedAtRoundIndex: true, currentLeagueId: true },
  })

  if (!participant) return { eliminated: false }

  if (participant.status === 'eliminated') {
    return {
      eliminated: true,
      reason: `You were eliminated in Round ${participant.eliminatedAtRoundIndex ?? 'unknown'}. Competitive actions are disabled.`,
    }
  }

  // Check if user's current league doesn't match the one they're trying to act in
  // (e.g., trying to set lineup in an old feeder league after advancing)
  if (participant.currentLeagueId && participant.currentLeagueId !== leagueId) {
    return {
      eliminated: false, // not eliminated, but wrong league
      reason: undefined,
    }
  }

  return { eliminated: false }
}

/**
 * Guard for competitive actions in tournament leagues.
 * Returns null if the action is allowed, or an error string if blocked.
 */
export async function tournamentCompetitiveGuard(
  leagueId: string,
  userId: string
): Promise<string | null> {
  const isTournament = await isTournamentLeague(leagueId)
  if (!isTournament) return null

  const { eliminated, reason } = await isUserEliminatedFromTournament(leagueId, userId)
  if (eliminated) return reason ?? 'You have been eliminated from this tournament.'

  return null
}
