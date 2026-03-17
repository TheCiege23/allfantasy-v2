'use client'

import { LeagueCreationSportSelector, LEAGUE_SPORTS, type LeagueSportOption } from '@/components/league-creation'
import type { LeagueCreationWizardState } from '@/lib/league-creation-wizard/types'

export type Step1SportProps = {
  state: LeagueCreationWizardState
  onSportChange: (sport: string) => void
  onNext: () => void
}

export function Step1Sport({ state, onSportChange, onNext }: Step1SportProps) {
  const value = (LEAGUE_SPORTS as readonly string[]).includes(state.sport) ? state.sport : LEAGUE_SPORTS[0]!
  return (
    <section className="space-y-6">
      <h2 className="text-lg font-semibold text-white">Choose sport</h2>
      <p className="text-sm text-white/70">All other options will adapt to this sport.</p>
      <LeagueCreationSportSelector
        value={value as LeagueSportOption}
        onChange={(s) => onSportChange(s)}
        showHelper={true}
      />
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onNext}
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 min-h-[44px] touch-manipulation"
        >
          Next
        </button>
      </div>
    </section>
  )
}
