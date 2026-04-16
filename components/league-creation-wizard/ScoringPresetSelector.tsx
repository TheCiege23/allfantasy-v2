'use client'

import { useEffect, useMemo, useState } from 'react'
import { Label } from '@/components/ui/label'
import { getVariantsForSport, getZombieScoringVariants } from '@/lib/sport-defaults/LeagueVariantRegistry'
import { StepHeader } from './StepHelp'
import { useSportRules } from '@/hooks/useSportRules'
import type { LeagueTypeId } from '@/lib/league-creation-wizard/types'

/** Presets hidden when creating a survivor league. */
const SURVIVOR_HIDDEN_PRESETS = new Set(['IDP', 'DYNASTY_IDP'])

/** Human-friendly labels shown for survivor league scoring presets. */
const SURVIVOR_PRESET_LABELS: Record<string, string> = {
  STANDARD: 'Standard',
  PPR: 'PPR',
  HALF_PPR: 'Half-PPR',
  SUPERFLEX: 'SF',
}

export type ScoringPresetSelectorProps = {
  sport: string
  value: string | null
  onChange: (value: string | null) => void
  lockedVariantLabel?: string | null
  leagueType?: LeagueTypeId | null
}

/**
 * Scoring preset (e.g. Standard, PPR, IDP for NFL). Drives roster and scoring defaults.
 */
export function ScoringPresetSelector({
  sport,
  value,
  onChange,
  lockedVariantLabel = null,
  leagueType = null,
}: ScoringPresetSelectorProps) {
  const { rules } = useSportRules(sport, value)
  const isSurvivor = leagueType === 'survivor'
  const isZombie = leagueType === 'zombie'

  if (lockedVariantLabel) {
    return (
      <div className="space-y-5 rounded-2xl border border-cyan-400/12 bg-[#0a1228]/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm sm:p-5">
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

  const allVariants = isZombie ? getZombieScoringVariants(sport) : getVariantsForSport(sport)
  const variants = isSurvivor
    ? allVariants.filter((v) => !SURVIVOR_HIDDEN_PRESETS.has(v.value))
    : allVariants

  const displayVariants = isSurvivor
    ? variants.map((v) => ({
        ...v,
        label: SURVIVOR_PRESET_LABELS[v.value] ?? v.label,
      }))
    : variants

  const defaultZombie = displayVariants[0]?.value ?? 'PPR'
  const safeValue = variants.some((v) => v.value === (value ?? ''))
    ? (value ?? variants[0]?.value)
    : (variants[0]?.value ?? (isZombie ? defaultZombie : 'STANDARD'))
  const [selectedPresetValues, setSelectedPresetValues] = useState<string[]>(() =>
    safeValue ? [safeValue] : []
  )

  useEffect(() => {
    setSelectedPresetValues(safeValue ? [safeValue] : [])
  }, [safeValue, sport])

  const valueSet = useMemo(() => new Set(selectedPresetValues), [selectedPresetValues])

  const priority = isSurvivor
    ? ['SUPERFLEX', 'HALF_PPR', 'PPR', 'STANDARD']
    : ['DYNASTY_IDP', 'IDP', 'SUPERFLEX', 'HALF_PPR', 'PPR', 'STANDARD']

  const resolvePrimaryPreset = (values: string[]): string | null => {
    if (values.length === 0) return null
    for (const p of priority) {
      if (values.includes(p)) return p
    }
    return values[values.length - 1] ?? null
  }

  const togglePreset = (presetValue: string) => {
    if (isZombie) {
      setSelectedPresetValues([presetValue])
      onChange(presetValue)
      return
    }
    const next = valueSet.has(presetValue)
      ? selectedPresetValues.filter((v) => v !== presetValue)
      : [...selectedPresetValues, presetValue]
    setSelectedPresetValues(next)
    const primary = resolvePrimaryPreset(next)
    onChange(primary)
  }

  return (
    <div className="space-y-5 rounded-2xl border border-cyan-400/12 bg-[#0a1228]/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm sm:p-5">
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
        <div
          className="mt-2 flex flex-wrap gap-2"
          role="group"
          aria-label="Preset"
          data-testid="league-creation-preset-selector"
        >
          {displayVariants.map(({ value: presetValue, label: presetLabel }) => {
            const selected = valueSet.has(presetValue)
            return (
              <button
                key={presetValue}
                type="button"
                onClick={() => togglePreset(presetValue)}
                className={`min-h-[40px] rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${
                  selected
                    ? 'border-cyan-300 bg-cyan-400/15 text-white shadow-[0_0_0_1px_rgba(0,255,220,0.2)_inset]'
                    : 'border-white/15 bg-black/30 text-white/85 hover:bg-white/[0.06]'
                }`}
              >
                {presetLabel}
              </button>
            )
          })}
        </div>
        {!isZombie ? (
          <p className="text-white/50 text-xs mt-2">
            Toggle one or more presets. We apply the highest-priority compatible preset to creation defaults.
          </p>
        ) : null}
        {rules && (
          <div className="mt-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white/65">
            <p>
              Player pool: <span className="text-white/90">Integrated platform player data</span>
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
