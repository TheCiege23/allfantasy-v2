'use client'

import { useEffect, useMemo, useState } from 'react'

function remainingSecondsFromEndMs(endMs: number | null, nowMs: number): number {
  if (endMs == null || !Number.isFinite(endMs)) return 0
  return Math.max(0, Math.ceil((endMs - nowMs) / 1000))
}

/**
 * Pick countdown: **always** `remaining = timerEndAt - now` (never decrement local seconds).
 * Pass `timerEndAtIso` from the server when available. If only `seconds` is provided (legacy),
 * we anchor once as `Date.now() + seconds` when `seconds` updates so the display still derives
 * from an end timestamp, not `setSeconds(s => s - 1)`.
 */
export function PickTimer({
  timerEndAtIso,
  seconds,
  active = true,
}: {
  /** Preferred: ISO UTC when the pick timer ends */
  timerEndAtIso?: string | null
  /** Fallback when no end time: used to build a one-shot anchor `now + seconds` */
  seconds?: number | null
  active?: boolean
}) {
  const endMsFromServer = useMemo(() => {
    if (!timerEndAtIso) return null
    const t = new Date(timerEndAtIso).getTime()
    return Number.isFinite(t) ? t : null
  }, [timerEndAtIso])

  /** When server does not send `timerEndAtIso`, anchor end time from last known `seconds` snapshot */
  const [fallbackEndMs, setFallbackEndMs] = useState<number | null>(null)
  useEffect(() => {
    if (endMsFromServer != null) {
      setFallbackEndMs(null)
      return
    }
    if (seconds != null && seconds >= 0 && active) {
      setFallbackEndMs(Date.now() + seconds * 1000)
    } else {
      setFallbackEndMs(null)
    }
  }, [endMsFromServer, seconds, active])

  const effectiveEndMs = endMsFromServer ?? fallbackEndMs

  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!active || effectiveEndMs == null) return
    const id = window.setInterval(() => setTick((n) => n + 1), 250)
    return () => window.clearInterval(id)
  }, [active, effectiveEndMs])

  const remaining = useMemo(() => {
    if (!active || effectiveEndMs == null) return 0
    return remainingSecondsFromEndMs(effectiveEndMs, Date.now())
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tick drives re-read of Date.now()
  }, [active, effectiveEndMs, tick])

  const label = useMemo(() => {
    const minutes = Math.floor(remaining / 60)
    const secs = remaining % 60
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }, [remaining])

  return (
    <div
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${
        remaining <= 10
          ? 'bg-red-500/15 text-red-200'
          : 'bg-cyan-500/10 text-cyan-100'
      }`}
    >
      {label}
    </div>
  )
}
