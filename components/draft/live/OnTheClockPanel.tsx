'use client'

import type { CurrentOnTheClock, DraftSessionStatus } from '@/lib/live-draft-engine/types'

export function OnTheClockPanel({
  status,
  currentPick,
}: {
  status: DraftSessionStatus
  currentPick: CurrentOnTheClock | null
}) {
  if (status === 'completed') {
    return (
      <div className="rounded-2xl border border-emerald-400/35 bg-gradient-to-br from-emerald-500/20 to-emerald-950/30 px-4 py-4 text-center shadow-[0_12px_40px_rgba(16,185,129,0.2)] ring-1 ring-emerald-400/20">
        <p className="text-sm font-bold tracking-tight text-emerald-100">Draft complete</p>
      </div>
    )
  }
  if (status === 'pre_draft') {
    return (
      <div className="rounded-2xl border border-white/12 bg-[#0a1228]/85 px-4 py-4 text-center text-sm text-white/60 shadow-inner backdrop-blur-sm">
        Waiting for draft to start…
      </div>
    )
  }

  if (!currentPick) {
    return (
      <div className="rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500/10 to-[#0a1228]/90 px-4 py-4 text-center text-sm font-medium text-amber-100/90 shadow-[0_8px_28px_rgba(245,158,11,0.12)]">
        {status === 'in_progress'
          ? 'Syncing current pick…'
          : 'Waiting for the board…'}
      </div>
    )
  }

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-500/[0.18] via-[#121a2e] to-[#0a1228] px-4 py-4 text-center shadow-[0_0_40px_rgba(251,191,36,0.22),0_16px_48px_rgba(0,0,0,0.4)] ring-1 ring-amber-400/25"
      data-testid="draft-on-the-clock"
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-amber-400/10 blur-2xl"
        aria-hidden
      />
      <div className="relative">
        <p className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.28em] text-amber-200/90">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300/50 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.9)]" />
          </span>
          On the clock
        </p>
        <p className="mt-2 truncate text-xl font-extrabold tracking-tight text-white drop-shadow-sm sm:text-2xl">
          {currentPick.displayName}
        </p>
        <p className="mt-1 font-mono text-sm font-semibold text-cyan-200/95">{currentPick.pickLabel}</p>
      </div>
    </div>
  )
}
