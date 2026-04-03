'use client'

export function RosterManager({ seasonId }: { seasonId: string | null }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 text-[12px] text-white/50">
      Roster management for season <span className="text-white/70">{seasonId ?? '—'}</span> — drag/drop wiring
      to PATCH /api/redraft/roster.
    </div>
  )
}
