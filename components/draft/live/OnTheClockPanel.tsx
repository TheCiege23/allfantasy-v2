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
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/25 px-4 py-4 text-center">
        <p className="text-sm font-bold text-emerald-100">Draft complete</p>
      </div>
    )
  }
  if (status === 'pre_draft') {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0a1228]/80 px-4 py-4 text-center text-sm text-white/55">
        Waiting for draft to start…
      </div>
    )
  }

  if (!currentPick) {
    return (
      <div className="rounded-2xl border border-amber-400/25 bg-[#0a1228]/80 px-4 py-4 text-center text-sm text-amber-100/90">
        {status === 'in_progress'
          ? 'Syncing current pick…'
          : 'Waiting for the board…'}
      </div>
    )
  }

  return (
    <div
      className="rounded-2xl border border-amber-400/35 bg-gradient-to-br from-amber-950/40 via-[#0a1228] to-[#0a1228] px-4 py-5 text-center shadow-[0_0_32px_rgba(251,191,36,0.15)]"
      data-testid="draft-on-the-clock"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200/80">On the clock</p>
      <p className="mt-2 truncate text-lg font-bold text-white">{currentPick.displayName}</p>
      <p className="mt-1 font-mono text-sm text-cyan-200/90">{currentPick.pickLabel}</p>
    </div>
  )
}
