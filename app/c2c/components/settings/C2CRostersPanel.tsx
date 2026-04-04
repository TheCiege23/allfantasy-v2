'use client'

import { useState } from 'react'
import type { C2CConfigClient } from '@/lib/c2c/c2cUiLabels'

export function C2CRostersPanel({ config, canEdit }: { config: C2CConfigClient | null; canEdit: boolean }) {
  const [sfCampus, setSfCampus] = useState(false)
  const [sfCanton, setSfCanton] = useState(false)

  if (!config) return <p className="px-6 py-8 text-[13px] text-white/45">Loading…</p>

  return (
    <div className="space-y-4 px-6 py-6 text-[13px]" data-testid="c2c-rosters-panel">
      {(
        [
          ['Campus starters', config.campusStarterSlots],
          ['Canton starters', config.cantonStarterSlots],
          ['Bench', config.benchSlots],
          ['Taxi', config.taxiSlots],
          ['Devy', config.devySlots],
          ['IR', config.irSlots],
        ] as const
      ).map(([label, val]) => (
        <label key={label} className="flex items-center justify-between gap-3 border-b border-white/[0.06] py-2">
          <span className="text-white/70">{label}</span>
          <input
            type="number"
            readOnly
            className="w-20 rounded border border-white/[0.08] bg-black/30 px-2 py-1 text-right text-white/80"
            value={val === undefined || val === null ? '' : val}
          />
        </label>
      ))}
      <div className="flex flex-wrap gap-4 pt-2">
        <label className="flex items-center gap-2 text-[12px] text-white/65">
          <input type="checkbox" checked={sfCampus} disabled={!canEdit} onChange={() => setSfCampus((v) => !v)} />
          Superflex (campus)
        </label>
        <label className="flex items-center gap-2 text-[12px] text-white/65">
          <input type="checkbox" checked={sfCanton} disabled={!canEdit} onChange={() => setSfCanton((v) => !v)} />
          Superflex (canton)
        </label>
      </div>
    </div>
  )
}
