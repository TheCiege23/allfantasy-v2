'use client'

type Phase = {
  currentPhase: string | null
  currentStage: string | null
  currentWeekContext: number | null
  pendingActionCount: number
  updatedAt: string
} | null

export default function SpecialtyPhaseStatusCard({
  phase,
  conceptLabel,
}: {
  phase: Phase
  conceptLabel: string
}) {
  if (!phase) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 bg-black/20 px-3 py-3 text-[13px] text-white/45">
        Specialty phase state will appear after the first automation run.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[#1E2A42] bg-[#131929] px-3 py-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#8B9DB8]">{conceptLabel}</p>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[13px] text-white/85">
        <dt className="text-white/45">Phase</dt>
        <dd className="text-right font-medium">{phase.currentPhase ?? '—'}</dd>
        <dt className="text-white/45">Stage</dt>
        <dd className="text-right font-medium">{phase.currentStage ?? '—'}</dd>
        <dt className="text-white/45">Week ctx</dt>
        <dd className="text-right font-medium">{phase.currentWeekContext ?? '—'}</dd>
        <dt className="text-white/45">Pending</dt>
        <dd className="text-right font-medium text-amber-200/90">{phase.pendingActionCount}</dd>
      </dl>
    </div>
  )
}
