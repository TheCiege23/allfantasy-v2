'use client'

import { Input } from '@/components/ui/input'
import { resolveLeagueFormat } from '@/lib/league/format-engine'
import { LeagueCreateStepProps } from '../types'

const MODES = ['points', 'category', 'roto'] as const

export function ScoringStep({ state, setState }: LeagueCreateStepProps) {
  const resolution = resolveLeagueFormat({
    sport: state.sport,
    leagueType: state.formatId,
    draftType: state.draftType,
    requestedModifiers: state.modifiers,
  })

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {MODES.map((mode) => {
          const selected = state.scoringMode === mode
          return (
            <button
              key={mode}
              type="button"
              onClick={() =>
                setState((current) => ({
                  ...current,
                  scoringMode: mode,
                }))
              }
              className={`rounded-2xl border px-4 py-3 text-sm transition ${
                selected
                  ? 'border-cyan-300/60 bg-cyan-300/10 text-white'
                  : 'border-white/10 bg-white/[0.03] text-white/75 hover:border-white/20'
              }`}
            >
              {mode}
            </button>
          )
        })}
      </div>

      <div>
        <label className="mb-2 block text-xs font-medium text-white/60">Scoring Format Label</label>
        <Input
          value={state.scoringFormat}
          onChange={(event) =>
            setState((current) => ({
              ...current,
              scoringFormat: event.target.value,
            }))
          }
          placeholder={resolution.scoring.scoringFormat}
        />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/70">
        Template: <span className="text-white">{resolution.scoring.scoringTemplateId}</span>
      </div>
    </div>
  )
}
