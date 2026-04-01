'use client'

import { useEffect, useMemo, useState } from 'react'

export function PickTimer({
  seconds,
  active = true,
}: {
  seconds: number | null
  active?: boolean
}) {
  const [remaining, setRemaining] = useState<number>(Math.max(0, seconds ?? 0))

  useEffect(() => {
    setRemaining(Math.max(0, seconds ?? 0))
  }, [seconds])

  useEffect(() => {
    if (!active || remaining <= 0) return
    const id = window.setInterval(() => {
      setRemaining((value) => Math.max(0, value - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [active, remaining])

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
