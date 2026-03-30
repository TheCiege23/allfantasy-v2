'use client'

import { Label } from '@/components/ui/label'
import { getVariantsForSport } from '@/lib/sport-defaults/LeagueVariantRegistry'
import { StepHeader } from './StepHelp'
import { LeagueCreationPresetSelector } from '@/components/league-creation'
import { useSportRules } from '@/hooks/useSportRules'

export type ScoringPresetSelectorProps = {
  sport: string
  value: string | null
  onChange: (value: string | null) => void
  lockedVariantLabel?: string | null
}

/**
 * Scoring preset (e.g. Standard, PPR, IDP for NFL). Drives roster and scoring defaults.
 */
export function ScoringPresetSelector({
  sport,
  value,
  onChange,
  lockedVariantLabel = null,
}: ScoringPresetSelectorProps) {
  const { rules } = useSportRules(sport, value)
  if (lockedVariantLabel) {
    return (
      <div className="space-y-5">
        <StepHeader
          title="Scoring rules"
          description="This league type has a fixed variant, so scoring and roster defaults are locked to that setup."
          help={
            <>
              Devy and C2C leagues use fixed startup defaults so league creation, previews, and saved settings remain in sync.
            </>
          }
          helpTitle="Locked scoring preset"
        />
        <div className="space-y-1.5">
          <Label className="text-white/90">Preset</Label>
          <div
            className="rounded-lg border border-purple-600/40 bg-gray-900 px-3 py-2 text-sm text-white"
            data-testid="league-creation-preset-locked"
          >
            {lockedVariantLabel}
          </div>
          <p className="mt-1 text-xs text-white/50">Preset is controlled by your selected league type.</p>
        </div>
      </div>
    )
  }

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
          sport={sport}
          variantOptions={variants}
          value={safeValue ?? 'STANDARD'}
          onChange={(v) => onChange(v)}
          showHelper
        />
        {rules && (
          <div className="mt-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white/65">
            <p>
              Player pool source: <span className="text-white/90">{rules.playerPool.source}</span>
            </p>
            <p>
              Valid positions: <span className="text-white/90">{rules.playerPool.validPositions.join(', ')}</span>
            </p>
          </div>
        )}
        <p className="mt-1 text-xs text-white/50">You can customize scoring later in league settings.</p>
      </div>
    </div>
  )
}
