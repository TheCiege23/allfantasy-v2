'use client'

import { useMemo } from 'react'
import type { TimerState } from '@/lib/live-draft-engine/types'
import { useDraftCountdownSeconds } from '@/lib/draft/useDraftCountdown'

function formatClockSeconds(totalSec: number | null | undefined): string {
  if (totalSec == null || !Number.isFinite(totalSec)) return '—'
  const s = Math.max(0, Math.floor(totalSec))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

export function DraftTimer({
  timer,
  className = '',
}: {
  timer: TimerState
  className?: string
}) {
  const liveSec = useDraftCountdownSeconds(timer.status, timer.timerEndAt, timer.remainingSeconds, {
    pauseReason: timer.pauseReason,
    overnightResumeAtIso: timer.overnightResumeAt ?? null,
  })
  const sec = liveSec ?? timer.remainingSeconds
  const urgent = useMemo(() => {
    if (timer.status !== 'running') return false
    const n = liveSec ?? timer.remainingSeconds
    return n != null && n <= 15
  }, [timer.status, timer.remainingSeconds, liveSec])

  const label =
    timer.status === 'paused'
      ? 'Paused'
      : timer.status === 'none'
        ? '—'
        : timer.status === 'expired'
          ? '0:00'
          : sec != null
            ? formatClockSeconds(sec)
            : '—'

  return (
    <div
      className={`rounded-2xl border bg-[#0a1228]/95 px-4 py-3 text-center transition-[box-shadow,transform] duration-300 ${
        urgent
          ? 'border-amber-400/50 shadow-[0_0_36px_rgba(251,191,46,0.45)] ring-2 ring-amber-400/55 scale-[1.02]'
          : 'border-cyan-500/25 shadow-[0_0_24px_rgba(34,211,238,0.12)]'
      } ${className}`}
      data-testid="draft-live-timer"
      role="timer"
      aria-live="polite"
      aria-label={timer.status === 'running' ? `Time remaining ${label}` : `Timer ${label}`}
    >
      <p
        className={`text-[10px] font-bold uppercase tracking-[0.2em] ${urgent ? 'text-amber-200' : 'text-cyan-200/70'}`}
      >
        Timer
      </p>
      <p
        className={`mt-1 font-mono font-bold tabular-nums tracking-tight text-white ${
          urgent ? 'animate-pulse text-amber-50 text-4xl sm:text-5xl' : 'text-3xl'
        }`}
      >
        {label}
      </p>
      {timer.timerEndAt && timer.status === 'running' && !urgent ? (
        <p className="mt-1 text-[10px] text-white/35">Ends {new Date(timer.timerEndAt).toLocaleTimeString()}</p>
      ) : urgent ? (
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-amber-200/90">Time running out</p>
      ) : null}
    </div>
  )
}
