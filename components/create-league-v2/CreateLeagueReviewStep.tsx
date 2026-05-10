'use client'

import { useMemo } from 'react'
import type { AccentTone } from '@/lib/create-league-v2/theme'
import type { CreateLeagueV2State } from '@/lib/create-league-v2/state'
import { getEffectiveLeagueType, isDynastyConcept } from '@/lib/create-league-v2/state'
import { LEAGUE_TYPE_LABELS } from '@/lib/league-creation-wizard/league-type-registry'
import { getDraftTypeOptions } from '@/lib/create-league-v2/rules-engine'
import { listScoringPresetOptions } from '@/lib/league-creation-preset/scoring-presets'
import { GlassCard, SectionHeader } from '@/components/create-league-v2/primitives'
import { useLanguage } from '@/components/i18n/LanguageProviderClient'
import { localizeDraftTypeOption } from '@/lib/i18n/createLeagueWire'

const RANK_WINDOW_MESSAGE = 'Rank window will be calculated after creation.'

function normalizeVisibilityLabel(state: CreateLeagueV2State): string {
  const leagueType = getEffectiveLeagueType(state)
  if (leagueType === 'best_ball') {
    return state.bestBall.visibility === 'public' ? 'Public' : 'Private'
  }
  if (leagueType && isDynastyConcept(leagueType)) {
    return state.dynasty.visibility === 'public' ? 'Public' : 'Private'
  }
  return 'Private (default)'
}

function resolveRankWindowLabel(): string {
  return RANK_WINDOW_MESSAGE
}

function resolveCreationModeLabel(state: CreateLeagueV2State): string {
  return state.creationMode === 'advanced' ? 'Advanced Commissioner Mode' : 'Quick Create'
}

export function CreateLeagueReviewStep({
  state,
  accent,
}: {
  state: CreateLeagueV2State
  accent: AccentTone
}) {
  const { t } = useLanguage()
  const leagueType = getEffectiveLeagueType(state)

  const conceptLabel = useMemo(() => {
    if (state.idpSelected) return 'IDP'
    if (!leagueType) return '-'
    const key = `createLeague.concept.${leagueType}.title`
    const translated = t(key)
    return translated === key ? LEAGUE_TYPE_LABELS[leagueType] ?? leagueType : translated
  }, [leagueType, state.idpSelected, t])

  const sportLabel = state.sport === 'SOCCER' ? t('createLeague.sport.soccer') : state.sport

  const draftLabel = useMemo(() => {
    if (!leagueType) return '-'
    const option = getDraftTypeOptions(leagueType, state.sport).find((item) => item.id === state.draftType)
    if (!option) return state.draftType
    return localizeDraftTypeOption(t, option).label
  }, [leagueType, state.sport, state.draftType, t])

  const scoringLabel = useMemo(() => {
    if (!leagueType) return '-'
    return (
      listScoringPresetOptions({
        leagueType,
        sport: state.sport,
        idpSelected: state.idpSelected,
      }).find((preset) => preset.id === state.scoringPresetId)?.label ?? state.scoringPresetId ?? '-'
    )
  }, [leagueType, state.sport, state.idpSelected, state.scoringPresetId])

  const rows: Array<{ label: string; value: string }> = [
    { label: 'Creation Mode', value: resolveCreationModeLabel(state) },
    { label: 'Concept', value: conceptLabel },
    { label: 'Sport', value: sportLabel },
    { label: 'Draft Type', value: draftLabel },
    { label: 'Scoring Preset', value: scoringLabel || '-' },
    { label: 'League Name', value: state.name.trim() || '-' },
    { label: 'Team Count', value: String(state.teamCount) },
    { label: 'Timezone', value: state.timezone || 'America/New_York' },
    { label: 'Visibility', value: normalizeVisibilityLabel(state) },
    { label: 'Creator Rank Window', value: resolveRankWindowLabel() },
  ]

  return (
    <GlassCard>
      <SectionHeader
        title="Review"
        hint="Final pre-submit snapshot of concept, constraints, and visibility."
      />
      <div className="divide-y divide-white/[0.06] rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-3 py-2.5">
            <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/45">{row.label}</dt>
            <dd className={`max-w-[65%] text-right text-sm font-medium ${accent.text}`}>{row.value}</dd>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}
