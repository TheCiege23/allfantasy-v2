'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

export type DraftCountdownPauseReason = 'commissioner' | 'overnight_window' | null | undefined

export type UseDraftCountdownOpts = {
  pauseReason?: DraftCountdownPauseReason
  overnightResumeAtIso?: string | null
}

/**
 * Client-side display tick for draft timers. **Never** decrement a stored second count.
 * Remaining is always recomputed as `max(0, ceil((timerEndAt - now) / 1000))` when `timerEndAtIso`
 * is set; `tick` only forces a re-render on an interval so `Date.now()` updates.
 *
 * When the server snapshot has no `timerEndAt` but exposes `remainingSeconds`, anchor a soft local
 * end time so the UI still ticks between polls (re-syncs whenever `serverRemainingSeconds` changes).
 *
 * Single interval per hook instance: cleans up on unmount and when timer inputs change.
 */
export function useDraftCountdownSeconds(
  timerStatus: 'running' | 'paused' | 'expired' | 'none',
  timerEndAtIso: string | null | undefined,
  serverRemainingSeconds: number | null | undefined,
  opts?: UseDraftCountdownOpts,
): number | null {
  const [tick, setTick] = useState(0)
  const softDeadlineMs = useRef<number | null>(null)
  const pauseReason = opts?.pauseReason
  const overnightResumeAtIso = opts?.overnightResumeAtIso

  useEffect(() => {
    softDeadlineMs.current = null
  }, [timerStatus, timerEndAtIso, serverRemainingSeconds, pauseReason, overnightResumeAtIso])

  useEffect(() => {
    const runningWithEnd = timerStatus === 'running' && Boolean(timerEndAtIso)
    const runningSoft =
      timerStatus === 'running' &&
      !timerEndAtIso &&
      serverRemainingSeconds != null &&
      Number.isFinite(serverRemainingSeconds) &&
      serverRemainingSeconds > 0
    const overnightTick =
      timerStatus === 'paused' && pauseReason === 'overnight_window' && Boolean(overnightResumeAtIso)

    if (!runningWithEnd && !runningSoft && !overnightTick) {
      return
    }

    if (runningSoft) {
      const sec = serverRemainingSeconds!
      softDeadlineMs.current = Date.now() + Math.ceil(sec) * 1000
    }

    const id = window.setInterval(() => setTick((t) => t + 1), 1000)
    return () => window.clearInterval(id)
  }, [timerStatus, timerEndAtIso, serverRemainingSeconds, pauseReason, overnightResumeAtIso])

  return useMemo(() => {
    void tick

    if (timerStatus === 'paused') return serverRemainingSeconds ?? null
    if (timerStatus === 'expired') return 0
    if (timerStatus === 'none') return serverRemainingSeconds ?? null
    if (timerStatus === 'running' && timerEndAtIso) {
      const end = new Date(timerEndAtIso).getTime()
      if (!Number.isFinite(end)) return serverRemainingSeconds ?? null
      return Math.max(0, Math.ceil((end - Date.now()) / 1000))
    }
    if (
      timerStatus === 'running' &&
      !timerEndAtIso &&
      softDeadlineMs.current != null &&
      Number.isFinite(softDeadlineMs.current)
    ) {
      return Math.max(0, Math.ceil((softDeadlineMs.current - Date.now()) / 1000))
    }
    return serverRemainingSeconds ?? null
  }, [timerStatus, timerEndAtIso, serverRemainingSeconds, tick])
}
