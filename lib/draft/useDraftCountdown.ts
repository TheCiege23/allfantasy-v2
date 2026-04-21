'use client'

import { useEffect, useMemo, useState } from 'react'

/**
 * Client-side display tick for draft timers. **Never** decrement a stored second count.
 * Remaining is always recomputed as `max(0, ceil((timerEndAt - now) / 1000))` when `timerEndAtIso`
 * is set; `tick` only forces a re-render on an interval so `Date.now()` updates.
 */
export function useDraftCountdownSeconds(
  timerStatus: 'running' | 'paused' | 'expired' | 'none',
  timerEndAtIso: string | null | undefined,
  serverRemainingSeconds: number | null | undefined,
): number | null {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (timerStatus !== 'running' || !timerEndAtIso) return
    const id = window.setInterval(() => setTick((t) => t + 1), 250)
    return () => window.clearInterval(id)
  }, [timerStatus, timerEndAtIso])

  return useMemo(() => {
    if (timerStatus === 'paused') return serverRemainingSeconds ?? null
    if (timerStatus === 'expired') return 0
    if (timerStatus === 'none') return serverRemainingSeconds ?? null
    if (timerStatus === 'running' && timerEndAtIso) {
      const end = new Date(timerEndAtIso).getTime()
      if (!Number.isFinite(end)) return serverRemainingSeconds ?? null
      return Math.max(0, Math.ceil((end - Date.now()) / 1000))
    }
    return serverRemainingSeconds ?? null
  }, [timerStatus, timerEndAtIso, serverRemainingSeconds, tick])
}
