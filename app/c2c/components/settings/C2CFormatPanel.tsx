'use client'

import { useState } from 'react'
import type { C2CConfigClient } from '@/lib/c2c/c2cUiLabels'

export function C2CFormatPanel({ config, canEdit }: { config: C2CConfigClient | null; canEdit: boolean }) {
  const [mode, setMode] = useState(config?.scoringMode ?? 'combined_total')
  const [cw, setCw] = useState(Math.round((config?.campusScoreWeight ?? 0.4) * 100))

  if (!config) {
    return <p className="px-6 py-8 text-[13px] text-white/45">Loading C2C config…</p>
  }

  const cantonW = 100 - cw

  return (
    <div className="space-y-6 px-6 py-6 text-[13px] text-white/85" data-testid="c2c-format-panel">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-white/45">Sport pair</p>
        <div className="mt-2 space-y-2">
          <label className="flex items-center gap-2 opacity-60">
            <input type="radio" checked={config.sportPair.includes('NFL') || config.sportPair === 'NFL_CFB'} readOnly />
            NFL / CFB
          </label>
          <label className="flex items-center gap-2 opacity-60">
            <input type="radio" checked={config.sportPair.includes('NBA') || config.sportPair === 'NBA_CBB'} readOnly />
            NBA / CBB
          </label>
          <p className="text-[11px] text-amber-200/80">Locked after league creation.</p>
        </div>
      </div>
      <div>
        <p className="text-[11px] font-bold uppercase text-white/45">Dynasty</p>
        <p className="mt-1 rounded-lg border border-white/[0.08] bg-black/20 px-3 py-2 text-[12px] text-white/55">Always on for C2C</p>
      </div>
      <div>
        <p className="text-[11px] font-bold uppercase text-white/45">Scoring mode</p>
        <div className="mt-2 grid gap-2">
          {(
            [
              ['combined_total', 'Combined'],
              ['split_display_combined', 'Split display'],
              ['dual_track', 'Dual track'],
              ['weighted_combined', 'Weighted'],
            ] as const
          ).map(([id, label]) => (
            <label key={id} className="flex items-center gap-2">
              <input
                type="radio"
                name="c2c-mode"
                checked={mode === id}
                disabled={!canEdit}
                onChange={() => setMode(id)}
                data-testid={`c2c-scoring-mode-${id}`}
              />
              {label}
            </label>
          ))}
        </div>
      </div>
      {mode === 'weighted_combined' ? (
        <div>
          <p className="text-[11px] text-white/45">Campus weight ({cw}%) — Canton ({cantonW}%)</p>
          <input
            type="range"
            min={30}
            max={70}
            value={cw}
            disabled={!canEdit}
            onChange={(e) => setCw(Number(e.target.value))}
            className="mt-2 w-full accent-violet-500"
          />
          <p className="mt-1 text-[11px] text-white/35">Commissioner save API is wired separately.</p>
        </div>
      ) : null}
    </div>
  )
}
