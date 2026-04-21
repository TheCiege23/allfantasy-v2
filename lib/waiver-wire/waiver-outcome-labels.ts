/**
 * User-facing labels for waiver claim outcome codes (history tab, notifications, exports).
 */

const LABELS: Record<string, string> = {
  won: 'Awarded',
  lost_priority: 'Lost — priority',
  lost_tiebreaker: 'Lost — tiebreaker',
  insufficient_faab: 'Not awarded — FAAB',
  invalid_due_to_roster: 'Blocked — roster',
  player_no_longer_available: 'Not awarded — player taken',
  blocked_by_lineup_lock: 'Blocked — lineup lock',
  blocked_by_ir_taxi_devy_violation: 'Blocked — IR / taxi / devy',
  failed: 'Not awarded',
}

export function outcomeCodeFromMetadata(metadata: unknown): string | undefined {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return undefined
  const o = metadata as Record<string, unknown>
  const oc = o.outcomeCode
  return typeof oc === 'string' && oc.trim() ? oc.trim() : undefined
}

export function formatWaiverOutcomeLabel(
  code: string | null | undefined,
  fallbackMessage?: string | null,
): string {
  const c = (code ?? '').trim()
  if (c && LABELS[c]) return LABELS[c]
  if (fallbackMessage && fallbackMessage.trim()) return fallbackMessage.trim()
  if (c) return c.replace(/_/g, ' ')
  return 'Not awarded'
}

