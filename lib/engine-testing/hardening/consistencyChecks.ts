/**
 * Compose hardening invariants against a lightweight "engine snapshot" (tests, cron health, admin probes).
 */

import type { InvariantResult } from '@/lib/engine-testing/hardening/engineInvariants'
import {
  assertDraftSessionBelongsToLeague,
  assertImportExternalIdBatchUnique,
  assertMatchupPayloadWeekAligned,
  assertNoDuplicateAutomationRun,
  assertNoDuplicateWaiverRun,
  assertNotificationDedupeKeyPresent,
  assertSingleDraftCompletionMarker,
  assertStandingsGamesPlayedConsistency,
  assertStandingsRecordShape,
  assertTradePlayersOwnedBySendingRoster,
  assertValidSpecialtyAutomationTrigger,
} from '@/lib/engine-testing/hardening/engineInvariants'

export type LeagueEngineConsistencySnapshot = {
  expectedLeagueId: string
  draftSessionLeagueId?: string | null
  /** When set, asserts at most one draft completion artifact. */
  draftCompletionMarkerCount?: number
  standingsRows?: Array<{
    rosterId?: string
    wins: number
    losses: number
    ties: number
    gamesPlayed?: number
  }>
  /** Matchup command center week alignment. */
  matchupPayloadWeek?: number
  expectedMatchupWeek?: number
  /** Waiver idempotency — completed keys for this league (logical). */
  waiverRunKey?: string
  waiverCompletedRunKeys?: ReadonlySet<string>
  waiverForce?: boolean
  /** Automation idempotency probe. */
  automationThisRunKey?: string
  automationLastCompletedKey?: string | null
  automationForce?: boolean
  /** Notification dedupe probe (fan-out). */
  notificationDedupeKey?: string | null
  /** Specialty trigger string validation. */
  specialtyTrigger?: string
  /** Trade leg: players on roster vs players sent. */
  tradeRosterPlayerIds?: string[]
  tradeSendingPlayerIds?: string[]
  /** Import merge: Sleeper/Yahoo external roster keys in one batch. */
  importExternalIds?: string[]
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

  if (snapshot.draftCompletionMarkerCount != null) {
    results.push(assertSingleDraftCompletionMarker({ completionMarkerCount: snapshot.draftCompletionMarkerCount }))
  }

  for (const row of snapshot.standingsRows ?? []) {
    results.push(assertStandingsRecordShape(row))
    results.push(assertStandingsGamesPlayedConsistency(row))
  }

  if (
    snapshot.matchupPayloadWeek != null &&
    snapshot.expectedMatchupWeek != null
  ) {
    results.push(
      assertMatchupPayloadWeekAligned({
        payloadWeek: snapshot.matchupPayloadWeek,
        expectedWeek: snapshot.expectedMatchupWeek,
      }),
    )
  }

  if (snapshot.waiverRunKey != null && snapshot.waiverCompletedRunKeys != null) {
    results.push(
      assertNoDuplicateWaiverRun({
        runKey: snapshot.waiverRunKey,
        completedRunKeys: snapshot.waiverCompletedRunKeys,
        force: Boolean(snapshot.waiverForce),
      }),
    )
  }

  if (snapshot.automationThisRunKey != null) {
    results.push(
      assertNoDuplicateAutomationRun({
        thisRunKey: snapshot.automationThisRunKey,
        lastCompletedRunKey: snapshot.automationLastCompletedKey,
        force: Boolean(snapshot.automationForce),
      }),
    )
  }

  if (snapshot.notificationDedupeKey !== undefined) {
    results.push(assertNotificationDedupeKeyPresent(snapshot.notificationDedupeKey))
  }

  if (snapshot.specialtyTrigger != null) {
    results.push(assertValidSpecialtyAutomationTrigger(snapshot.specialtyTrigger))
  }

  if (snapshot.tradeRosterPlayerIds != null && snapshot.tradeSendingPlayerIds != null) {
    results.push(
      assertTradePlayersOwnedBySendingRoster({
        rosterPlayerIds: snapshot.tradeRosterPlayerIds,
        sendingPlayerIds: snapshot.tradeSendingPlayerIds,
      }),
    )
  }

  if (snapshot.importExternalIds != null && snapshot.importExternalIds.length > 0) {
    results.push(assertImportExternalIdBatchUnique(snapshot.importExternalIds))
  }

  return results
}

export function allConsistencyChecksPass(snapshot: LeagueEngineConsistencySnapshot): boolean {
  return runLeagueEngineConsistencyChecks(snapshot).every((r) => r.ok)
}
