import type { RedraftRoster } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { tryGetSportConfig } from '@/lib/sportConfig'
import type { PlayoffStructure } from './types'

/** Bracket shape defaults from centralized sport config (commissioner can override). */
export function getPlayoffDefaults(sport: string): {
  teamCount: number
  startWeek: number
  rounds: number
  byeCount: number
} {
  const c = tryGetSportConfig(sport)
  if (!c) {
    return { teamCount: 4, startWeek: 15, rounds: 2, byeCount: 0 }
  }
  const teamCount = c.defaultPlayoffTeams
  const startWeek = c.defaultPlayoffStartWeek
  const rounds = Math.max(1, Math.ceil(Math.log2(Math.max(2, teamCount))))
  const nextPow2 = 2 ** rounds
  const byeCount = Math.max(0, nextPow2 - teamCount)
  return { teamCount, startWeek, rounds, byeCount }
}

export function generatePlayoffBracket(
  rosters: RedraftRoster[],
  playoffTeams: number,
  _hasLowerBracket: boolean,
  _lowerBracketType: 'consolation' | 'toilet_bowl',
): PlayoffStructure {
  const sorted = [...rosters].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins
    return b.pointsFor - a.pointsFor
  })
  const seeds = sorted.slice(0, playoffTeams).map((r) => r.id)
  const matchups: { home: string; away: string | null }[] = []
  for (let i = 0; i < Math.floor(seeds.length / 2); i++) {
    matchups.push({ home: seeds[i]!, away: seeds[seeds.length - 1 - i]! })
  }
  if (seeds.length % 2 === 1) {
    matchups.push({ home: seeds[Math.floor(seeds.length / 2)]!, away: null })
  }
  return {
    upperBracket: [{ round: 1, matchups }],
  }
}

export type AdvancePlayoffResult = {
  seasonId: string
  week: number
  /** Number of winner slots filled in the next round. */
  advanced: number
  /** Number of already-filled slots skipped (idempotent re-runs). */
  skipped: number
  /** Matchups that could not be resolved yet (incomplete scores or exact ties). */
  blocked: { matchupId: string; reason: string }[]
  /**
   * 'ok'                           — winners advanced, round still in progress
   * 'round_complete'               — all matchups resolved; next round activated
   * 'ready_for_champion_finalization' — final round is complete; champion crowning is a separate step
   * 'no_active_round'              — bracket exists but no round is currently active
   * 'no_bracket'                   — this season has no playoff bracket yet
   */
  status:
    | 'ok'
    | 'round_complete'
    | 'ready_for_champion_finalization'
    | 'no_active_round'
    | 'no_bracket'
}

/**
 * Advance winners from completed playoff matchups into the next round's slots.
 *
 * Idempotent: running twice produces the same bracket state.
 * Incomplete matchups (missing scores) are skipped without error.
 * Tied matchups are reported in `blocked` for commissioner resolution.
 * Bye matchups are auto-resolved (winnerRosterId already set at generation time).
 * When the final round is complete the function returns `ready_for_champion_finalization`
 * without touching season status — champion crowning is a separate step.
 */
export async function advancePlayoffWinners(
  seasonId: string,
  week: number,
): Promise<AdvancePlayoffResult> {
  const base: Pick<AdvancePlayoffResult, 'seasonId' | 'week'> = { seasonId, week }

  // Verify the bracket exists
  const bracket = await prisma.redraftPlayoffBracket.findUnique({ where: { seasonId } })
  if (!bracket) return { ...base, advanced: 0, skipped: 0, blocked: [], status: 'no_bracket' }

  // Load all rounds ordered; find the active one
  const allRoundsRaw = await prisma.redraftPlayoffRound.findMany({
    where: { seasonId },
    orderBy: { roundNumber: 'asc' },
    include: {
      matchups: {
        orderBy: { matchupNumber: 'asc' },
        include: { nextMatchup: true },
      },
    },
  })

  type RoundWithMatchups = (typeof allRoundsRaw)[number]
  const allRounds: RoundWithMatchups[] = allRoundsRaw

  const activeRound = allRounds.find((r: RoundWithMatchups) => r.status === 'active')
  if (!activeRound) {
    return { ...base, advanced: 0, skipped: 0, blocked: [], status: 'no_active_round' }
  }

  let advanced = 0
  let skipped = 0
  const blocked: AdvancePlayoffResult['blocked'] = []

  for (const matchup of activeRound.matchups) {
    // Resolve winner from score if not already set
    let winnerRosterId = matchup.winnerRosterId

    if (!winnerRosterId) {
      if (matchup.status === 'bye') {
        // Bye: home team auto-advances (set at generation, but guard here)
        winnerRosterId = matchup.homeRosterId
      } else if (matchup.homeScore != null && matchup.awayScore != null) {
        if (matchup.homeScore > matchup.awayScore) {
          winnerRosterId = matchup.homeRosterId
        } else if (matchup.awayScore > matchup.homeScore) {
          winnerRosterId = matchup.awayRosterId
        } else {
          // Exact tie — use points-for tiebreaker via seed order (lower seed wins)
          // Prefer home team as tiebreaker (home seed is always lower in standard seeding)
          if (
            matchup.homeSeed != null &&
            matchup.awaySeed != null &&
            matchup.homeSeed !== matchup.awaySeed
          ) {
            winnerRosterId =
              matchup.homeSeed < matchup.awaySeed ? matchup.homeRosterId : matchup.awayRosterId
          } else {
            // Cannot resolve — commissioner must set winnerRosterId manually
            blocked.push({
              matchupId: matchup.id,
              reason: `Tied score (${matchup.homeScore}–${matchup.awayScore}) with no seed tiebreaker available`,
            })
            continue
          }
        }
      } else {
        // Scores not yet set — matchup not complete
        continue
      }
    }

    if (!winnerRosterId) continue

    // Persist winner on the matchup if not already written
    if (matchup.winnerRosterId !== winnerRosterId) {
      await prisma.redraftPlayoffMatchup.update({
        where: { id: matchup.id },
        data: {
          winnerRosterId,
          status: matchup.status === 'bye' ? 'bye' : 'complete',
        },
      })
    }

    // Advance winner into next matchup slot
    const nextMatchupId = matchup.nextMatchupId
    if (!nextMatchupId) {
      // This matchup has no next — it is the final round's matchup
      // Winner recorded; no slot to fill
      continue
    }

    const nextMatchup = await prisma.redraftPlayoffMatchup.findUnique({
      where: { id: nextMatchupId },
    })
    if (!nextMatchup) continue

    // Idempotency: check if winner is already in a slot
    if (
      nextMatchup.homeRosterId === winnerRosterId ||
      nextMatchup.awayRosterId === winnerRosterId
    ) {
      skipped += 1
      continue
    }

    // Fill the next empty slot
    if (!nextMatchup.homeRosterId) {
      await prisma.redraftPlayoffMatchup.update({
        where: { id: nextMatchupId },
        data: { homeRosterId: winnerRosterId },
      })
      advanced += 1
    } else if (!nextMatchup.awayRosterId) {
      await prisma.redraftPlayoffMatchup.update({
        where: { id: nextMatchupId },
        data: { awayRosterId: winnerRosterId },
      })
      advanced += 1
    } else {
      // Both slots filled by someone else — winner is not in either
      blocked.push({
        matchupId: matchup.id,
        reason: `Next matchup (${nextMatchupId}) already has both teams filled but winner is absent`,
      })
    }
  }

  // After advancing, reload to check if the active round is fully resolved
  const refreshedMatchups = await prisma.redraftPlayoffMatchup.findMany({
    where: { roundId: activeRound.id },
    select: { winnerRosterId: true, status: true },
  })

  const allResolved = (
    refreshedMatchups as { winnerRosterId: string | null; status: string }[]
  ).every((m) => m.winnerRosterId != null || m.status === 'bye')

  if (!allResolved) {
    return { ...base, advanced, skipped, blocked, status: 'ok' }
  }

  // Mark the active round complete
  await prisma.redraftPlayoffRound.update({
    where: { id: activeRound.id },
    data: { status: 'complete' },
  })

  // Find the next pending round
  const nextRound = allRounds.find(
    (r: RoundWithMatchups) => r.roundNumber === activeRound.roundNumber + 1 && r.status === 'pending',
  )

  if (nextRound) {
    await prisma.redraftPlayoffRound.update({
      where: { id: nextRound.id },
      data: { status: 'active' },
    })
    return { ...base, advanced, skipped, blocked, status: 'round_complete' }
  }

  // No next round — the final round just completed
  return { ...base, advanced, skipped, blocked, status: 'ready_for_champion_finalization' }
}
