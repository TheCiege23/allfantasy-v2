/**
 * lib/big-brother/BigBrotherHaveNotPenaltyService.ts
 *
 * Applies Have-Not gameplay penalties within a Big Brother league cycle:
 *
 * 1. Waiver priority penalty — moves Have-Not rosters to the back of the
 *    league's waiver priority queue (higher number = lower priority in most
 *    fantasy systems). Applied once when the HOH phase is resolved and the
 *    Have-Not roster is determined for the cycle.
 *
 * 2. Challenge score penalty — reduces the Have-Not roster's raw challenge
 *    score by HAVE_NOT_CHALLENGE_PENALTY_PCT before the winner is resolved.
 *    Callers pass a score map to `applyHaveNotChallengeScorePenalty` and
 *    receive a modified score map — the challenge engine outcome stays
 *    deterministic and auditable.
 *
 * Usage in automation:
 *   1. After resolving Have-Nots for the cycle, call `applyHaveNotWaiverPenalties`.
 *   2. Before calling `resolveChallengeByScore`, call
 *      `applyHaveNotChallengeScorePenalty` on the raw scores.
 */

import { prisma } from '@/lib/prisma'
import { resolveHaveNotRosterIdsForCycle } from './BigBrotherChatChannels'

/** Fraction by which Have-Not challenge score is reduced (10%). */
export const HAVE_NOT_CHALLENGE_PENALTY_PCT = 0.1

/**
 * Bump Have-Not rosters to the back of the waiver priority queue.
 *
 * The function reads current `waiverPriority` values for all active rosters in
 * the league, then reassigns Have-Nots to priority numbers higher than the
 * current maximum (i.e. worst position). Non-Have-Not priorities are unchanged.
 *
 * Returns the roster IDs that were penalised.
 */
export async function applyHaveNotWaiverPenalties(
  leagueId: string,
  cycleId: string,
): Promise<string[]> {
  const [allRosters, haveNotIds] = await Promise.all([
    prisma.roster.findMany({
      where: { leagueId },
      select: { id: true, waiverPriority: true },
      orderBy: { waiverPriority: 'asc' },
    }),
    resolveHaveNotRosterIdsForCycle(leagueId, cycleId),
  ])

  if (haveNotIds.length === 0) return []

  const haveNotSet = new Set(haveNotIds)
  const nonHaveNotPriorities = allRosters
    .filter((r) => !haveNotSet.has(r.id) && r.waiverPriority != null)
    .map((r) => r.waiverPriority as number)
  const maxPriority =
    nonHaveNotPriorities.length > 0 ? Math.max(...nonHaveNotPriorities) : allRosters.length

  // Assign each Have-Not a priority beyond the current maximum, preserving
  // relative ordering among themselves (first-found gets the worst slot).
  const penalisedIds: string[] = []
  let bump = maxPriority + 1
  for (const haveNotId of haveNotIds) {
    await prisma.roster.updateMany({
      where: { id: haveNotId, leagueId },
      data: { waiverPriority: bump },
    })
    bump++
    penalisedIds.push(haveNotId)
  }

  return penalisedIds
}

/**
 * Reduce Have-Not rosters' scores by HAVE_NOT_CHALLENGE_PENALTY_PCT before
 * the challenge winner is determined.
 *
 * @param scores         Original per-roster-id score map.
 * @param haveNotIds     Roster IDs that are Have-Nots this cycle.
 * @param penaltyPct     Override penalty fraction (default: HAVE_NOT_CHALLENGE_PENALTY_PCT).
 * @returns              New score map with penalties applied.
 */
export function applyHaveNotChallengeScorePenalty(
  scores: Record<string, number>,
  haveNotIds: string[],
  penaltyPct: number = HAVE_NOT_CHALLENGE_PENALTY_PCT,
): Record<string, number> {
  if (haveNotIds.length === 0) return scores
  const result = { ...scores }
  for (const id of haveNotIds) {
    if (typeof result[id] === 'number') {
      result[id] = result[id] * (1 - penaltyPct)
    }
  }
  return result
}
