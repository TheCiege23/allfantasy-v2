'use client'

import { Input } from '@/components/ui/input'
import { resolveLeagueFormat } from '@/lib/league/format-engine'
import { LeagueCreateStepProps } from '../types'

export function RosterStep({ state, setState }: LeagueCreateStepProps) {
  const resolution = resolveLeagueFormat({
    sport: state.sport,
    leagueType: state.formatId,
    draftType: state.draftType,
    requestedModifiers: state.modifiers,
  })

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-xs font-medium text-white/60">League Name</label>
          <Input
            value={state.leagueName}
            onChange={(event) =>
              setState((current) => ({ ...current, leagueName: event.target.value }))
            }
            placeholder={`${state.sport} ${resolution.format.label}`}
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-medium text-white/60">Teams</label>
          <Input
            type="number"
            min={4}
            max={32}
            value={state.teamCount}
            onChange={(event) =>
              setState((current) => ({
                ...current,
                teamCount: Number(event.target.value || current.teamCount),
              }))
            }
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-medium text-white/60">Roster Size</label>
        <Input
          type="number"
          min={1}
          value={state.rosterSize}
          onChange={(event) =>
            setState((current) => ({
              ...current,
              rosterSize: Number(event.target.value || current.rosterSize),
            }))
          }
        />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-white/50">
          Derived Default Layout
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-white/70">
          {Object.entries(resolution.roster.starterSlots).map(([slot, count]) => (
            <span key={slot} className="rounded-full border border-white/10 px-3 py-1">
              {slot}: {count}
            </span>
          ))}
          <span className="rounded-full border border-white/10 px-3 py-1">
            Bench: {resolution.roster.benchSlots}
          </span>
          <span className="rounded-full border border-white/10 px-3 py-1">
            IR: {resolution.roster.irSlots}
          </span>
          {resolution.roster.taxiSlots > 0 ? (
            <span className="rounded-full border border-white/10 px-3 py-1">
              Taxi: {resolution.roster.taxiSlots}
            </span>
          ) : null}
          {resolution.roster.devySlots > 0 ? (
            <span className="rounded-full border border-white/10 px-3 py-1">
              College: {resolution.roster.devySlots}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}
