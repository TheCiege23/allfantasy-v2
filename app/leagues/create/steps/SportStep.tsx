'use client'

import { SUPPORTED_SPORTS } from '@/lib/sport-scope'
import { LeagueCreateStepProps } from '../types'

export function SportStep({ state, setState }: LeagueCreateStepProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {SUPPORTED_SPORTS.map((sport) => {
        const selected = state.sport === sport
        return (
          <button
            key={sport}
            type="button"
            onClick={() => setState((current) => ({ ...current, sport }))}
            className={`rounded-2xl border px-4 py-4 text-left transition ${
              selected
                ? 'border-cyan-300/60 bg-cyan-300/10 text-white'
                : 'border-white/10 bg-white/[0.03] text-white/75 hover:border-white/20'
            }`}
          >
            <div className="text-sm font-semibold">{sport}</div>
            <div className="mt-1 text-xs text-white/55">
              Build a sport-aware format for {sport}.
            </div>
          </button>
        )
      })}
    </div>
  )
}
