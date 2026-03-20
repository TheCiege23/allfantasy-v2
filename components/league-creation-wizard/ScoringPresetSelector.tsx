'use client'

import { Label } from '@/components/ui/label'
import { getVariantsForSport } from '@/lib/sport-defaults/LeagueVariantRegistry'
import { StepHeader } from './StepHelp'
import { LeagueCreationPresetSelector } from '@/components/league-creation'

export type ScoringPresetSelectorProps = {
  sport: string
  value: string | null
  onChange: (value: string | null) => void
}

/**
 * Scoring preset (e.g. Standard, PPR, IDP for NFL). Drives roster and scoring defaults.
 */
export function ScoringPresetSelector({ sport, value, onChange }: ScoringPresetSelectorProps) {
  const variants = getVariantsForSport(sport)
  const safeValue = variants.some((v) => v.value === (value ?? '')) ? (value ?? variants[0]?.value) : (variants[0]?.value ?? 'STANDARD')
  return (
    <div className="space-y-5">
      <StepHeader
        title="Scoring rules"
        description="Pick a preset that matches your league. It sets default roster slots and point values (e.g. PPR gives 1 point per reception for NFL)."
        help={
          <>
            Presets define how players score points (rushing yards, TDs, receptions, etc.). You can tweak individual stats later in league settings.
          </>
        }
        helpTitle="Scoring presets"
      />
      <div className="space-y-1.5">
        <Label className="text-white/90">Preset</Label>
        <LeagueCreationPresetSelector
          variantOptions={variants}
          value={safeValue ?? 'STANDARD'}
          onChange={(v) => onChange(v)}
          showHelper
        />
        <p className="mt-1 text-xs text-white/50">You can customize scoring later in league settings.</p>
      </div>
    </div>
  )
}
