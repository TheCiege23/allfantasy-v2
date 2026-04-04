'use client'

import { useState } from 'react'
import type { C2CConfigClient } from '@/lib/c2c/c2cUiLabels'

export function C2CScoringPanel({ config }: { config: C2CConfigClient | null }) {
  const [bbFreq, setBbFreq] = useState(config?.sportPair?.includes('NBA') ? 'weekly' : 'weekly')

  if (!config) return <p className="px-6 py-8 text-[13px] text-white/45">Loading…</p>

  const isFb = config.sportPair === 'NFL_CFB' || String(config.sportPair).includes('NFL')

  return (
    <div className="space-y-5 px-6 py-6 text-[13px] text-white/80" data-testid="c2c-scoring-panel">
      {isFb ? (
        <div>
          <p className="text-[11px] font-bold uppercase text-white/45">Football (both sides)</p>
          <select className="mt-2 w-full rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2 text-[12px]" disabled>
            <option>PPR</option>
            <option>Half-PPR</option>
            <option>Standard</option>
          </select>
        </div>
      ) : (
        <div>
          <p className="text-[11px] font-bold uppercase text-white/45">Basketball</p>
          <label className="mt-2 flex items-center gap-2 text-[12px]">
            <input type="checkbox" defaultChecked />
            Points league
          </label>
        </div>
      )}
      <label className="block">
        <span className="text-[11px] text-white/45">Stat correction window (hours)</span>
        <input type="number" defaultValue={24} className="mt-1 w-full rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2" disabled />
      </label>
      <div>
        <p className="text-[11px] font-bold uppercase text-white/45">Lineup lock</p>
        {isFb ? (
          <ul className="mt-2 list-inside list-disc space-y-1 text-[12px] text-white/55">
            <li>Campus: Saturday kickoff (fixed)</li>
            <li>Canton: per-player Sunday kickoff (fixed)</li>
          </ul>
        ) : (
          <select
            value={bbFreq}
            onChange={(e) => setBbFreq(e.target.value)}
            className="mt-2 w-full rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2 text-[12px]"
          >
            <option value="weekly">Weekly</option>
            <option value="daily">Daily</option>
          </select>
        )}
      </div>
    </div>
  )
}
