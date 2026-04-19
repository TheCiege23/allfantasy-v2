import type { AiTimeContextPayload } from '@/lib/time-engine/types'

/**
 * Human-readable lock / timing line for Start/Sit UI — uses server-backed time payload only.
 */
export function formatStartSitLockStatusLabel(tc: AiTimeContextPayload | null | undefined): string | null {
  if (!tc) return null
  const parts: string[] = []
  if (tc.timeUntilNextLockMs != null && tc.timeUntilNextLockMs >= 0 && tc.nextLockTimeUTC) {
    const m = Math.floor(tc.timeUntilNextLockMs / 60000)
    if (m <= 0) parts.push('Lineup lock: imminently — check your platform.')
    else if (m < 60 * 72) parts.push(`Next lock in ~${m}m (${tc.userLocalTime} local).`)
  }
  if (tc.lockWindowStatus === 'locked') parts.push('Lock window: closed for this period.')
  if (tc.freshnessSummary) parts.push(tc.freshnessSummary)
  return parts.length ? parts.join(' ') : null
}

export function formatDataFreshnessAgo(iso: string | undefined): string {
  if (!iso) return '—'
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return '—'
  const sec = Math.max(0, Math.round((Date.now() - t) / 1000))
  if (sec < 50) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const h = Math.floor(min / 60)
  if (h < 48) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}
