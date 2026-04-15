'use client'

/**
 * Page 1 — League Setup.
 *
 * Collects: leagueType, sport, teamCount, survivor tribe count (conditional),
 * draftType, 3RR toggle (snake only). Every selection retunes the accent.
 */

import type { LeagueTypeId, DraftTypeId } from '@/lib/league-creation-wizard/types'
import type { AccentTone } from '@/lib/create-league-v2/theme'
import type { CreateLeagueV2State, SupportedSport } from '@/lib/create-league-v2/state'
import { SUPPORTED_SPORTS } from '@/lib/create-league-v2/state'
import { getTeamCountOptionsForSport } from '@/lib/league-creation-wizard/sport-team-limits'
import {
  GlassCard,
  PillRow,
  SectionHeader,
  SelectableCard,
  Toggle,
  Segmented,
} from './primitives'

type LeagueTypeCard = {
  id: LeagueTypeId
  title: string
  subtitle: string
  icon: string
}

const LEAGUE_TYPES: LeagueTypeCard[] = [
  { id: 'redraft', title: 'Redraft', subtitle: 'Fresh draft every season', icon: '◆' },
  { id: 'dynasty', title: 'Dynasty', subtitle: 'Keep your core forever', icon: '♔' },
  { id: 'keeper', title: 'Keeper', subtitle: 'Hold a few, draft the rest', icon: '⬡' },
  { id: 'best_ball', title: 'Best Ball', subtitle: 'Set and forget', icon: '◉' },
  { id: 'salary_cap', title: 'Salary Cap', subtitle: 'Budget-based rosters', icon: '$' },
  { id: 'survivor', title: 'Survivor', subtitle: 'Vote players off', icon: '⚑' },
  { id: 'guillotine', title: 'Guillotine', subtitle: 'Lowest score is eliminated', icon: '✕' },
  { id: 'tournament', title: 'Tournament', subtitle: 'Bracket-style playoffs', icon: '⚔' },
  { id: 'devy', title: 'Devy', subtitle: 'Draft college prospects', icon: '✦' },
  { id: 'c2c', title: 'C2C', subtitle: 'College to pros', icon: '⇄' },
  { id: 'zombie', title: 'Zombie', subtitle: 'Infection-style survival', icon: '☣' },
  { id: 'big_brother', title: 'Big Brother', subtitle: 'Weekly nominations', icon: '◎' },
]

const DRAFT_TYPES: { id: DraftTypeId; label: string; hint: string }[] = [
  { id: 'snake', label: 'Snake', hint: 'Reverse each round' },
  { id: 'linear', label: 'Linear', hint: 'Same order each round' },
  { id: 'auction', label: 'Auction', hint: 'Bid on every player' },
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

// Sports that don't really have a zombie/survivor fantasy variant today.
const SURVIVOR_SUPPORTED_SPORTS: SupportedSport[] = ['NFL', 'NBA', 'NHL', 'NCAAF']
const SURVIVOR_TRIBE_OPTIONS = [2, 3, 4] as const

function isSportAllowedForLeagueType(sport: SupportedSport, leagueType: LeagueTypeId): boolean {
  if (leagueType === 'survivor') return SURVIVOR_SUPPORTED_SPORTS.includes(sport)
  if (leagueType === 'zombie') return sport === 'NFL' || sport === 'NBA'
  if (leagueType === 'devy' || leagueType === 'c2c') return sport === 'NFL' || sport === 'NCAAF'
  return true
}

function isDraftTypeAllowed(draftType: DraftTypeId, leagueType: LeagueTypeId): boolean {
  if (leagueType === 'best_ball') return draftType === 'snake' || draftType === 'linear'
  if (leagueType === 'survivor') return draftType === 'snake'
  return true
}

export interface Page1SetupProps {
  state: CreateLeagueV2State
  accent: AccentTone
  onChange: (patch: Partial<CreateLeagueV2State>) => void
}

export function Page1Setup({ state, accent, onChange }: Page1SetupProps) {
  const teamCountOptions = getTeamCountOptionsForSport(state.sport, state.leagueType)
  const isSnake = state.draftType === 'snake'

  return (
    <div className="space-y-4">
      {/* League Type */}
      <GlassCard>
        <SectionHeader
          title="League Type"
          hint="Each type tunes the AI host, draft rules, and scoring presets."
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {LEAGUE_TYPES.map((type) => (
            <SelectableCard
              key={type.id}
              selected={state.leagueType === type.id}
              onClick={() => {
                const patch: Partial<CreateLeagueV2State> = { leagueType: type.id }
                // Snap sport to a supported one if needed.
                if (!isSportAllowedForLeagueType(state.sport, type.id)) {
                  const fallback = SUPPORTED_SPORTS.find((s) => isSportAllowedForLeagueType(s, type.id))
                  if (fallback) patch.sport = fallback
                }
                // Snap draft type if needed.
                if (!isDraftTypeAllowed(state.draftType, type.id)) patch.draftType = 'snake'
                onChange(patch)
              }}
              accent={accent}
              title={type.title}
              subtitle={type.subtitle}
              icon={type.icon}
            />
          ))}
        </div>
      </GlassCard>

      {/* Sport */}
      <GlassCard>
        <SectionHeader title="Sport" hint="Filters team counts, scoring presets, and roster shape." />
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {SUPPORTED_SPORTS.map((sport) => {
            const disabled = !isSportAllowedForLeagueType(sport, state.leagueType)
            return (
              <SelectableCard
                key={sport}
                selected={state.sport === sport}
                disabled={disabled}
                onClick={() => onChange({ sport })}
                accent={accent}
                title={SPORT_LABELS[sport]}
                icon={<span className="text-lg">{SPORT_ICONS[sport]}</span>}
              />
            )
          })}
        </div>
      </GlassCard>

      {/* Team count */}
      <GlassCard>
        <SectionHeader
          title="Team Count"
          hint={`${SPORT_LABELS[state.sport]} supports ${teamCountOptions[0]}–${teamCountOptions[teamCountOptions.length - 1]} teams.`}
        />
        <PillRow
          options={teamCountOptions}
          value={state.teamCount}
          onChange={(teamCount) => onChange({ teamCount })}
          accent={accent}
          ariaLabel="Number of teams"
        />
      </GlassCard>

      {/* Survivor tribes */}
      {state.leagueType === 'survivor' ? (
        <GlassCard>
          <SectionHeader
            title="Starting Tribes"
            hint="How many tribes split the cast before the merge."
          />
          <PillRow
            options={SURVIVOR_TRIBE_OPTIONS}
            value={state.survivorTribeCount}
            onChange={(survivorTribeCount) => onChange({ survivorTribeCount })}
            accent={accent}
            ariaLabel="Survivor tribe count"
          />
          <p className="mt-3 text-[11px] text-white/40">
            Tribes shuffle automatically at the merge week (configurable after league creation).
          </p>
        </GlassCard>
      ) : null}

      {/* Draft type + 3RR */}
      <GlassCard>
        <SectionHeader title="Draft Format" hint="Choose how picks are distributed." />
        <Segmented
          options={DRAFT_TYPES.map((dt) => ({
            value: dt.id,
            label: dt.label,
            hint: dt.hint,
          }))}
          value={state.draftType}
          onChange={(draftType) => onChange({ draftType })}
          accent={accent}
          ariaLabel="Draft type"
        />
        <div className="mt-4">
          <Toggle
            checked={state.thirdRoundReversal && isSnake}
            onChange={(v) => onChange({ thirdRoundReversal: v })}
            label="Third Round Reversal"
            description={
              isSnake
                ? 'Reverse the snake a second time in round 3 — softens the edge for late 1st-round picks.'
                : '3RR only applies to snake drafts.'
            }
            accent={accent}
          />
        </div>
      </GlassCard>
    </div>
  )
}
