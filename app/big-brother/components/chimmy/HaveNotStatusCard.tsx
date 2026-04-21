'use client'

/** Shown to players who are designated Have-Nots for the week. */
export function HaveNotStatusCard({ weekNumber }: { weekNumber?: number }) {
  return (
    <div
      className="rounded-xl border border-rose-500/30 bg-[#0a1228] p-4"
      data-testid="bb-have-not-status-card"
    >
      <p className="text-[11px] font-bold uppercase tracking-wide text-rose-300/70">Have-Not Status</p>
      <h3 className="mt-1 text-base font-bold text-white">🍲 You are a Have-Not this week</h3>
      {weekNumber ? (
        <p className="mt-1 text-[12px] text-white/50">Week {weekNumber} — Have-Not rules are active for you.</p>
      ) : null}
      <ul className="mt-3 space-y-1 text-[12px] text-white/60">
        <li>• Challenge scores reduced by 10%</li>
        <li>• Moved to bottom of waiver priority</li>
        <li>• Status resets after eviction vote</li>
      </ul>
    </div>
  )
}
