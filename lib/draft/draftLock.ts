/**
 * Draft distributed lock — per-league mutex for critical mutation paths.
 *
 * Wraps lib/automation/locks (Upstash Redis SET-NX → Postgres AutomationLock
 * fallback) with draft-specific TTLs, telemetry, and a fail-open policy for
 * infrastructure outages.
 *
 * Three lock domains (separate keys so pick writes don't block auction ops):
 *   pick    — 5 s TTL — serialises submitPick across all Vercel instances
 *   auction — 3 s TTL — serialises nominatePlayer / placeBid / resolveAuctionWin
 *   control — 8 s TTL — serialises pauseDraftSession / resumeDraftSession / resetTimer
 *
 * Fail-open semantics
 * ───────────────────
 * If both Redis and Postgres lock layers return an infrastructure error
 * (not "lock held"), the function runs WITHOUT a lock and returns
 * { acquired: true, backend: 'passthrough' }.  The underlying DB
 * constraints (unique index on sessionId+overall, optimistic pick-count
 * sentinel, P2002 catch in PickSubmissionService) remain the final safety net.
 *
 * Lock-held semantics
 * ───────────────────
 * If the lock is currently held by another instance the function does NOT
 * run fn and returns { acquired: false, reason: 'busy' }.  The caller is
 * responsible for returning DRAFT_PICK_RACE_RETRY (409) to the client.
 *
 * Usage:
 *   const result = await withPickLock(leagueId, () => _submitPickCore(input))
 *   if (!result.acquired) return { success: false, code: DRAFT_PICK_RACE_RETRY }
 *   return result.value
 */

import { randomUUID } from 'crypto'
import { acquireAutomationLock, releaseAutomationLock } from '@/lib/automation/locks'
import { logStructured } from '@/lib/logging/structured'
import { recordEngineTelemetrySample } from '@/lib/analytics/recordAnalyticsEvent'
import { ENGINE } from '@/lib/analytics/eventNames'

// ── Types ─────────────────────────────────────────────────────────────────────

type LockDomain = 'pick' | 'auction' | 'control'

/** Lock TTLs in milliseconds. Sized to cover the full operation including DB round-trips. */
const TTL_MS: Record<LockDomain, number> = {
  pick: 5_000,    // pick validation + Prisma transaction + lifecycle trigger
  auction: 3_000, // JSON read-modify-write (no heavy DB work)
  control: 8_000, // pause/resume reads multiple tables; resetTimer is lighter
}

export type DraftLockOutcome<T> =
  /** Lock acquired and fn completed. `backend` is where the lock was held. */
  | { acquired: true; value: T; backend: 'redis' | 'postgres' | 'passthrough' }
  /** Lock busy — competing instance is writing. fn was NOT called. */
  | { acquired: false; reason: 'busy' }

// ── Internal helpers ──────────────────────────────────────────────────────────

function draftLockKey(leagueId: string, domain: LockDomain): string {
  // Deliberately separate from the automation lock namespace (af:auto:*)
  // so draft lock keys are easy to scan/expire in Redis ops dashboards.
  return `draft:${leagueId}:${domain}`
}

function reasonIsBusy(reason: string): boolean {
  // acquireAutomationLock returns "Lock held (redis)" or "Lock held (postgres)"
  // for contention; anything else is an infrastructure error.
  return reason.startsWith('Lock held')
}

// ── Core implementation ───────────────────────────────────────────────────────

async function withDraftLock<T>(
  leagueId: string,
  domain: LockDomain,
  fn: () => Promise<T>
): Promise<DraftLockOutcome<T>> {
  const owner = randomUUID()
  const key = draftLockKey(leagueId, domain)
  const ttlMs = TTL_MS[domain]

  const acquired = await acquireAutomationLock(key, { owner, ttlMs })

  if (!acquired.ok) {
    if (reasonIsBusy(acquired.reason)) {
      // ── Another instance is actively writing — back off ──────────────────
      recordEngineTelemetrySample(ENGINE.DRAFT_LOCK_CONTENDED, {
        meta: { leagueId, domain, lockKey: key },
      })
      logStructured('warn', 'draft_lock', 'lock_contended', {
        leagueId,
        domain,
        reason: acquired.reason,
      })
      return { acquired: false, reason: 'busy' }
    }

    // ── Infrastructure error — fail open ─────────────────────────────────
    // Redis is down AND Postgres lock table is unavailable (migration not yet
    // applied, network partition, etc.).  Proceed without a lock so that
    // draft picks aren't blocked by a monitoring outage.  The DB unique
    // constraint on (sessionId, overall) and the optimistic sentinel in
    // PickSubmissionService.submitPick are the final correctness layer.
    recordEngineTelemetrySample(ENGINE.DRAFT_LOCK_TIMEOUT, {
      meta: { leagueId, domain, reason: acquired.reason },
    })
    logStructured('warn', 'draft_lock', 'lock_infra_error_passthrough', {
      leagueId,
      domain,
      reason: acquired.reason,
    })
    const value = await fn()
    return { acquired: true, value, backend: 'passthrough' }
  }

  // ── Lock held — run fn, always release ───────────────────────────────────
  try {
    const value = await fn()
    return { acquired: true, value, backend: acquired.backend }
  } finally {
    // Release is best-effort; TTL guarantees expiry even if release fails.
    await releaseAutomationLock(key, owner).catch((err) => {
      logStructured('warn', 'draft_lock', 'lock_release_error', {
        leagueId,
        domain,
        error: err instanceof Error ? err.message : String(err),
      })
    })
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Serialize pick submissions for a league.
 * TTL: 5 s — covers full pick validation + Prisma transaction.
 */
export function withPickLock<T>(
  leagueId: string,
  fn: () => Promise<T>
): Promise<DraftLockOutcome<T>> {
  return withDraftLock(leagueId, 'pick', fn)
}

/**
 * Serialize auction mutations (nominate / bid / resolve) for a league.
 * TTL: 3 s — auction JSON read-modify-write is fast.
 */
export function withAuctionLock<T>(
  leagueId: string,
  fn: () => Promise<T>
): Promise<DraftLockOutcome<T>> {
  return withDraftLock(leagueId, 'auction', fn)
}

/**
 * Serialize commissioner control operations (pause / resume / resetTimer).
 * TTL: 8 s — some ops read multiple tables before writing.
 */
export function withControlLock<T>(
  leagueId: string,
  fn: () => Promise<T>
): Promise<DraftLockOutcome<T>> {
  return withDraftLock(leagueId, 'control', fn)
}
