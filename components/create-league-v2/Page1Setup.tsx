'use client'

/**
 * Page 1 — League Setup.
 *
 * Collects: leagueType, sport, teamCount, survivor tribe count (conditional),
 * draftType, 3RR toggle (snake only). Every selection retunes the accent.
 * IDP is a 13th card that sets a modifier flag (not a format ID).
 */

import { useMemo } from 'react'
import type { LeagueTypeId, DraftTypeId } from '@/lib/league-creation-wizard/types'
import type { AccentTone } from '@/lib/create-league-v2/theme'
import type { CreateLeagueV2State, SupportedSport, SoccerPipeline } from '@/lib/create-league-v2/state'
import { SUPPORTED_SPORTS } from '@/lib/create-league-v2/state'
import {
  isSportAllowedForType,
  getTeamCountOptions,
  getDefaultTeamCount,
  getDraftTypeOptions,
  isDraftTypeAllowedForType,
  getSurvivorTribeOptions,
  isThirdRoundReversalAvailable,
  isIdpAvailableForSport,
} from '@/lib/create-league-v2/rules-engine'
import {
  GlassCard,
  PillRow,
  SectionHeader,
  SelectableCard,
  Toggle,
  Segmented,
} from './primitives'

// ── League type cards (12 format IDs + IDP pseudo-card) ─────────────

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

// ── Sport display config ────────────────────────────────────────────

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

// ── Helpers ─────────────────────────────────────────────────────────

function isCardSelected(card: LeagueTypeCard, state: CreateLeagueV2State): boolean {
  if (card.id === 'idp') return state.idpSelected
  return state.leagueType === card.id && !state.idpSelected
}

function resolveEffectiveLeagueType(state: CreateLeagueV2State): LeagueTypeId {
  // IDP maps to redraft internally
  return state.idpSelected ? 'redraft' : state.leagueType
}

// ── Component ───────────────────────────────────────────────────────

export interface Page1SetupProps {
  state: CreateLeagueV2State
  accent: AccentTone
  onChange: (patch: Partial<CreateLeagueV2State>) => void
}

export function Page1Setup({ state, accent, onChange }: Page1SetupProps) {
  const effectiveType = resolveEffectiveLeagueType(state)
  const teamCountOptions = useMemo(() => getTeamCountOptions(state.sport, effectiveType), [state.sport, effectiveType])
  const draftOptions = useMemo(() => getDraftTypeOptions(effectiveType, state.sport), [effectiveType, state.sport])
  const survivorTribes = useMemo(() => getSurvivorTribeOptions(state.teamCount), [state.teamCount])
  const isSnake = state.draftType === 'snake'
  const isTournament = effectiveType === 'tournament'
  const isSurvivor = effectiveType === 'survivor'
  const isSoccer = state.sport === 'SOCCER'

  function handleLeagueTypeSelect(card: LeagueTypeCard) {
    const patch: Partial<CreateLeagueV2State> = {}

    if (card.id === 'idp') {
      // IDP: set modifier flag, keep leagueType as redraft, force NFL
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
      // Snap sport if not allowed for new type
      if (!isSportAllowedForType(state.sport, selectedLeagueType)) {
        const fallback = SUPPORTED_SPORTS.find((s) => isSportAllowedForType(s, selectedLeagueType))
        if (fallback) {
          patch.sport = fallback
          patch.soccerPipeline = fallback === 'SOCCER' ? 'euro' : null
        }
      }
    }

    // Snap draft type if not allowed
    const nextType = card.id === 'idp' ? 'redraft' : card.id
    if (!isDraftTypeAllowedForType(state.draftType, nextType)) {
      const firstAllowed = getDraftTypeOptions(nextType)
      patch.draftType = firstAllowed[0]?.id ?? 'snake'
    }

    // Reset team count to default for new type
    const nextSport = (patch.sport ?? state.sport) as SupportedSport
    patch.teamCount = getDefaultTeamCount(nextSport, nextType)

    onChange(patch)
  }

  function handleSportChange(sport: SupportedSport) {
    const patch: Partial<CreateLeagueV2State> = { sport }
    // Reset soccer pipeline
    patch.soccerPipeline = sport === 'SOCCER' ? 'euro' : null
    // IDP is NFL-only
    if (state.idpSelected && !isIdpAvailableForSport(sport)) {
      patch.idpSelected = false
    }
    // Reset team count for new sport
    patch.teamCount = getDefaultTeamCount(sport, effectiveType)
    onChange(patch)
  }

  return (
    <div className="space-y-4">
      {/* League Type */}
      <GlassCard>
        <SectionHeader
          title="League Type"
          hint="Each type tunes the AI host, draft rules, and scoring presets."
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {LEAGUE_TYPES.map((card) => {
            const disabled = card.id === 'idp' ? false : undefined
            return (
              <SelectableCard
                key={card.id}
                selected={isCardSelected(card, state)}
                disabled={disabled}
                onClick={() => handleLeagueTypeSelect(card)}
                accent={accent}
                title={card.title}
                subtitle={card.subtitle}
                icon={card.icon}
              />
            )
          })}
        </div>
      </GlassCard>

      {/* Sport */}
      <GlassCard>
        <SectionHeader title="Sport" hint="Filters team counts, scoring presets, and roster shape." />
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {SUPPORTED_SPORTS.map((sport) => {
            const disabled = state.idpSelected
              ? !isIdpAvailableForSport(sport)
              : !isSportAllowedForType(sport, effectiveType)
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
      </GlassCard>

      {/* Soccer pipeline selector */}
      {isSoccer && (
        <GlassCard>
          <SectionHeader title="Soccer Region" hint="MLS uses North American data; European uses top-5 league data." />
          <Segmented
            options={[
              { value: 'mls' as const, label: 'MLS', hint: 'North America' },
              { value: 'euro' as const, label: 'European', hint: 'Top 5 leagues' },
            ]}
            value={state.soccerPipeline ?? 'euro'}
            onChange={(v) => onChange({ soccerPipeline: v as SoccerPipeline })}
            accent={accent}
            ariaLabel="Soccer data region"
          />
        </GlassCard>
      )}

      {/* Team count / Tournament pool size */}
      <GlassCard>
        <SectionHeader
          title={isTournament ? 'Tournament Pool Size' : 'Team Count'}
          hint={
            isTournament
              ? 'Total managers across all feeder leagues (each feeder = 12 teams).'
              : `${SPORT_LABELS[state.sport]} supports ${teamCountOptions[0]}–${teamCountOptions[teamCountOptions.length - 1]} teams.`
          }
        />
        <PillRow
          options={teamCountOptions}
          value={state.teamCount}
          onChange={(teamCount) => onChange({ teamCount })}
          accent={accent}
          ariaLabel={isTournament ? 'Tournament pool size' : 'Number of teams'}
        />
        {isTournament && (
          <p className="mt-3 text-[11px] text-white/40">
            {state.teamCount} managers = {Math.floor(state.teamCount / 12)} feeder leagues of 12 teams each.
          </p>
        )}
      </GlassCard>

      {/* Survivor tribes */}
      {isSurvivor && (
        <GlassCard>
          <SectionHeader
            title="Starting Tribes"
            hint="How many tribes split the cast before the merge."
          />
          <PillRow
            options={survivorTribes}
            value={survivorTribes.includes(state.survivorTribeCount) ? state.survivorTribeCount : survivorTribes[0] ?? 2}
            onChange={(survivorTribeCount) => onChange({ survivorTribeCount })}
            accent={accent}
            ariaLabel="Survivor tribe count"
          />
          <p className="mt-3 text-[11px] text-white/40">
            Tribes shuffle automatically at the merge week (configurable after league creation).
          </p>
        </GlassCard>
      )}

      {/* Draft type + 3RR */}
      <GlassCard>
        <SectionHeader title="Draft Format" hint="Choose how picks are distributed." />
        <Segmented
          options={draftOptions.map((dt) => ({
            value: dt.id,
            label: dt.label,
            hint: dt.hint,
          }))}
          value={isDraftTypeAllowedForType(state.draftType, effectiveType) ? state.draftType : draftOptions[0]?.id ?? 'snake'}
          onChange={(draftType) => onChange({ draftType })}
          accent={accent}
          ariaLabel="Draft type"
        />
        {isThirdRoundReversalAvailable(state.draftType) && (
          <div className="mt-4">
            <Toggle
              checked={state.thirdRoundReversal && isSnake}
              onChange={(v) => onChange({ thirdRoundReversal: v })}
              label="Third Round Reversal"
              description="Reverse the snake a second time in round 3 — softens the edge for late 1st-round picks."
              accent={accent}
            />
          </div>
        )}
      </GlassCard>
    </div>
  )
}
