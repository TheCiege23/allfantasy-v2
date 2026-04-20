'use client'

import { useEffect, useMemo } from 'react'
import type { AccentTone } from '@/lib/create-league-v2/theme'
import type { CreateLeagueV2State, SoccerPipeline, SupportedSport } from '@/lib/create-league-v2/state'
import { SUPPORTED_SPORTS, getEffectiveLeagueType } from '@/lib/create-league-v2/state'
import {
  getDefaultScoringPresetId,
  isScoringPresetValidForContext,
  listScoringPresetOptions,
} from '@/lib/league-creation-preset/scoring-presets'
import {
  getDefaultTeamCount,
  isIdpAvailableForSport,
  isSportAllowedForType,
} from '@/lib/create-league-v2/rules-engine'
import { GlassCard, SectionHeader, SelectableCard, Segmented } from '@/components/create-league-v2/primitives'

const SPORT_ICONS: Record<SupportedSport, string> = {
  NFL: '🏈',
  NBA: '🏀',
  MLB: '⚾',
  NHL: '🏒',
  NCAAF: '🏟',
  NCAAB: '🎓',
  SOCCER: '⚽',
}

const SPORT_LABELS: Record<SupportedSport, string> = {
  NFL: 'NFL',
  NBA: 'NBA',
  MLB: 'MLB',
  NHL: 'NHL',
  NCAAF: 'NCAAF',
  NCAAB: 'NCAAB',
  SOCCER: 'Soccer',
}

export function SportScoringSelector({
  state,
  accent,
  onChange,
  sportError,
  scoringError,
}: {
  state: CreateLeagueV2State
  accent: AccentTone
  onChange: (patch: Partial<CreateLeagueV2State>) => void
  sportError?: string
  scoringError?: string
}) {
  const effectiveType = getEffectiveLeagueType(state)
  const presetCtx = effectiveType
    ? { leagueType: effectiveType, sport: state.sport, idpSelected: state.idpSelected }
    : null

  const scoringOptions = useMemo(
    () => (presetCtx ? listScoringPresetOptions(presetCtx) : []),
    [presetCtx?.leagueType, presetCtx?.sport, presetCtx?.idpSelected],
  )

  useEffect(() => {
    if (!presetCtx) return
    if (!state.scoringPresetId || !isScoringPresetValidForContext(state.scoringPresetId, presetCtx)) {
      onChange({ scoringPresetId: getDefaultScoringPresetId(presetCtx) })
    }
  }, [presetCtx, state.scoringPresetId, onChange])

  const isSoccer = state.sport === 'SOCCER'

  function handleSportChange(sport: SupportedSport) {
    const patch: Partial<CreateLeagueV2State> = { sport }
    patch.soccerPipeline = sport === 'SOCCER' ? 'euro' : null
    if (state.idpSelected && !isIdpAvailableForSport(sport)) {
      patch.idpSelected = false
    }
    if (effectiveType) {
      patch.teamCount = getDefaultTeamCount(sport, effectiveType, patch.soccerPipeline ?? null)
    }
    patch.nameTouched = false
    onChange(patch)
  }

  return (
    <GlassCard className={!effectiveType ? 'pointer-events-none opacity-40' : ''}>
      <SectionHeader
        title="2 · Sport & scoring preset"
        hint="Pick a sport, then choose a scoring curve tuned for this concept."
      />
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {SUPPORTED_SPORTS.map((sport) => {
          const disabled =
            !effectiveType ||
            (state.idpSelected ? !isIdpAvailableForSport(sport) : !isSportAllowedForType(sport, effectiveType))
          return (
            <SelectableCard
              key={sport}
              selected={state.sport === sport}
              disabled={disabled}
              onClick={() => handleSportChange(sport)}
              accent={accent}
              title={SPORT_LABELS[sport]}
              icon={<span className="text-lg">{SPORT_ICONS[sport]}</span>}
            />
          )
        })}
      </div>
      {sportError ? (
        <p className="mt-2 text-xs text-rose-300/90" role="alert">
          {sportError}
        </p>
      ) : null}

      {isSoccer && effectiveType ? (
        <div className="mt-5">
          <SectionHeader title="Soccer region" hint="MLS vs European data pipelines." />
          <Segmented
            options={[
              { value: 'mls' as const, label: 'MLS', hint: 'North America' },
              { value: 'euro' as const, label: 'European', hint: 'Top 5 leagues' },
            ]}
            value={state.soccerPipeline ?? 'euro'}
            onChange={(v) => {
              const nextPipeline = v as SoccerPipeline
              const patch: Partial<CreateLeagueV2State> = { soccerPipeline: nextPipeline, nameTouched: false }
              const max = nextPipeline === 'euro' ? 96 : 30
              if (state.teamCount > max && effectiveType) {
                patch.teamCount = getDefaultTeamCount('SOCCER', effectiveType, nextPipeline)
              }
              onChange(patch)
            }}
            accent={accent}
            ariaLabel="Soccer data region"
          />
        </div>
      ) : null}

      {effectiveType && presetCtx ? (
        <div className="mt-6">
          <SectionHeader title="Scoring preset" hint="Real scoring rules — tune further in League Settings." />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {scoringOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange({ scoringPresetId: opt.id })}
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  state.scoringPresetId === opt.id
                    ? `border-white/25 bg-white/[0.07] ring-2 ${accent.ring} ${accent.glow}`
                    : 'border-white/[0.08] bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.05]'
                }`}
              >
                <div className="text-sm font-semibold text-white/95">{opt.label}</div>
                <div className="mt-1 text-[11px] leading-snug text-white/45">{opt.hint}</div>
              </button>
            ))}
          </div>
          {scoringError ? (
            <p className="mt-2 text-xs text-rose-300/90" role="alert">
              {scoringError}
            </p>
          ) : null}
        </div>
      ) : null}
    </GlassCard>
  )
}
