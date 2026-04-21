/**
 * Pure guardrails for engines — safe to call from tests, cron, or API layers.
 */

import type { LeagueLifecycleState } from '@prisma/client'
import {
  validateTransition,
  isActionAllowed,
  type LeagueLifecycleAction,
} from '@/server/services/leagueLifecycleService'

export type InvariantResult = { ok: true } | { ok: false; code: string; message: string }

export function assertLifecycleTransitionAllowed(
  current: LeagueLifecycleState,
  next: LeagueLifecycleState,
): InvariantResult {
  const v = validateTransition(current, next)
  if (!v.ok) return { ok: false, code: 'INVALID_LIFECYCLE_TRANSITION', message: v.reason }
  return { ok: true }
}

export function assertLifecycleActionInState(
  action: LeagueLifecycleAction,
  state: LeagueLifecycleState,
  opts?: { commissionerOverride?: boolean; roleIsElevated?: boolean },
): InvariantResult {
  const allowed = isActionAllowed(action, state, opts)
  if (!allowed) {
    return {
      ok: false,
      code: 'LIFECYCLE_ACTION_BLOCKED',
      message: `Action "${action}" not allowed in state "${state}"`,
    }
  }
  return { ok: true }
}

/** Draft snake/linear: total picks = rounds * teamCount (non-auction). */
export function assertDraftPickCountInvariant(params: {
  teamCount: number
  rounds: number
  expectedPicks: number
}): InvariantResult {
  const { teamCount, rounds, expectedPicks } = params
  if (teamCount < 2 || rounds < 1) {
    return { ok: false, code: 'DRAFT_CONFIG_INVALID', message: 'teamCount >= 2 and rounds >= 1 required' }
  }
  const expected = teamCount * rounds
  if (expected !== expectedPicks) {
    return {
      ok: false,
      code: 'DRAFT_PICK_COUNT_MISMATCH',
      message: `Expected ${expected} picks, got ${expectedPicks}`,
    }
  }
  return { ok: true }
}

/** Standings: wins + losses + ties should be consistent with games played (optional check). */
export function assertStandingsRecordShape(row: {
  wins: number
  losses: number
  ties: number
}): InvariantResult {
  if (row.wins < 0 || row.losses < 0 || row.ties < 0) {
    return { ok: false, code: 'STANDINGS_NEGATIVE', message: 'Wins/losses/ties must be non-negative' }
  }
  return { ok: true }
}

/** Idempotency key for waiver runs / imports — avoid empty or duplicate logical keys in same tick. */
export function assertNonEmptyIdempotencyKey(key: string | null | undefined): InvariantResult {
  if (key == null || String(key).trim() === '') {
    return { ok: false, code: 'EMPTY_IDEMPOTENCY_KEY', message: 'Idempotency key required' }
  }
  return { ok: true }
}

/** Duplicate automation run detection (logical — caller passes last run key). */
export function assertNoDuplicateAutomationRun(params: {
  thisRunKey: string
  lastCompletedRunKey: string | null | undefined
  force: boolean
}): InvariantResult {
  if (params.force) return { ok: true }
  if (params.lastCompletedRunKey && params.lastCompletedRunKey === params.thisRunKey) {
    return {
      ok: false,
      code: 'DUPLICATE_AUTOMATION_RUN',
      message: 'Same automation run key already completed',
    }
  }
  return { ok: true }
}

/** Waiver batch idempotency — block double-processing the same logical run (league + week + run kind). */
export function assertNoDuplicateWaiverRun(params: {
  runKey: string
  completedRunKeys: ReadonlySet<string>
  force: boolean
}): InvariantResult {
  if (params.force) return { ok: true }
  if (params.completedRunKeys.has(params.runKey)) {
    return {
      ok: false,
      code: 'DUPLICATE_WAIVER_RUN',
      message: 'Waiver run key already completed',
    }
  }
  return { ok: true }
}

/** Draft session must reference the league it belongs to (guards orphaned sessions). */
export function assertDraftSessionBelongsToLeague(params: {
  sessionLeagueId: string | null | undefined
  expectedLeagueId: string
}): InvariantResult {
  const sid = params.sessionLeagueId != null ? String(params.sessionLeagueId).trim() : ''
  const lid = String(params.expectedLeagueId).trim()
  if (!sid || sid !== lid) {
    return {
      ok: false,
      code: 'ORPHAN_DRAFT_SESSION',
      message: 'Draft session league id does not match expected league',
    }
  }
  return { ok: true }
}

/** Trade assets: same player (or pick) must not appear twice in one proposed package. */
export function assertNoDuplicateTradeAssets(
  assets: Array<{ itemType: string; itemReference: string }>,
): InvariantResult {
  const keys = assets.map((a) => `${String(a.itemType).trim()}:${String(a.itemReference).trim()}`)
  return assertUniqueLogicalIds(keys)
}

/** Trade / waiver claim lists: logical ids must not repeat in the same batch. */
export function assertUniqueLogicalIds(ids: string[]): InvariantResult {
  const set = new Set(ids.map((s) => String(s).trim()).filter(Boolean))
  if (set.size !== ids.length) {
    return { ok: false, code: 'DUPLICATE_LOGICAL_ID', message: 'Duplicate ids in batch' }
  }
  return { ok: true }
}

/** Notification fan-out: stable dedupe keys should be non-empty when dedupe is required. */
export function assertNotificationDedupeKeyPresent(key: string | null | undefined): InvariantResult {
  if (key == null || String(key).trim() === '') {
    return { ok: false, code: 'MISSING_NOTIFICATION_DEDUPE', message: 'Dedupe key required for flood control' }
  }
  return { ok: true }
}

export function assertStandingsGamesPlayedConsistency(row: {
  wins: number
  losses: number
  ties: number
  gamesPlayed?: number
}): InvariantResult {
  const base = assertStandingsRecordShape(row)
  if (!base.ok) return base
  if (row.gamesPlayed == null) return { ok: true }
  const sum = row.wins + row.losses + row.ties
  if (sum !== row.gamesPlayed) {
    return {
      ok: false,
      code: 'STANDINGS_GAMES_MISMATCH',
      message: `W+L+T (${sum}) does not match gamesPlayed (${row.gamesPlayed})`,
    }
  }
  return { ok: true }
}

/** Draft session completion: at most one canonical completion marker per league (caller supplies count). */
export function assertSingleDraftCompletionMarker(params: { completionMarkerCount: number }): InvariantResult {
  if (params.completionMarkerCount > 1) {
    return {
      ok: false,
      code: 'DUPLICATE_DRAFT_COMPLETION',
      message: 'Multiple draft completion markers for the same league',
    }
  }
  return { ok: true }
}

/** Matchup hub: payload week must match the week the API intended to serve. */
export function assertMatchupPayloadWeekAligned(params: {
  payloadWeek: number
  expectedWeek: number
}): InvariantResult {
  if (params.payloadWeek !== params.expectedWeek) {
    return {
      ok: false,
      code: 'STALE_MATCHUP_PAYLOAD',
      message: `Matchup payload week ${params.payloadWeek} !== expected ${params.expectedWeek}`,
    }
  }
  return { ok: true }
}

/** Trade assets: every player moved off a roster must exist on that roster at validation time. */
export function assertTradePlayersOwnedBySendingRoster(params: {
  rosterPlayerIds: string[]
  sendingPlayerIds: string[]
}): InvariantResult {
  const set = new Set(params.rosterPlayerIds.map((s) => String(s).trim()).filter(Boolean))
  for (const pid of params.sendingPlayerIds) {
    const p = String(pid).trim()
    if (!set.has(p)) {
      return {
        ok: false,
        code: 'TRADE_ASSET_NOT_ON_ROSTER',
        message: `Player ${p} is not on the sending roster`,
      }
    }
  }
  return { ok: true }
}

/** Import merge: external roster keys should not collide when merging two sources. */
export function assertImportExternalIdBatchUnique(externalIds: string[]): InvariantResult {
  const trimmed = externalIds.map((s) => String(s).trim()).filter(Boolean)
  const set = new Set(trimmed)
  if (set.size !== trimmed.length) {
    return {
      ok: false,
      code: 'IMPORT_DUPLICATE_EXTERNAL_ID',
      message: 'Duplicate external ids in import merge batch',
    }
  }
  return { ok: true }
}

const AUTOMATION_TRIGGERS = new Set([
  'onWeekFinalized',
  'onStandingsUpdated',
  'onDraftCompleted',
  'onWaiverProcessed',
  'onPhaseTransition',
  'onManualRun',
  'onScheduledPass',
])

export function assertValidSpecialtyAutomationTrigger(trigger: string): InvariantResult {
  if (!AUTOMATION_TRIGGERS.has(trigger)) {
    return {
      ok: false,
      code: 'INVALID_AUTOMATION_TRIGGER',
      message: `Unknown automation trigger: ${trigger}`,
    }
  }
  return { ok: true }
}

/** Weekly team points should never be negative after normalization (guard against bad pipelines). */
export function assertNonNegativeWeeklyPoints(points: number): InvariantResult {
  if (!Number.isFinite(points) || points < 0) {
    return {
      ok: false,
      code: 'NEGATIVE_WEEKLY_POINTS',
      message: 'Weekly points must be finite and >= 0',
    }
  }
  return { ok: true }
}
