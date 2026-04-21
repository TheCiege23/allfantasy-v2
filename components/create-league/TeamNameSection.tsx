'use client'

import { useMemo } from 'react'
import type { AccentTone } from '@/lib/create-league-v2/theme'
import type { CreateLeagueV2State } from '@/lib/create-league-v2/state'
import { getEffectiveLeagueType } from '@/lib/create-league-v2/state'
import { getTeamCountOptions, getSurvivorTribeOptions } from '@/lib/create-league-v2/rules-engine'
import { buildSuggestedLeagueName } from '@/lib/create-league-v2/suggested-league-name'
import { getGuillotineSportConfig } from '@/lib/guillotine/sportConfig'
import { GlassCard, SectionHeader, PillRow } from '@/components/create-league-v2/primitives'
import { useLanguage } from '@/components/i18n/LanguageProviderClient'

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

export function TeamNameSection({
  state,
  accent,
  onChange,
  commissionerFirstName,
  teamCountError,
  leagueNameError,
}: {
  state: CreateLeagueV2State
  accent: AccentTone
  onChange: (patch: Partial<CreateLeagueV2State>) => void
  commissionerFirstName?: string
  teamCountError?: string
  leagueNameError?: string
}) {
  const { t, tInterpolate } = useLanguage()
  const effectiveType = getEffectiveLeagueType(state)
  const teamCountOptions = useMemo(() => {
    if (!effectiveType || !state.sport) return []
    return getTeamCountOptions(state.sport, effectiveType, state.soccerPipeline)
  }, [effectiveType, state.sport, state.soccerPipeline])
  const isTournament = effectiveType === 'tournament'
  const isSurvivor = effectiveType === 'survivor'
  const isGuillotine = effectiveType === 'guillotine'
  const guillotineProfile = isGuillotine ? getGuillotineSportConfig(state.sport) : undefined

  const survivorTribes = isSurvivor ? getSurvivorTribeOptions(state.teamCount) : []

  const suggested = effectiveType
    ? buildSuggestedLeagueName({
        leagueType: effectiveType,
        sport: state.sport,
        teamCount: state.teamCount,
        idpSelected: state.idpSelected,
        commissionerFirstName,
      })
    : ''

  const unlocked = Boolean(effectiveType && state.scoringPresetId)

  return (
    <GlassCard className={!unlocked ? 'pointer-events-none opacity-40' : ''}>
      <SectionHeader title={t('createLeague.section.teamTitle')} hint={t('createLeague.section.teamHint')} />
      <PillRow
        options={teamCountOptions}
        value={
          teamCountOptions.includes(state.teamCount)
            ? state.teamCount
            : teamCountOptions[0] ?? state.teamCount
        }
        onChange={(teamCount) => onChange({ teamCount, nameTouched: false })}
        accent={accent}
        ariaLabel={isTournament ? t('createLeague.team.ariaTournamentSize') : t('createLeague.team.ariaTeamCount')}
      />
      {teamCountError ? (
        <p className="mt-2 text-xs text-rose-300/90" role="alert">
          {teamCountError}
        </p>
      ) : null}
      {isTournament ? (
        <p className="mt-3 text-[11px] text-white/40">
          {tInterpolate('createLeague.team.tournamentApprox', {
            n: state.teamCount,
            feeder: Math.floor(state.teamCount / 12),
          })}
        </p>
      ) : null}

      {isGuillotine && guillotineProfile ? (
        <div className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-900/10 px-3 py-2 text-[11px] text-rose-100/85">
          <p className="font-semibold uppercase tracking-[0.15em] text-rose-200/90">
            {t('createLeague.team.guillotineTitle')}
          </p>
          <p className="mt-1">{t('createLeague.team.guillotineBody')}</p>
          <p className="mt-1 text-rose-100/75">
            {tInterpolate('createLeague.team.guillotineMeta', {
              weeks: guillotineProfile.regularSeasonWeeks,
              chopDay: t(`createLeague.team.weekday.${WEEKDAY_KEYS[guillotineProfile.chopDay] ?? 'sun'}`),
              waiverDay: t(`createLeague.team.weekday.${WEEKDAY_KEYS[guillotineProfile.waiverDay] ?? 'sun'}`),
              daily: guillotineProfile.dailyGames
                ? t('createLeague.team.guillotineDaily')
                : t('createLeague.team.guillotineNotDaily'),
            })}
          </p>
        </div>
      ) : null}

      {isSurvivor ? (
        <div className="mt-5">
          <SectionHeader
            title={t('createLeague.team.survivorTribesTitle')}
            hint={t('createLeague.team.survivorTribesHint')}
          />
          <PillRow
            options={survivorTribes}
            value={
              survivorTribes.includes(state.survivorTribeCount)
                ? state.survivorTribeCount
                : survivorTribes[0] ?? 2
            }
            onChange={(survivorTribeCount) => onChange({ survivorTribeCount })}
            accent={accent}
            ariaLabel={t('createLeague.team.ariaSurvivorTribes')}
          />
        </div>
      ) : null}

      <div className="mt-6">
        <label
          htmlFor="create-league-name"
          className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-white/45"
        >
          {t('createLeague.team.leagueName')}
        </label>
        <input
          id="create-league-name"
          type="text"
          value={state.name}
          onChange={(e) => onChange({ name: e.target.value, nameTouched: true })}
          placeholder={suggested || t('createLeague.team.namePlaceholder')}
          maxLength={100}
          autoComplete="off"
          className="w-full rounded-2xl border border-white/[0.10] bg-black/30 px-4 py-3 text-sm text-white outline-none ring-0 placeholder:text-white/30 focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-500/20"
        />
        {leagueNameError ? (
          <p className="mt-2 text-xs text-rose-300/90" role="alert">
            {leagueNameError}
          </p>
        ) : null}
      </div>
    </GlassCard>
  )
}
