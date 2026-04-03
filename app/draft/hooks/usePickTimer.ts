'use client'

import { useEffect, useMemo, useState } from 'react'

export function usePickTimer(
  timerEndsAtIso: string | null,
  pickTimerSecs: number,
  _isMyTurn = false,
) {
  const endMs = useMemo(() => {
    if (!timerEndsAtIso) return null
    const t = new Date(timerEndsAtIso).getTime()
    return Number.isFinite(t) ? t : null
  }, [timerEndsAtIso])

  const [secondsRemaining, setSecondsRemaining] = useState(() =>
    endMs != null ? Math.max(0, Math.floor((endMs - Date.now()) / 1000)) : pickTimerSecs,
  )

  useEffect(() => {
    if (endMs == null) {
      setSecondsRemaining(pickTimerSecs)
      return
    }
    const tick = () => {
      setSecondsRemaining(Math.max(0, Math.floor((endMs - Date.now()) / 1000)))
    }
    tick()
    const id = window.setInterval(tick, 500)
    return () => window.clearInterval(id)
  }, [endMs, pickTimerSecs])

  const isExpired = secondsRemaining <= 0 && endMs != null

  return { secondsRemaining, isExpired, isMyTurn: _isMyTurn }
}
