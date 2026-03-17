'use client'

import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getVariantsForSport } from '@/lib/sport-defaults/LeagueVariantRegistry'
import type { LeagueCreationWizardState } from '@/lib/league-creation-wizard/types'

export type Step5ScoringProps = {
  state: LeagueCreationWizardState
  onScoringPresetChange: (value: string | null) => void
  onLeagueVariantChange: (value: string | null) => void
  onBack: () => void
  onNext: () => void
}

export function Step5Scoring({
  state,
  onScoringPresetChange,
  onLeagueVariantChange,
  onBack,
  onNext,
}: Step5ScoringProps) {
  const variants = getVariantsForSport(state.sport)
  const scoringValue = state.scoringPreset ?? state.leagueVariant ?? variants[0]?.value ?? 'STANDARD'
  const value = variants.some((v) => v.value === scoringValue) ? scoringValue : variants[0]?.value ?? 'STANDARD'
  const handleChange = (v: string) => {
    onScoringPresetChange(v)
    onLeagueVariantChange(v)
  }
  return (
    <section className="space-y-6">
      <h2 className="text-lg font-semibold text-white">Scoring rules</h2>
      <p className="text-sm text-white/70">Preset determines roster and scoring defaults for this sport.</p>
      <div>
        <Label className="text-white/90">Preset</Label>
        <Select value={value} onValueChange={handleChange}>
          <SelectTrigger className="mt-1.5 bg-gray-900 border-white/20 text-white min-h-[44px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {variants.map(({ value: v, label }) => (
              <SelectItem key={v} value={v}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-between gap-2">
        <button type="button" onClick={onBack} className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white/90 hover:bg-white/10 min-h-[44px] touch-manipulation">
          Back
        </button>
        <button type="button" onClick={onNext} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 min-h-[44px] touch-manipulation">
          Next
        </button>
      </div>
    </section>
  )
}
