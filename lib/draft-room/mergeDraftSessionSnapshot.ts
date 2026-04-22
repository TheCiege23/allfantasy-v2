import { resolveCurrentOnTheClock } from '@/lib/live-draft-engine/CurrentOnTheClockResolver'
import type { DraftSessionSnapshot } from '@/lib/live-draft-engine/types'

function draftNeedsClock(s: DraftSessionSnapshot): boolean {
  const total = Math.max(0, s.rounds * s.teamCount)
  return (
    (s.status === 'in_progress' || s.status === 'paused') &&
    (s.picks?.length ?? 0) < total
  )
}

function slotOrderLooksComplete(slotOrder: DraftSessionSnapshot['slotOrder'] | undefined, teamCount: number): boolean {
  return Array.isArray(slotOrder) && slotOrder.length >= Math.max(1, teamCount)
}

function inferCurrentPickFromSnapshot(s: DraftSessionSnapshot) {
  const tc = Math.max(1, s.teamCount)
  const total = Math.max(0, s.rounds * tc)
  return resolveCurrentOnTheClock({
    totalPicks: total,
    picksCount: s.picks?.length ?? 0,
    teamCount: tc,
    draftType: s.draftType,
    thirdRoundReversal: s.thirdRoundReversal,
    slotOrder: s.slotOrder ?? [],
  })
}

/**
 * When a snapshot drops authoritative clock/order/timer anchors, repair from `prev` or infer from the board
 * so live-sync merges cannot blank the room (null currentPick + empty slotOrder + timer none).
 */
export function repairDraftSessionAuthority(
  prev: DraftSessionSnapshot | null,
  next: DraftSessionSnapshot,
): DraftSessionSnapshot {
  if (!draftNeedsClock(next)) return next

  let work = next

  const tc = Math.max(1, work.teamCount)
  if (
    prev &&
    !slotOrderLooksComplete(work.slotOrder, tc) &&
    slotOrderLooksComplete(prev.slotOrder, Math.max(1, prev.teamCount))
  ) {
    work = { ...work, slotOrder: prev.slotOrder }
  }

  if (!work.currentPick) {
    const inferred = inferCurrentPickFromSnapshot(work)
    if (inferred) {
      work = { ...work, currentPick: inferred }
    } else if (
      prev?.currentPick &&
      (work.picks?.length ?? 0) === (prev.picks?.length ?? 0)
    ) {
      work = { ...work, currentPick: prev.currentPick }
    }
  }

  if (
    prev &&
    (work.status === 'in_progress' || work.status === 'paused') &&
    work.timer?.status === 'none' &&
    prev.timer?.status === 'running' &&
    draftNeedsClock(work)
  ) {
    work = { ...work, timer: prev.timer }
  }
  if (
    !work.timerEndAt &&
    prev?.timerEndAt &&
    (work.status === 'in_progress' || work.status === 'paused') &&
    draftNeedsClock(work)
  ) {
    work = { ...work, timerEndAt: prev.timerEndAt }
  }

  return work
}

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
    s.slotOrder?.length ?? 0,
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
  const nextRepaired = repairDraftSessionAuthority(prev, next)
  if (prev && draftSessionLiveSurfaceKey(prev) === draftSessionLiveSurfaceKey(nextRepaired)) {
    /** Authority surface unchanged — still apply viewer-scoped updates from `next` if present. */
    let out: DraftSessionSnapshot = prev
    for (const key of VIEWER_SESSION_KEYS) {
      const nv = snapshotRecord(nextRepaired)[key]
      const pv = snapshotRecord(prev)[key]
      if (nv !== undefined && nv !== pv) {
        if (out === prev) out = { ...prev }
        ;(snapshotRecord(out) as Record<string, unknown>)[key] = nv
      }
    }
    return out
  }
  const base = nextRepaired
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
