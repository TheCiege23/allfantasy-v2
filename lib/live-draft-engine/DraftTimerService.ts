/**
 * Draft timer: compute remaining time from session state.
 * Server-authoritative: timerEndAt (UTC) when running; pausedRemainingSeconds when commissioner-paused;
 * overnightFrozenPickSeconds when inside overnight window (timerEndAt cleared until window ends).
 */

import { addDays } from 'date-fns'
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz'
import type { TimerState } from './types'

export interface TimerInput {
  status: string
  timerSeconds: number | null
  timerEndAt: Date | null
  pausedRemainingSeconds: number | null
  /** Persisted frozen per-pick seconds while inside overnight pause window. */
  overnightFrozenPickSeconds?: number | null
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
    const s = date.toLocaleTimeString('en-CA', {
      timeZone: timezone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
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

function pad2(n: number) {
  return String(n).padStart(2, '0')
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
 * Next instant the overnight/slow pause window ends (UTC), or null if not inside the window / invalid config.
 */
export function computeOvernightResumeAtUtc(now: Date, window: PauseWindowConfig): Date | null {
  const tz = window.timezone?.trim()
  const startRaw = window.start?.trim()
  const endRaw = window.end?.trim()
  if (!tz || !startRaw || !endRaw) return null
  if (!isInsidePauseWindow(now, window)) return null

  const endMatch = endRaw.match(/^(\d{1,2}):(\d{2})/)
  if (!endMatch) return null
  const endH = Math.min(23, Math.max(0, parseInt(endMatch[1], 10)))
  const endM = Math.min(59, Math.max(0, parseInt(endMatch[2], 10)))
  const endFragment = `${pad2(endH)}:${pad2(endM)}:00.000`

  const startMin = parseToMinutes(startRaw)
  const endMin = parseToMinutes(endRaw)
  const zonedNow = toZonedTime(now, tz)
  const ymdToday = formatInTimeZone(now, tz, 'yyyy-MM-dd')
  const curMin = parseToMinutes(getLocalTimeString(now, tz))

  try {
    if (startMin > endMin) {
      if (curMin < endMin) {
        return fromZonedTime(`${ymdToday}T${endFragment}`, tz)
      }
      const ymdNext = formatInTimeZone(addDays(zonedNow, 1), tz, 'yyyy-MM-dd')
      return fromZonedTime(`${ymdNext}T${endFragment}`, tz)
    }

    let candidate = fromZonedTime(`${ymdToday}T${endFragment}`, tz)
    if (candidate.getTime() <= now.getTime()) {
      const ymd2 = formatInTimeZone(addDays(zonedNow, 1), tz, 'yyyy-MM-dd')
      candidate = fromZonedTime(`${ymd2}T${endFragment}`, tz)
    }
    return candidate
  } catch {
    return null
  }
}

/**
 * Compute current timer state from session (no overnight overlay).
 */
export function computeTimerState(input: TimerInput, now: Date = new Date()): TimerState {
  if (input.status !== 'in_progress' && input.status !== 'paused') {
    return { status: 'none', remainingSeconds: null, timerEndAt: null, pauseReason: null, overnightResumeAt: null }
  }
  if (input.status === 'paused' && input.pausedRemainingSeconds != null) {
    return {
      status: 'paused',
      remainingSeconds: input.pausedRemainingSeconds,
      timerEndAt: null,
      pauseReason: 'commissioner',
      overnightResumeAt: null,
    }
  }
  /** Running clock is anchored by `timerEndAt`; untimed drafts omit `timerEndAt`. */
  if (!input.timerEndAt) {
    return { status: 'none', remainingSeconds: null, timerEndAt: null, pauseReason: null, overnightResumeAt: null }
  }
  const endMs = input.timerEndAt.getTime()
  const nowMs = now.getTime()
  const remainingSeconds = Math.max(0, Math.ceil((endMs - nowMs) / 1000))
  return {
    status: remainingSeconds === 0 ? 'expired' : 'running',
    remainingSeconds,
    timerEndAt: input.timerEndAt.toISOString(),
    pauseReason: null,
    overnightResumeAt: null,
  }
}

/**
 * Compute timer state with optional slow-draft overnight window.
 * When frozen seconds are set, the pick clock stays fixed until the window ends (DB reconciler).
 */
export function computeTimerStateWithPauseWindow(
  input: TimerInput,
  now: Date,
  pauseWindow: PauseWindowConfig | null | undefined,
): TimerState {
  if (input.status === 'paused') {
    const base = computeTimerState(input, now)
    return {
      ...base,
      pauseReason: 'commissioner',
      overnightResumeAt: null,
    }
  }

  if (
    input.status === 'in_progress' &&
    pauseWindow?.start &&
    pauseWindow?.end &&
    pauseWindow.timezone &&
    isInsidePauseWindow(now, pauseWindow)
  ) {
    const resume = computeOvernightResumeAtUtc(now, pauseWindow)
    const resumeIso = resume ? resume.toISOString() : null

    if (input.overnightFrozenPickSeconds != null) {
      return {
        status: 'paused',
        remainingSeconds: Math.max(0, input.overnightFrozenPickSeconds),
        timerEndAt: null,
        pauseReason: 'overnight_window',
        overnightResumeAt: resumeIso,
      }
    }

    if (input.timerEndAt) {
      const endMs = input.timerEndAt.getTime()
      const remainingSeconds = Math.max(0, Math.ceil((endMs - now.getTime()) / 1000))
      return {
        status: 'paused',
        remainingSeconds,
        timerEndAt: null,
        pauseReason: 'overnight_window',
        overnightResumeAt: resumeIso,
      }
    }

    return {
      status: 'paused',
      remainingSeconds: null,
      timerEndAt: null,
      pauseReason: 'overnight_window',
      overnightResumeAt: resumeIso,
    }
  }

  const base = computeTimerState(input, now)
  return {
    ...base,
    pauseReason: base.pauseReason ?? null,
    overnightResumeAt: base.overnightResumeAt ?? null,
  }
}

/**
 * Compute next timer end time from now (for starting or resuming).
 */
export function computeTimerEndAt(timerSeconds: number, from: Date = new Date()): Date {
  return new Date(from.getTime() + Math.max(0, timerSeconds) * 1000)
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
