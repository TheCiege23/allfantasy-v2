'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import type { LeagueTypeId } from '@/lib/league-creation-wizard/types'
import type { AccentTone } from '@/lib/create-league-v2/theme'
import { LEAGUE_TYPE_MEDIA } from '@/lib/create-league-v2/theme'
import type { CreateLeagueV2State, SoccerPipeline, SupportedSport } from '@/lib/create-league-v2/state'
import { SUPPORTED_SPORTS, getEffectiveLeagueType } from '@/lib/create-league-v2/state'
import {
  getTeamCountOptions,
  getDefaultTeamCount,
  getDraftTypeOptions,
  getSurvivorTribeOptions,
  isThirdRoundReversalAvailable,
  isIdpAvailableForSport,
  isSportAllowedForType,
  isDraftTypeAllowedForType,
} from '@/lib/create-league-v2/rules-engine'
import {
  getDefaultScoringPresetId,
  isScoringPresetValidForContext,
  listScoringPresetOptions,
} from '@/lib/league-creation-preset/scoring-presets'
import { buildSuggestedLeagueName } from '@/lib/create-league-v2/suggested-league-name'
import {
  GlassCard,
  PillRow,
  SectionHeader,
  SelectableCard,
  Toggle,
  Segmented,
} from './primitives'

type LeagueTypeCard = {
  id: LeagueTypeId | 'idp'
  title: string
  subtitle: string
  icon: string
}

const LEAGUE_TYPES: LeagueTypeCard[] = [
  { id: 'redraft', title: 'Redraft', subtitle: 'Fresh draft every season', icon: '◆' },
  { id: 'dynasty', title: 'Dynasty', subtitle: 'Keep your core forever', icon: '♔' },
  { id: 'keeper', title: 'Keeper', subtitle: 'Hold a few, draft the rest', icon: '⬡' },
  { id: 'best_ball', title: 'Best Ball', subtitle: 'Set and forget', icon: '◉' },
  { id: 'idp', title: 'IDP', subtitle: 'Individual defensive players', icon: '🛡' },
  { id: 'salary_cap', title: 'Salary Cap', subtitle: 'Budget-based rosters', icon: '$' },
  { id: 'devy', title: 'Devy', subtitle: 'Draft college prospects', icon: '✦' },
  { id: 'c2c', title: 'C2C', subtitle: 'College to pros', icon: '⇄' },
  { id: 'guillotine', title: 'Guillotine', subtitle: 'Lowest score is eliminated', icon: '✕' },
  { id: 'zombie', title: 'Zombie', subtitle: 'Infection-style survival', icon: '☣' },
  { id: 'survivor', title: 'Survivor', subtitle: 'Vote players off', icon: '⚑' },
  { id: 'tournament', title: 'Tournament', subtitle: 'Bracket-style playoffs', icon: '⚔' },
  { id: 'big_brother', title: 'Big Brother', subtitle: 'Weekly nominations', icon: '◎' },
]

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

function isCardSelected(card: LeagueTypeCard, state: CreateLeagueV2State): boolean {
  if (card.id === 'idp') return state.idpSelected
  return state.leagueType === card.id && !state.idpSelected
}

export function CreateLeagueUnifiedForm({
  state,
  accent,
  onChange,
  onDraftSectionVisible,
}: {
  state: CreateLeagueV2State
  accent: AccentTone
  onChange: (patch: Partial<CreateLeagueV2State>) => void
  onDraftSectionVisible?: (visible: boolean) => void
}) {
  const { data: session } = useSession()
  const draftSectionRef = useRef<HTMLDivElement | null>(null)
  const [draftInView, setDraftInView] = useState(false)

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

  const firstName = useMemo(() => {
    const n = session?.user?.name?.trim()
    if (!n) return undefined
    return n.split(/\s+/)[0]
  }, [session?.user?.name])

  useEffect(() => {
    if (!effectiveType || state.nameTouched) return
    const suggested = buildSuggestedLeagueName({
      leagueType: effectiveType,
      sport: state.sport,
      teamCount: state.teamCount,
      idpSelected: state.idpSelected,
      commissionerFirstName: firstName,
    })
    if (suggested && suggested !== state.name) {
      onChange({ name: suggested })
    }
  }, [effectiveType, state.sport, state.teamCount, state.idpSelected, state.nameTouched, firstName])

  const teamCountOptions = useMemo(
    () =>
      effectiveType ? getTeamCountOptions(state.sport, effectiveType, state.soccerPipeline) : [],
    [state.sport, effectiveType, state.soccerPipeline],
  )

  const draftOptions = useMemo(
    () => (effectiveType ? getDraftTypeOptions(effectiveType, state.sport) : []),
    [effectiveType, state.sport],
  )

  const survivorTribes = useMemo(
    () => (effectiveType === 'survivor' ? getSurvivorTribeOptions(state.teamCount) : []),
    [effectiveType, state.teamCount],
  )

  const isSnake = state.draftType === 'snake'
  const isTournament = effectiveType === 'tournament'
  const isSurvivor = effectiveType === 'survivor'
  const isSoccer = state.sport === 'SOCCER'

  useEffect(() => {
    const el = draftSectionRef.current
    if (!el || !onDraftSectionVisible) return
    const io = new IntersectionObserver(
      ([e]) => {
        const v = (e?.intersectionRatio ?? 0) > 0.25
        setDraftInView(v)
        onDraftSectionVisible(v)
      },
      { threshold: [0, 0.15, 0.25, 0.5, 0.75] },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [onDraftSectionVisible])

  function handleLeagueTypeSelect(card: LeagueTypeCard) {
    const patch: Partial<CreateLeagueV2State> = {}

    if (card.id === 'idp') {
      patch.idpSelected = true
      patch.leagueType = 'redraft'
      if (!isIdpAvailableForSport(state.sport)) {
        patch.sport = 'NFL'
        patch.soccerPipeline = null
      }
    } else {
      const selectedLeagueType: LeagueTypeId = card.id
      patch.idpSelected = false
      patch.leagueType = selectedLeagueType
      if (!isSportAllowedForType(state.sport, selectedLeagueType)) {
        const fallback = SUPPORTED_SPORTS.find((s) => isSportAllowedForType(s, selectedLeagueType))
        if (fallback) {
          patch.sport = fallback
          patch.soccerPipeline = fallback === 'SOCCER' ? 'euro' : null
        }
      }
    }

    const nextType = card.id === 'idp' ? 'redraft' : card.id
    if (!isDraftTypeAllowedForType(state.draftType, nextType)) {
      const firstAllowed = getDraftTypeOptions(nextType)
      patch.draftType = firstAllowed[0]?.id ?? 'snake'
    }

    const nextSport = (patch.sport ?? state.sport) as SupportedSport
    const nextPipeline = patch.soccerPipeline ?? state.soccerPipeline
    patch.teamCount = getDefaultTeamCount(nextSport, nextType, nextPipeline)
    patch.nameTouched = false
    onChange(patch)
  }

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

  const reveal = (open: boolean) => ({
    initial: { opacity: 0, y: 10 },
    animate: { opacity: open ? 1 : 0.35, y: open ? 0 : 6 },
    transition: { duration: 0.35 },
  })

  return (
    <div className="space-y-5">
      {/* 1. League concept */}
      <GlassCard>
        <SectionHeader
          title="1 · League concept"
          hint="Choose your format first — it unlocks sports, scoring, and draft options."
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {LEAGUE_TYPES.map((card) => (
            <SelectableCard
              key={card.id}
              selected={isCardSelected(card, state)}
              onClick={() => handleLeagueTypeSelect(card)}
              accent={accent}
              title={card.title}
              subtitle={card.subtitle}
              icon={card.icon}
            />
          ))}
        </div>
        {effectiveType ? (
          <p className="mt-4 text-[11px] text-white/35">
            Preview:{' '}
            <span className="text-white/55">
              {(state.idpSelected ? LEAGUE_TYPE_MEDIA.idp : LEAGUE_TYPE_MEDIA[effectiveType])?.video ? 'Video loop active for this concept.' : 'Gradient fallback.'}
            </span>
          </p>
        ) : null}
      </GlassCard>

      {/* 2. Sport + scoring preset */}
      <motion.section {...reveal(Boolean(effectiveType))}>
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
            </div>
          ) : null}
        </GlassCard>
      </motion.section>

      {/* 3. Teams + name */}
      <motion.section {...reveal(Boolean(effectiveType && state.scoringPresetId))}>
        <GlassCard className={!effectiveType || !state.scoringPresetId ? 'pointer-events-none opacity-40' : ''}>
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
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-white/45">
              League name
            </label>
            <input
              type="text"
              value={state.name}
              onChange={(e) => onChange({ name: e.target.value, nameTouched: true })}
              placeholder={effectiveType ? buildSuggestedLeagueName({
                leagueType: effectiveType,
                sport: state.sport,
                teamCount: state.teamCount,
                idpSelected: state.idpSelected,
                commissionerFirstName: firstName,
              }) : 'Name your league'}
              maxLength={100}
              className="w-full rounded-2xl border border-white/[0.10] bg-black/30 px-4 py-3 text-sm text-white outline-none ring-0 placeholder:text-white/30 focus:border-cyan-400/40"
            />
          </div>
        </GlassCard>
      </motion.section>

      {/* 4. Draft */}
      <motion.section {...reveal(Boolean(effectiveType && state.name.trim().length >= 3))}>
        <div ref={draftSectionRef}>
        <GlassCard className={!effectiveType || state.name.trim().length < 3 ? 'pointer-events-none opacity-40' : ''}>
          <SectionHeader title="4 · Draft type" hint="How picks are ordered — you can adjust timers and order in settings." />
          <Segmented
            options={draftOptions.map((dt) => ({
              value: dt.id,
              label: dt.label,
              hint: dt.hint,
            }))}
            value={
              effectiveType && isDraftTypeAllowedForType(state.draftType, effectiveType)
                ? state.draftType
                : draftOptions[0]?.id ?? 'snake'
            }
            onChange={(draftType) => onChange({ draftType })}
            accent={accent}
            ariaLabel="Draft type"
          />
          {isThirdRoundReversalAvailable(state.draftType) ? (
            <div className="mt-4">
              <Toggle
                checked={state.thirdRoundReversal && isSnake}
                onChange={(v) => onChange({ thirdRoundReversal: v })}
                label="Third Round Reversal"
                description="Snake reverses again in round 3 — optional twist for startups."
                accent={accent}
              />
            </div>
          ) : null}
          {draftInView ? (
            <p className="mt-3 text-[10px] text-white/30" aria-hidden>
              Draft preview media prioritizes this section while you configure picks.
            </p>
          ) : null}
        </GlassCard>
        </div>
      </motion.section>
    </div>
  )
}
