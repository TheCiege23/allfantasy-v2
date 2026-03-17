/**
 * Draft timer: compute remaining time from session state.
 * Server-authoritative: timerEndAt (UTC) when running; pausedRemainingSeconds when paused.
 * Supports slow draft: overnight pause window (timer does not count down during window).
 */

import type { TimerState } from './types'

export interface TimerInput {
  status: string
  timerSeconds: number | null
  timerEndAt: Date | null
  pausedRemainingSeconds: number | null
}

export interface PauseWindowConfig {
  start: string
  end: string
  timezone: string
}

/**
 * Get current time in timezone as HH:mm (24h).
 */
function getLocalTimeString(date: Date, timezone: string): string {
  try {
    const s = date.toLocaleTimeString('en-CA', { timeZone: timezone, hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    return s.slice(0, 5)
  } catch {
    return '12:00'
  }
}

/**
 * Parse "HH:mm" to minutes since midnight.
 */
function parseToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

/**
 * True if current local time (in timezone) falls inside the pause window.
 * Overnight window: start > end (e.g. 22:00 to 08:00) => in if time >= start OR time < end.
 */
export function isInsidePauseWindow(now: Date, window: PauseWindowConfig): boolean {
  const local = getLocalTimeString(now, window.timezone)
  const min = parseToMinutes(local)
  const startMin = parseToMinutes(window.start)
  const endMin = parseToMinutes(window.end)
  if (startMin > endMin) {
    return min >= startMin || min < endMin
  }
  return min >= startMin && min < endMin
}

/**
 * When inside the pause window we show paused with no countdown (remainingSeconds null) so the timer does not appear to advance.
 */
function remainingSecondsWhenPauseStarted(
  _timerEndAt: Date,
  _timerSeconds: number,
  _now: Date,
  _window: PauseWindowConfig
): number | null {
  return null
}

/**
 * Compute current timer state from session.
 */
export function computeTimerState(input: TimerInput, now: Date = new Date()): TimerState {
  if (input.status !== 'in_progress' && input.status !== 'paused') {
    return { status: 'none', remainingSeconds: null, timerEndAt: null }
  }
  if (input.status === 'paused' && input.pausedRemainingSeconds != null) {
    return {
      status: 'paused',
      remainingSeconds: input.pausedRemainingSeconds,
      timerEndAt: null,
    }
  }
  if (!input.timerEndAt || input.timerSeconds == null) {
    return { status: 'none', remainingSeconds: null, timerEndAt: null }
  }
  const endMs = input.timerEndAt.getTime()
  const nowMs = now.getTime()
  const remainingSeconds = Math.max(0, Math.ceil((endMs - nowMs) / 1000))
  return {
    status: remainingSeconds === 0 ? 'expired' : 'running',
    remainingSeconds,
    timerEndAt: input.timerEndAt.toISOString(),
  }
}

/**
 * Compute timer state with optional slow-draft pause window. When inside the window, returns status 'paused' and remaining = time left when window started.
 */
export function computeTimerStateWithPauseWindow(
  input: TimerInput,
  now: Date,
  pauseWindow: PauseWindowConfig | null | undefined
): TimerState {
  const base = computeTimerState(input, now)
  if (base.status === 'none' || !pauseWindow?.start || !pauseWindow?.end || !input.timerEndAt || input.timerSeconds == null) {
    return base
  }
  if (!isInsidePauseWindow(now, pauseWindow)) {
    return base
  }
  const remaining = remainingSecondsWhenPauseStarted(
    input.timerEndAt,
    input.timerSeconds,
    now,
    pauseWindow
  )
  return {
    status: 'paused',
    remainingSeconds: remaining ?? null,
    timerEndAt: null,
  }
}

/**
 * Compute next timer end time from now (for starting or resuming).
 */
export function computeTimerEndAt(timerSeconds: number, from: Date = new Date()): Date {
  return new Date(from.getTime() + timerSeconds * 1000)
}

/**
 * Format remaining seconds for display (e.g. "2h 15m" or "14:32" for under 1h).
 */
export function formatTimerRemaining(remainingSeconds: number | null): string {
  if (remainingSeconds == null || remainingSeconds < 0) return '—'
  if (remainingSeconds >= 3600) {
    const h = Math.floor(remainingSeconds / 3600)
    const m = Math.floor((remainingSeconds % 3600) / 60)
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }
  const m = Math.floor(remainingSeconds / 60)
  const s = remainingSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
