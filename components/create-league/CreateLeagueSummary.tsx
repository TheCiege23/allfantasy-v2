'use client'

import { useMemo } from 'react'
import type { AccentTone } from '@/lib/create-league-v2/theme'
import type { CreateLeagueV2State } from '@/lib/create-league-v2/state'
import { getEffectiveLeagueType } from '@/lib/create-league-v2/state'
import { LEAGUE_TYPE_LABELS } from '@/lib/league-creation-wizard/league-type-registry'
import { listScoringPresetOptions } from '@/lib/league-creation-preset/scoring-presets'
import { getDraftTypeOptions } from '@/lib/create-league-v2/rules-engine'
import { GLASS_SURFACE } from '@/lib/create-league-v2/theme'
import { useLanguage } from '@/components/i18n/LanguageProviderClient'
import { localizeDraftTypeOption } from '@/lib/i18n/createLeagueWire'

const SPORT_LABELS: Record<string, string> = {
  NFL: 'NFL',
  NBA: 'NBA',
  MLB: 'MLB',
  NHL: 'NHL',
  NCAAF: 'NCAAF',
  NCAAB: 'NCAAB',
  SOCCER: 'Soccer',
}

/**
 * Live summary panel — aligned with AI tool hub: glass surface + soft cyan edge.
 */
export function CreateLeagueSummary({
  state,
  accent,
}: {
  state: CreateLeagueV2State
  accent: AccentTone
}) {
  const { t } = useLanguage()
  const lt = getEffectiveLeagueType(state)
  const presetLabel =
    lt &&
    listScoringPresetOptions({ leagueType: lt, sport: state.sport, idpSelected: state.idpSelected }).find(
      (p) => p.id === state.scoringPresetId,
    )?.label
  const draftOpts = lt ? getDraftTypeOptions(lt, state.sport) : []
  const draftLabel = useMemo(() => {
    const raw = draftOpts.find((d) => d.id === state.draftType)
    if (!raw) return state.draftType
    return localizeDraftTypeOption(t, raw).label
  }, [draftOpts, state.draftType, t])

  const conceptLabel = useMemo(() => {
    if (state.idpSelected) return t('createLeague.summary.idpNfl')
    if (!lt) return '—'
    const ck = `createLeague.concept.${lt}.title`
    const tv = t(ck)
    return tv === ck ? (LEAGUE_TYPE_LABELS[lt] ?? lt) : tv
  }, [state.idpSelected, lt, t])

  const sportLabel = state.sport === 'SOCCER' ? t('createLeague.sport.soccer') : SPORT_LABELS[state.sport] ?? state.sport
  const bestBallLabel =
    lt === 'best_ball'
      ? `${state.bestBall.mode === 'underdog' ? 'Underdog-style' : 'Standard'} · ${state.bestBall.matchupFormat === 'cumulative' ? 'Cumulative' : 'H2H'}`
      : null

  return (
    <aside
      className={`${GLASS_SURFACE} relative overflow-hidden border-cyan-500/15 p-5 shadow-[0_0_60px_-20px_rgba(34,211,238,0.12)] sm:p-6 lg:sticky lg:top-24`}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/35 to-transparent"
        aria-hidden
      />
      <p className={`text-[11px] font-bold uppercase tracking-[0.22em] ${accent.text}`}>{t('createLeague.summary.title')}</p>
      <h2 className="mt-2 text-lg font-bold tracking-tight text-white">{t('createLeague.summary.heading')}</h2>
      <p className="mt-1 text-xs leading-relaxed text-white/45">{t('createLeague.summary.blurb')}</p>

      <dl className="mt-5 space-y-3 text-sm">
        <div className="flex justify-between gap-3 border-b border-white/[0.06] pb-2">
          <dt className="text-white/45">{t('createLeague.summary.concept')}</dt>
          <dd className="text-right font-medium text-white/90">{conceptLabel}</dd>
        </div>
        <div className="flex justify-between gap-3 border-b border-white/[0.06] pb-2">
          <dt className="text-white/45">{t('createLeague.summary.sport')}</dt>
          <dd className="text-right font-medium text-white/90">{sportLabel}</dd>
        </div>
        <div className="flex justify-between gap-3 border-b border-white/[0.06] pb-2">
          <dt className="text-white/45">{t('createLeague.summary.scoring')}</dt>
          <dd className="max-w-[58%] text-right font-medium text-white/90">{presetLabel ?? '—'}</dd>
        </div>
        <div className="flex justify-between gap-3 border-b border-white/[0.06] pb-2">
          <dt className="text-white/45">{lt === 'tournament' ? t('createLeague.summary.pool') : t('createLeague.summary.teams')}</dt>
          <dd className="text-right font-medium text-white/90">{state.teamCount}</dd>
        </div>
        <div className="flex justify-between gap-3 border-b border-white/[0.06] pb-2">
          <dt className="text-white/45">{t('createLeague.summary.name')}</dt>
          <dd className="max-w-[60%] truncate text-right font-medium text-cyan-100/95" title={state.name}>
            {state.name.trim() || '—'}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-white/45">{t('createLeague.summary.draft')}</dt>
          <dd className="text-right font-medium text-white/90">{draftLabel}</dd>
        </div>
        {bestBallLabel ? (
          <div className="flex justify-between gap-3 border-t border-white/[0.06] pt-2">
            <dt className="text-white/45">Best Ball</dt>
            <dd className="text-right font-medium text-white/90">{bestBallLabel}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-5 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3 text-[11px] leading-relaxed text-white/40">
        {t('createLeague.summary.footer')}
      </div>
    </aside>
  )
}
