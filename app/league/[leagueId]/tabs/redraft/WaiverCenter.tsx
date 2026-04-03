'use client'

export function WaiverCenter({ seasonId }: { seasonId: string | null }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 text-[12px] text-white/50">
      Waiver center — season <span className="text-white/70">{seasonId ?? '—'}</span>. Wire to GET/POST
      /api/redraft/waivers.
    </div>
  )
}
