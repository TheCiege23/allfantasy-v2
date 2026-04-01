'use client'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { LeagueCreateStepProps } from '../types'

const TRADE_REVIEW_MODES = ['none', 'commissioner', 'league_vote', 'instant'] as const

export function RulesStep({ state, setState }: LeagueCreateStepProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-xs font-medium text-white/60">Playoff Teams</label>
          <Input
            type="number"
            min={2}
            value={state.playoffTeamCount}
            onChange={(event) =>
              setState((current) => ({
                ...current,
                playoffTeamCount: Number(event.target.value || current.playoffTeamCount),
              }))
            }
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-medium text-white/60">Regular Season Length</label>
          <Input
            type="number"
            min={1}
            value={state.regularSeasonLength}
            onChange={(event) =>
              setState((current) => ({
                ...current,
                regularSeasonLength: Number(event.target.value || current.regularSeasonLength),
              }))
            }
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-medium text-white/60">Max Keepers</label>
          <Input
            type="number"
            min={0}
            value={state.maxKeepers}
            onChange={(event) =>
              setState((current) => ({
                ...current,
                maxKeepers: Number(event.target.value || current.maxKeepers),
              }))
            }
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-medium text-white/60">Salary Cap</label>
          <Input
            type="number"
            min={0}
            value={state.salaryCap}
            onChange={(event) =>
              setState((current) => ({
                ...current,
                salaryCap: Number(event.target.value || current.salaryCap),
              }))
            }
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {TRADE_REVIEW_MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() =>
              setState((current) => ({
                ...current,
                tradeReviewMode: mode,
              }))
            }
            className={`rounded-2xl border px-4 py-3 text-sm transition ${
              state.tradeReviewMode === mode
                ? 'border-cyan-300/60 bg-cyan-300/10 text-white'
                : 'border-white/10 bg-white/[0.03] text-white/75 hover:border-white/20'
            }`}
          >
            {mode.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      <div>
        <label className="mb-2 block text-xs font-medium text-white/60">League Constitution Notes</label>
        <Textarea
          value={state.constitutionNotes}
          onChange={(event) =>
            setState((current) => ({
              ...current,
              constitutionNotes: event.target.value,
            }))
          }
          placeholder="Optional commissioner notes for the generated constitution and onboarding copy."
          className="min-h-[120px]"
        />
      </div>
    </div>
  )
}
