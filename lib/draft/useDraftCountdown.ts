'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

/**
 * Client-side display tick for draft timers. **Never** decrement a stored second count.
 * Remaining is always recomputed as `max(0, ceil((timerEndAt - now) / 1000))` when `timerEndAtIso`
 * is set; `tick` only forces a re-render on an interval so `Date.now()` updates.
 *
 * When the server snapshot has no `timerEndAt` but exposes `remainingSeconds`, anchor a soft local
 * end time so the UI still ticks between polls (re-syncs whenever `serverRemainingSeconds` changes).
 */
export function useDraftCountdownSeconds(
  timerStatus: 'running' | 'paused' | 'expired' | 'none',
  timerEndAtIso: string | null | undefined,
  serverRemainingSeconds: number | null | undefined,
): number | null {
  const [tick, setTick] = useState(0)
  const softDeadlineMs = useRef<number | null>(null)

  useEffect(() => {
    if (timerStatus !== 'running' || !timerEndAtIso) return
    const id = window.setInterval(() => setTick((t) => t + 1), 250)
    return () => window.clearInterval(id)
  }, [timerStatus, timerEndAtIso])

  useEffect(() => {
    if (timerStatus !== 'running' || timerEndAtIso) {
      softDeadlineMs.current = null
      return
    }
    const sec = serverRemainingSeconds
    if (sec == null || !Number.isFinite(sec) || sec <= 0) {
      softDeadlineMs.current = null
      return
    }
    softDeadlineMs.current = Date.now() + Math.ceil(sec) * 1000
    const id = window.setInterval(() => setTick((t) => t + 1), 250)
    return () => window.clearInterval(id)
  }, [timerStatus, timerEndAtIso, serverRemainingSeconds])

  return useMemo(() => {
    // Invalidate when `tick` bumps (interval) so `Date.now()` is recomputed ~4×/s while running.
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
