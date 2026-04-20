'use client'

type Phase = {
  currentPhase: string | null
  currentStage: string | null
  currentWeekContext: number | null
  pendingActionCount: number
  updatedAt: string
} | null

type RecentRun = {
  id: string
  concept: string
  triggerType: string
  status: string
  summary: string | null
  startedAt: string
  completedAt: string | null
}

export default function SpecialtyAutomationBanner({
  phase,
  recentRun,
  conceptLabel,
}: {
  phase: Phase
  recentRun?: RecentRun | null
  conceptLabel: string
}) {
  const phaseLine = phase?.currentPhase
    ? `${conceptLabel}: ${phase.currentPhase}${phase.currentStage ? ` · ${phase.currentStage}` : ''}`
    : `${conceptLabel} — phase sync pending`

  const weekLine =
    phase?.currentWeekContext != null ? `Week context ${phase.currentWeekContext}` : null

  const runLine = recentRun
    ? `Last run: ${recentRun.triggerType.replace(/^on/, '')} · ${recentRun.status}${
        recentRun.summary ? ` — ${recentRun.summary.slice(0, 120)}${recentRun.summary.length > 120 ? '…' : ''}` : ''
      }`
    : null

  return (
    <div
      className="rounded-xl border border-cyan-400/15 bg-gradient-to-r from-[#0a1228] to-[#0d1838] px-4 py-3"
      data-testid="specialty-automation-banner"
      role="status"
    >
      <p className="text-[13px] font-semibold text-cyan-100/95">{phaseLine}</p>
      {weekLine ? <p className="mt-0.5 text-[12px] text-white/55">{weekLine}</p> : null}
      {runLine ? <p className="mt-1 text-[11px] text-white/45">{runLine}</p> : null}
    </div>
  )
}
