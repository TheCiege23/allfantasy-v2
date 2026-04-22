import type { DraftSessionSnapshot } from '@/lib/live-draft-engine/types'

/**
 * Compact fingerprint for live-room surfaces — avoids React churn when poll returns identical authority.
 */
export function draftSessionLiveSurfaceKey(s: DraftSessionSnapshot | null | undefined): string {
  if (!s) return ''
  const cp = s.currentPick
  const t = s.timer
  return [
    s.version,
    s.updatedAt ?? '',
    s.status,
    s.picks?.length ?? 0,
    cp?.overall ?? '',
    cp?.round ?? '',
    cp?.slot ?? '',
    cp?.rosterId ?? '',
    t?.status ?? '',
    s.timerEndAt ?? '',
    s.pausedRemainingSeconds ?? '',
  ].join('|')
}

/**
 * Skip applying an older snapshot over a newer one (poll races, reordering GET responses).
 */
export function isStaleDraftSessionSnapshot(
  prev: DraftSessionSnapshot | null | undefined,
  next: DraftSessionSnapshot | null | undefined,
): boolean {
  if (!next) return false
  if (!prev) return false
  /** Server always bumps `version` on authoritative transitions — strictly newer wins. */
  if (typeof next.version === 'number' && typeof prev.version === 'number') {
    if (next.version > prev.version) return false
    if (next.version < prev.version) return true
  }
  const nextAt = next.updatedAt ? new Date(next.updatedAt).getTime() : 0
  const prevAt = prev.updatedAt ? new Date(prev.updatedAt).getTime() : 0
  if (nextAt > 0 && prevAt > 0 && nextAt < prevAt) return true
  return false
}

const VIEWER_SESSION_KEYS = ['currentUserRosterId', 'orphanRosterIds'] as const

function snapshotRecord(s: DraftSessionSnapshot): Record<string, unknown> {
  return s as unknown as Record<string, unknown>
}

export function mergeDraftSessionSnapshot(
  prev: DraftSessionSnapshot | null,
  next: DraftSessionSnapshot | null | undefined,
): DraftSessionSnapshot | null {
  if (!next) return prev ?? null
  if (isStaleDraftSessionSnapshot(prev ?? null, next)) return prev ?? null
  if (prev && draftSessionLiveSurfaceKey(prev) === draftSessionLiveSurfaceKey(next)) {
    /** Authority surface unchanged — still apply viewer-scoped updates from `next` if present. */
    let out: DraftSessionSnapshot = prev
    for (const key of VIEWER_SESSION_KEYS) {
      const nv = snapshotRecord(next)[key]
      const pv = snapshotRecord(prev)[key]
      if (nv !== undefined && nv !== pv) {
        if (out === prev) out = { ...prev }
        ;(snapshotRecord(out) as Record<string, unknown>)[key] = nv
      }
    }
    return out
  }
  const base = next
  /** Pick/controls responses often omit viewer-scoped fields; keep them so on-clock / roster mapping does not flicker away. */
  let merged: DraftSessionSnapshot = base
  if (prev) {
    for (const key of VIEWER_SESSION_KEYS) {
      const pv = snapshotRecord(prev)[key]
      const nv = snapshotRecord(base)[key]
      if (nv === undefined && pv !== undefined) {
        if (merged === base) merged = { ...base }
        snapshotRecord(merged)[key] = pv
      }
    }
  }
  return merged
}
