/**
 * Compose hardening invariants against a lightweight "engine snapshot" (tests, cron health, admin probes).
 */

import type { InvariantResult } from '@/lib/engine-testing/hardening/engineInvariants'
import {
  assertDraftSessionBelongsToLeague,
  assertStandingsGamesPlayedConsistency,
  assertStandingsRecordShape,
} from '@/lib/engine-testing/hardening/engineInvariants'

export type LeagueEngineConsistencySnapshot = {
  expectedLeagueId: string
  draftSessionLeagueId?: string | null
  standingsRows?: Array<{
    rosterId?: string
    wins: number
    losses: number
    ties: number
    gamesPlayed?: number
  }>
}

/**
 * Run all applicable checks; callers treat any `ok: false` as drift / invalid state.
 */
export function runLeagueEngineConsistencyChecks(
  snapshot: LeagueEngineConsistencySnapshot,
): InvariantResult[] {
  const results: InvariantResult[] = []

  if (snapshot.draftSessionLeagueId != null && String(snapshot.draftSessionLeagueId).trim() !== '') {
    results.push(
      assertDraftSessionBelongsToLeague({
        sessionLeagueId: snapshot.draftSessionLeagueId,
        expectedLeagueId: snapshot.expectedLeagueId,
      }),
    )
  }

  for (const row of snapshot.standingsRows ?? []) {
    results.push(assertStandingsRecordShape(row))
    results.push(assertStandingsGamesPlayedConsistency(row))
  }

  return results
}

export function allConsistencyChecksPass(snapshot: LeagueEngineConsistencySnapshot): boolean {
  return runLeagueEngineConsistencyChecks(snapshot).every((r) => r.ok)
}
