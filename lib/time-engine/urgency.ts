import type { LockWindowStatus } from '@/lib/time-engine/types'
import { getServerNowUTC } from '@/lib/time-engine/serverClock'

const DEFAULT_URGENT_MS = 60 * 60 * 1000

/**
 * Classify lock urgency for a future instant. Past target → locked; near future → closing_soon.
 */
export function getLockUrgency(
  lockAtUtc: Date | null | undefined,
  options?: { urgentWithinMs?: number; serverNow?: Date }
): { status: LockWindowStatus; msUntil: number | null; label: string } {
  const serverNow = options?.serverNow ?? getServerNowUTC()
  const urgentWithin = options?.urgentWithinMs ?? DEFAULT_URGENT_MS
  if (!lockAtUtc || Number.isNaN(lockAtUtc.getTime())) {
    return { status: 'not_applicable', msUntil: null, label: 'No specific lock time in this context' }
  }
  const ms = lockAtUtc.getTime() - serverNow.getTime()
  if (ms <= 0) {
    return { status: 'locked', msUntil: ms, label: 'Lock passed' }
  }
  if (ms <= urgentWithin) {
    const m = Math.ceil(ms / 60_000)
    return { status: 'closing_soon', msUntil: ms, label: m <= 1 ? 'Locks in under a minute' : `Locks in ${m} min` }
  }
  return { status: 'open', msUntil: ms, label: 'Lock window open' }
}
