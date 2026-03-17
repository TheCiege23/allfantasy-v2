'use client'

import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  LEAGUE_TYPE_IDS,
  LEAGUE_TYPE_LABELS,
  getAllowedLeagueTypesForSport,
} from '@/lib/league-creation-wizard/league-type-registry'
import type { LeagueCreationWizardState, LeagueTypeId } from '@/lib/league-creation-wizard/types'

export type Step2LeagueTypeProps = {
  state: LeagueCreationWizardState
  onLeagueTypeChange: (leagueType: LeagueTypeId) => void
  onBack: () => void
  onNext: () => void
}

export function Step2LeagueType({ state, onLeagueTypeChange, onBack, onNext }: Step2LeagueTypeProps) {
  const allowed = getAllowedLeagueTypesForSport(state.sport)
  const value = allowed.includes(state.leagueType) ? state.leagueType : allowed[0]
  return (
    <section className="space-y-6">
      <h2 className="text-lg font-semibold text-white">League type</h2>
      <p className="text-sm text-white/70">Determines roster rules, keepers, and draft variants.</p>
      <div>
        <Label className="text-white/90">Type</Label>
        <Select
          value={value}
          onValueChange={(v) => onLeagueTypeChange(v as LeagueTypeId)}
        >
          <SelectTrigger className="mt-1.5 bg-gray-900 border-white/20 text-white min-h-[44px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LEAGUE_TYPE_IDS.filter((id) => allowed.includes(id)).map((id) => (
              <SelectItem key={id} value={id}>
                {LEAGUE_TYPE_LABELS[id]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white/90 hover:bg-white/10 min-h-[44px] touch-manipulation"
        >
          Back
        </button>
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
