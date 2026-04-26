import { describe, expect, it } from 'vitest'

import type { DraftSessionSnapshot } from '@/lib/live-draft-engine/types'

/**
 * Slice C.1 — pure optimistic-patch behavior. Mirrors the patch logic embedded in
 * handleCommissionerAction in DraftRoomPageClient.tsx. Kept as a unit so we can guarantee:
 *   - Pause freezes the visible countdown
 *   - Resume schedules a fresh timerEndAt anchored at the previously paused remaining
 *   - Reset_timer (in_progress) anchors a fresh timerEndAt = now + timerSeconds
 *   - Reset_timer (paused) refills pausedRemainingSeconds without resuming
 */
function applyOptimisticControl(
  prev: DraftSessionSnapshot,
  action: 'pause' | 'resume' | 'reset_timer',
  now: Date,
): DraftSessionSnapshot {
  const liveRemaining =
    prev.timer?.status === 'running' && typeof prev.timer.timerEndAt === 'string'
      ? Math.max(0, Math.ceil((new Date(prev.timer.timerEndAt).getTime() - now.getTime()) / 1000))
      : prev.timer?.remainingSeconds ?? prev.pausedRemainingSeconds ?? prev.timerSeconds ?? null
  if (action === 'pause') {
    return {
      ...prev,
      status: 'paused',
      pausedRemainingSeconds: liveRemaining,
      timerEndAt: null,
      timer: prev.timer
        ? { ...prev.timer, status: 'paused', remainingSeconds: liveRemaining, pauseReason: 'commissioner' }
        : prev.timer,
    } as DraftSessionSnapshot
  }
  if (action === 'resume') {
    const sec = prev.pausedRemainingSeconds ?? liveRemaining ?? prev.timerSeconds ?? null
    const endAt = sec != null && sec > 0 ? new Date(now.getTime() + sec * 1000).toISOString() : null
    return {
      ...prev,
      status: 'in_progress',
      pausedRemainingSeconds: null,
      timerEndAt: endAt,
      timer: prev.timer
        ? { ...prev.timer, status: 'running', remainingSeconds: sec, timerEndAt: endAt, pauseReason: null }
        : prev.timer,
    } as DraftSessionSnapshot
  }
  if (action === 'reset_timer') {
    const sec = prev.timerSeconds ?? liveRemaining ?? null
    if (prev.status === 'in_progress' && sec != null && sec > 0) {
      const endAt = new Date(now.getTime() + sec * 1000).toISOString()
      return {
        ...prev,
        timerEndAt: endAt,
        pausedRemainingSeconds: null,
        timer: prev.timer
          ? { ...prev.timer, status: 'running', remainingSeconds: sec, timerEndAt: endAt, pauseReason: null }
          : prev.timer,
      } as DraftSessionSnapshot
    }
    if (prev.status === 'paused' && sec != null) {
      return {
        ...prev,
        pausedRemainingSeconds: sec,
        timer: prev.timer ? { ...prev.timer, status: 'paused', remainingSeconds: sec } : prev.timer,
      } as DraftSessionSnapshot
    }
  }
  return prev
}

function makeRunningSession(remainingSeconds = 8, timerSeconds = 15): DraftSessionSnapshot {
  const now = Date.now()
  const endAt = new Date(now + remainingSeconds * 1000).toISOString()
  return {
    id: 'sess-1',
    leagueId: 'league-1',
    status: 'in_progress',
    draftType: 'snake',
    rounds: 15,
    teamCount: 12,
    thirdRoundReversal: false,
    timerSeconds,
    timerEndAt: endAt,
    pausedRemainingSeconds: null,
    slotOrder: [],
    tradedPicks: [],
    version: 1,
    picks: [],
    currentPick: null,
    timer: { status: 'running', remainingSeconds, timerEndAt: endAt, pauseReason: null },
    updatedAt: new Date().toISOString(),
  } as any
}

describe('Slice C.1 — optimistic commissioner control patches', () => {
  it('Pause freezes the visible countdown immediately and snaps status to paused', () => {
    const prev = makeRunningSession(10, 15)
    const now = new Date()
    const next = applyOptimisticControl(prev, 'pause', now)
    expect(next.status).toBe('paused')
    expect(next.timerEndAt).toBeNull()
    expect(next.timer.status).toBe('paused')
    expect(next.timer.pauseReason).toBe('commissioner')
    // The captured remaining should be ~10 seconds (allow off-by-one for ceil math).
    expect(next.pausedRemainingSeconds).toBeGreaterThanOrEqual(9)
    expect(next.pausedRemainingSeconds).toBeLessThanOrEqual(10)
  })

  it('Resume restores running status with a fresh timerEndAt anchored to pausedRemainingSeconds', () => {
    const prev = makeRunningSession(0, 15)
    const paused = applyOptimisticControl(prev, 'pause', new Date())
    // simulate a pause was committed with 7 seconds remaining
    const pausedFixed = { ...paused, pausedRemainingSeconds: 7 }
    const now = new Date()
    const resumed = applyOptimisticControl(pausedFixed, 'resume', now)
    expect(resumed.status).toBe('in_progress')
    expect(resumed.pausedRemainingSeconds).toBeNull()
    expect(resumed.timer.status).toBe('running')
    expect(resumed.timerEndAt).toBeTruthy()
    const ms = new Date(resumed.timerEndAt!).getTime() - now.getTime()
    expect(ms).toBeGreaterThanOrEqual(6500)
    expect(ms).toBeLessThanOrEqual(7500)
  })

  it('Reset timer (in_progress) anchors a fresh end at now + timerSeconds', () => {
    const prev = makeRunningSession(2, 15)
    const now = new Date()
    const next = applyOptimisticControl(prev, 'reset_timer', now)
    expect(next.status).toBe('in_progress')
    const ms = new Date(next.timerEndAt!).getTime() - now.getTime()
    expect(ms).toBeGreaterThanOrEqual(14500)
    expect(ms).toBeLessThanOrEqual(15500)
    expect(next.timer.remainingSeconds).toBe(15)
  })

  it('Reset timer (paused) refills pausedRemainingSeconds without resuming', () => {
    const prev = { ...makeRunningSession(0, 15), status: 'paused' as const, pausedRemainingSeconds: 3, timerEndAt: null }
    prev.timer = { status: 'paused', remainingSeconds: 3, timerEndAt: null, pauseReason: 'commissioner' } as any
    const next = applyOptimisticControl(prev, 'reset_timer', new Date())
    expect(next.status).toBe('paused')
    expect(next.pausedRemainingSeconds).toBe(15)
    expect(next.timer.status).toBe('paused')
    expect(next.timerEndAt).toBeNull()
  })
})
