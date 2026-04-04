'use client'

import { devyNum } from './devyConfigDisplay'

export function DevyRosterPanel({ config }: { config: Record<string, unknown> | null }) {
  const rows = [
    { label: 'Active roster size', key: 'activeRosterSize' },
    { label: 'Bench slots', key: 'benchSlots' },
    { label: 'IR slots', key: 'irSlots' },
    { label: 'Taxi slots', key: 'taxiSlots' },
    { label: 'Devy slots', key: 'devySlots' },
    { label: 'Max devy per team', key: 'maxDevyPerTeam' },
  ] as const

  return (
    <div className="space-y-4 px-4 py-5 text-[13px] text-white/85 md:px-6">
      <p className="text-[11px] text-white/45">Read-only snapshot from the server.</p>
      <div className="divide-y divide-white/[0.06] rounded-xl border border-white/[0.08] bg-[#0a1228]">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-white/70">{r.label}</span>
            <span className="font-mono text-[14px] font-semibold text-cyan-200/90">{devyNum(config, r.key)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
