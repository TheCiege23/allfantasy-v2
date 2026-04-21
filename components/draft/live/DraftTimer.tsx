'use client'

import type { TimerState } from '@/lib/live-draft-engine/types'
import { useDraftCountdownSeconds } from '@/lib/draft/useDraftCountdown'

export function DraftTimer({
  timer,
  className = '',
}: {
  timer: TimerState
  className?: string
}) {
  const liveSec = useDraftCountdownSeconds(timer.status, timer.timerEndAt, timer.remainingSeconds)
  const sec = liveSec ?? timer.remainingSeconds
  const label =
    timer.status === 'paused'
      ? 'Paused'
      : timer.status === 'none'
        ? '—'
        : timer.status === 'expired'
          ? '0:00'
          : sec != null
            ? `${sec}s`
            : '—'

  return (
    <div
      className={`rounded-2xl border border-cyan-500/25 bg-[#0a1228]/95 px-4 py-3 text-center shadow-[0_0_24px_rgba(34,211,238,0.12)] ${className}`}
      data-testid="draft-live-timer"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200/70">Timer</p>
      <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-white">{label}</p>
      {timer.timerEndAt && timer.status === 'running' ? (
        <p className="mt-1 text-[10px] text-white/35">Ends {new Date(timer.timerEndAt).toLocaleTimeString()}</p>
      ) : null}
    </div>
  )
}
