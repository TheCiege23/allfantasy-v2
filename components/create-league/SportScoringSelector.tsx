'use client'

import { useMemo } from 'react'
import type { AccentTone } from '@/lib/create-league-v2/theme'
import type { CreateLeagueV2State, SoccerPipeline, SupportedSport } from '@/lib/create-league-v2/state'
import { SUPPORTED_SPORTS, getEffectiveLeagueType } from '@/lib/create-league-v2/state'
import {
  getDefaultTeamCount,
  getScoringPresetOptionsForSelection,
  isIdpAvailableForSport,
  isSportAllowedForType,
  resolveValidDraftTypeForSelection,
  resolveValidScoringPresetIdForSelection,
} from '@/lib/create-league-v2/rules-engine'
import { GlassCard, SectionHeader, SelectableCard, Segmented } from '@/components/create-league-v2/primitives'
import { useLanguage } from '@/components/i18n/LanguageProviderClient'

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
  const { t } = useLanguage()
  const effectiveType = getEffectiveLeagueType(state)
  const presetCtx = useMemo(
    () =>
      effectiveType
        ? { leagueType: effectiveType, sport: state.sport, idpSelected: state.idpSelected }
        : null,
    [effectiveType, state.sport, state.idpSelected],
  )

  const scoringOptions = useMemo(() => {
    if (!presetCtx) return []
    return getScoringPresetOptionsForSelection(presetCtx)
  }, [presetCtx?.leagueType, presetCtx?.sport, presetCtx?.idpSelected, state.idpSelected])

  const isSoccer = state.sport === 'SOCCER'

  function handleSportChange(sport: SupportedSport) {
    const patch: Partial<CreateLeagueV2State> = { sport }
    patch.soccerPipeline = sport === 'SOCCER' ? 'euro' : null
    const nextSoccerPipeline = patch.soccerPipeline
    const nextIdpSelected = state.idpSelected && isIdpAvailableForSport(sport)
    if (state.idpSelected && !isIdpAvailableForSport(sport)) {
      patch.idpSelected = false
    }
    if (effectiveType) {
      patch.teamCount = getDefaultTeamCount(sport, effectiveType, nextSoccerPipeline)
      patch.draftType = resolveValidDraftTypeForSelection({
        leagueType: effectiveType,
        sport,
        idpSelected: nextIdpSelected,
        currentDraftType: state.draftType,
      })
      patch.scoringPresetId = resolveValidScoringPresetIdForSelection(state.scoringPresetId, {
        leagueType: effectiveType,
        sport,
        idpSelected: nextIdpSelected,
      })
    }
    patch.nameTouched = false
    onChange(patch)
  }

  return (
    <GlassCard className={!effectiveType ? 'pointer-events-none opacity-40' : ''}>
      <SectionHeader
        title={t('createLeague.section.sportTitle')}
        hint={t('createLeague.section.sportHint')}
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
              title={sport === 'SOCCER' ? t('createLeague.sport.soccer') : SPORT_LABELS[sport]}
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
          <SectionHeader
            title={t('createLeague.section.soccerRegionTitle')}
            hint={t('createLeague.section.soccerRegionHint')}
          />
          <Segmented
            options={[
              { value: 'mls' as const, label: t('createLeague.sport.mls.label'), hint: t('createLeague.sport.mls.hint') },
              { value: 'euro' as const, label: t('createLeague.sport.euro.label'), hint: t('createLeague.sport.euro.hint') },
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
            ariaLabel={t('createLeague.sport.ariaRegion')}
          />
        </div>
      ) : null}

      {effectiveType && presetCtx ? (
        <div className="mt-6">
          <SectionHeader
            title={t('createLeague.section.scoringPresetTitle')}
            hint={t('createLeague.section.scoringPresetHint')}
          />
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
