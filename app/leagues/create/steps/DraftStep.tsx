'use client'

import { Input } from '@/components/ui/input'
import { getAllowedDraftTypesForFormat } from '@/lib/league/format-engine'
import { LeagueCreateStepProps } from '../types'

export function DraftStep({ state, setState }: LeagueCreateStepProps) {
  const draftTypes = getAllowedDraftTypesForFormat(state.sport, state.formatId)

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {draftTypes.map((draftType) => {
          const selected = state.draftType === draftType
          return (
            <button
              key={draftType}
              type="button"
              onClick={() => setState((current) => ({ ...current, draftType }))}
              className={`rounded-2xl border px-4 py-3 text-left transition ${
                selected
                  ? 'border-cyan-300/60 bg-cyan-300/10 text-white'
                  : 'border-white/10 bg-white/[0.03] text-white/75 hover:border-white/20'
              }`}
            >
              <div className="text-sm font-semibold">{draftType.replace(/_/g, ' ')}</div>
            </button>
          )
        })}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <label className="mb-2 block text-xs font-medium text-white/60">Rounds</label>
          <Input
            type="number"
            min={1}
            value={state.draftRounds}
            onChange={(event) =>
              setState((current) => ({
                ...current,
                draftRounds: Number(event.target.value || current.draftRounds),
              }))
            }
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-medium text-white/60">Timer Seconds</label>
          <Input
            type="number"
            min={0}
            value={state.timerSeconds}
            onChange={(event) =>
              setState((current) => ({
                ...current,
                timerSeconds: Number(event.target.value || current.timerSeconds),
              }))
            }
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-medium text-white/60">Auction Budget</label>
          <Input
            type="number"
            min={1}
            value={state.auctionBudget}
            onChange={(event) =>
              setState((current) => ({
                ...current,
                auctionBudget: Number(event.target.value || current.auctionBudget),
              }))
            }
          />
        </div>
      </div>
    </div>
  )
}
