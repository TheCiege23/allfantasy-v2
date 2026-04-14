'use client'

import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
const LABELS: Record<string, string> = {
  prefers_high_ceiling: 'Prefers high-upside skill positions',
  prefers_stable_veterans: 'Prefers stable veterans',
  prefers_veterans: 'Prefers veterans',
  prefers_rookies: 'Leans on rookies',
  prefers_consistency: 'Prefers floor / consistency',
  prefers_safe_floor: 'Prefers safe floor',
  prefers_matchup_chasing: 'Matchup-chasing streamers',
  prefers_team_loyalty: 'Team loyalty tie-breaks',
}

export function UserPreferencePanel({
  activeTraits,
  traitSummary,
  notes,
}: {
  activeTraits: string[]
  traitSummary?: Record<string, { confidence: number; sampleSize: number }>
  notes: string[]
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-2xl border border-white/10 bg-[#080f20]/90">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
        data-testid="lineup-optimizer-preference-panel-toggle"
      >
        <span className="text-sm font-semibold text-white">Your play style</span>
        {open ? <ChevronUp className="h-4 w-4 text-white/50" /> : <ChevronDown className="h-4 w-4 text-white/50" />}
      </button>
      {open ? (
        <div className="space-y-3 border-t border-white/10 px-4 pb-4 pt-1">
          <p className="text-xs text-white/50">
            Learned traits are <span className="text-cyan-200/90">tie-breakers only</span> in close decisions — strong
            projections still win.
          </p>
          <ul className="space-y-2">
            {activeTraits.length === 0 ? (
              <li className="text-sm text-white/45">No strong patterns yet — keep using the optimizer.</li>
            ) : (
              activeTraits.map((t) => {
                const conf = traitSummary?.[t]?.confidence
                const pct = conf != null ? Math.round(conf * 100) : null
                return (
                  <li
                    key={t}
                    className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm text-white/85"
                  >
                    <span>{LABELS[t] ?? t.replace(/_/g, ' ')}</span>
                    {pct != null ? (
                      <span className="tabular-nums text-cyan-200/90">{pct}%</span>
                    ) : (
                      <span className="text-white/35">—</span>
                    )}
                  </li>
                )
              })
            )}
          </ul>
          {notes.length > 0 ? (
            <ul className="space-y-1 text-xs text-white/45">
              {notes.map((n, i) => (
                <li key={i}>• {n}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
