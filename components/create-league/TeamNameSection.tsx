'use client'

import { useMemo } from 'react'
import type { AccentTone } from '@/lib/create-league-v2/theme'
import type { CreateLeagueV2State } from '@/lib/create-league-v2/state'
import { getEffectiveLeagueType } from '@/lib/create-league-v2/state'
import { getTeamCountOptions, getSurvivorTribeOptions } from '@/lib/create-league-v2/rules-engine'
import { buildSuggestedLeagueName } from '@/lib/create-league-v2/suggested-league-name'
import { GlassCard, SectionHeader, PillRow } from '@/components/create-league-v2/primitives'

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
  const effectiveType = getEffectiveLeagueType(state)
  const teamCountOptions = useMemo(() => {
    if (!effectiveType || !state.sport) return []
    return getTeamCountOptions(state.sport, effectiveType, state.soccerPipeline)
  }, [effectiveType, state.sport, state.soccerPipeline])
  const isTournament = effectiveType === 'tournament'
  const isSurvivor = effectiveType === 'survivor'

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
      <SectionHeader
        title="3 · Teams & league name"
        hint="Even team counts within your sport’s cap. Name auto-fills — edit anytime."
      />
      <PillRow
        options={teamCountOptions}
        value={
          teamCountOptions.includes(state.teamCount)
            ? state.teamCount
            : teamCountOptions[0] ?? state.teamCount
        }
        onChange={(teamCount) => onChange({ teamCount, nameTouched: false })}
        accent={accent}
        ariaLabel={isTournament ? 'Tournament pool size' : 'Number of teams'}
      />
      {teamCountError ? (
        <p className="mt-2 text-xs text-rose-300/90" role="alert">
          {teamCountError}
        </p>
      ) : null}
      {isTournament ? (
        <p className="mt-3 text-[11px] text-white/40">
          {state.teamCount} managers ≈ {Math.floor(state.teamCount / 12)} feeder leagues of 12 teams each.
        </p>
      ) : null}

      {isSurvivor ? (
        <div className="mt-5">
          <SectionHeader title="Starting tribes" hint="Must divide evenly into your cast size." />
          <PillRow
            options={survivorTribes}
            value={
              survivorTribes.includes(state.survivorTribeCount)
                ? state.survivorTribeCount
                : survivorTribes[0] ?? 2
            }
            onChange={(survivorTribeCount) => onChange({ survivorTribeCount })}
            accent={accent}
            ariaLabel="Survivor tribe count"
          />
        </div>
      ) : null}

      <div className="mt-6">
        <label
          htmlFor="create-league-name"
          className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-white/45"
        >
          League name
        </label>
        <input
          id="create-league-name"
          type="text"
          value={state.name}
          onChange={(e) => onChange({ name: e.target.value, nameTouched: true })}
          placeholder={suggested || 'Name your league'}
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
