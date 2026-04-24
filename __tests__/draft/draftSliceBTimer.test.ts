import { describe, expect, it } from 'vitest'

import {
  computeOvernightResumeAtUtc,
  computeTimerEndAt,
  computeTimerState,
  computeTimerStateWithPauseWindow,
  isInsidePauseWindow,
} from '@/lib/live-draft-engine/DraftTimerService'
import { computeEffectivePickTimerSeconds } from '@/lib/live-draft-engine/DraftSessionService'

describe('Draft Slice B — timer service', () => {
  it('commissioner pause preserves pauseReason and remaining', () => {
    const st = computeTimerState(
      {
        status: 'paused',
        timerSeconds: 120,
        timerEndAt: null,
        pausedRemainingSeconds: 47,
      },
      new Date(),
    )
    expect(st.status).toBe('paused')
    expect(st.remainingSeconds).toBe(47)
    expect(st.pauseReason).toBe('commissioner')
  })

  it('overnight window freezes display when overnightFrozenPickSeconds is set', () => {
    const now = new Date('2026-04-24T06:30:00.000Z')
    const window = { start: '22:00', end: '08:00', timezone: 'America/New_York' }
    const st = computeTimerStateWithPauseWindow(
      {
        status: 'in_progress',
        timerSeconds: 120,
        timerEndAt: null,
        pausedRemainingSeconds: null,
        overnightFrozenPickSeconds: 88,
      },
      now,
      window,
    )
    expect(st.status).toBe('paused')
    expect(st.pauseReason).toBe('overnight_window')
    expect(st.remainingSeconds).toBe(88)
    expect(st.overnightResumeAt).toBeTruthy()
  })

  it('outside overnight window uses running timer from timerEndAt', () => {
    const end = new Date('2026-04-24T14:00:00.000Z')
    const now = new Date('2026-04-24T13:59:30.000Z')
    const window = { start: '22:00', end: '08:00', timezone: 'America/New_York' }
    const st = computeTimerStateWithPauseWindow(
      {
        status: 'in_progress',
        timerSeconds: 120,
        timerEndAt: end,
        pausedRemainingSeconds: null,
        overnightFrozenPickSeconds: null,
      },
      now,
      window,
    )
    expect(st.status).toBe('running')
    expect(st.remainingSeconds).toBe(30)
  })

  it('computeTimerEndAt never returns negative offset', () => {
    const from = new Date('2026-01-01T12:00:00.000Z')
    const end = computeTimerEndAt(0, from)
    expect(end.getTime()).toBe(from.getTime())
  })

  it('computeOvernightResumeAtUtc returns null when outside window', () => {
    const now = new Date('2026-04-24T14:00:00.000Z')
    const window = { start: '22:00', end: '08:00', timezone: 'America/New_York' }
    expect(computeOvernightResumeAtUtc(now, window)).toBeNull()
  })

  it('isInsidePauseWindow respects overnight wrap in NY', () => {
    const evening = new Date('2026-04-24T03:30:00.000Z')
    const window = { start: '22:00', end: '08:00', timezone: 'America/New_York' }
    expect(isInsidePauseWindow(evening, window)).toBe(true)
  })
})

describe('Draft Slice B — effective pick seconds', () => {
  it('returns null when timer mode is none', () => {
    const sec = computeEffectivePickTimerSeconds(
      { pickTimerPreset: '60s', pickTimerCustomValue: null },
      { timer_seconds: 90, slow_timer_seconds: 3600, rounds: 15, draft_type: 'snake' } as any,
      {
        timerMode: 'none',
      } as any,
    )
    expect(sec).toBeNull()
  })

  it('uses league pick timer preset when league settings exist', () => {
    const sec = computeEffectivePickTimerSeconds(
      { pickTimerPreset: '300s', pickTimerCustomValue: null },
      { timer_seconds: 90, slow_timer_seconds: 3600, rounds: 15, draft_type: 'snake' } as any,
      {
        timerMode: 'per_pick',
      } as any,
    )
    expect(sec).toBe(300)
  })
})
