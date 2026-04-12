/**
 * Per–league-type options collected during create (sport-aware).
 * Deeper tuning stays in League settings after the league exists.
 */

import { normalizeToSupportedSport } from '@/lib/sport-scope'

export type TournamentLeagueNamingMode = 'commissioner_custom' | 'app_generated' | 'ai_themed'

export type SurvivorTribeNameMode = 'auto' | 'custom'
export type SurvivorCommissionerRole = 'commissioner_only' | 'player_commissioner'

export interface WizardFormatOptions {
  /** Fantasy tournament (multi-league hub) — uses POST /api/tournament/create */
  tournamentParticipantPoolSize: number
  tournamentInitialLeagueSize: number | 'auto'
  tournamentLeagueNamingMode: TournamentLeagueNamingMode
  /** One name per line when naming mode is commissioner_custom */
  tournamentCustomLeagueNamesLines: string
  /** Survivor — team count (bounded per sport season length) */
  survivorTeamCount: number
  survivorTribeNameMode: SurvivorTribeNameMode
  survivorCustomTribeNamesLines: string
  survivorCommissionerRole: SurvivorCommissionerRole
  /** Survivor — optional season headline (e.g. Heroes vs Villains), matches `/leagues/create` Rules step */
  survivorSeasonThemeLabel: string
  /** Survivor — catalog weekly challenges vs manual (default on) */
  survivorChallengesSystemRun: boolean
  /**
   * Survivor — tribe count sent to create (`survivor_suggested_tribe_count`).
   * `null` = auto from cast size via `suggestedSurvivorTribeCount`; otherwise 2–4.
   */
  survivorTribeCountOverride: null | 2 | 3 | 4
  /** Keeper */
  keeperMaxKeepers: number
  /** Zombie */
  zombieUniverseMode: boolean
  zombieIntertwinedLeagueCount: number
  /** Zombie — whisperer assignment (passed to `upsertZombieLeagueConfig` at create) */
  zombieWhispererSelection: 'random' | 'veteran_priority'
  /** Salary cap */
  salaryCapStartupCap: number | null
  salaryCapMode: 'dynasty' | 'bestball'
  /** Guillotine — acknowledge rules summary (full chop settings in league settings) */
  guillotineRulesAcknowledged: boolean
  /** Big Brother — optional subtitle shown on league home */
  bigBrotherSubtitle: string
  /** Taxi / devy — creation-time targets (roster templates still from presets) */
  dynastyTaxiSlots: number
  devyTaxiSlots: number
  devyCollegeSlots: number
  c2cTaxiSlots: number
  c2cCollegeSlots: number
}

export const DEFAULT_WIZARD_FORMAT_OPTIONS: WizardFormatOptions = {
  tournamentParticipantPoolSize: 32,
  tournamentInitialLeagueSize: 12,
  tournamentLeagueNamingMode: 'app_generated',
  tournamentCustomLeagueNamesLines: '',
  survivorTeamCount: 18,
  survivorTribeNameMode: 'auto',
  survivorCustomTribeNamesLines: '',
  survivorCommissionerRole: 'commissioner_only',
  survivorSeasonThemeLabel: '',
  survivorChallengesSystemRun: true,
  survivorTribeCountOverride: null,
  keeperMaxKeepers: 3,
  zombieUniverseMode: false,
  zombieIntertwinedLeagueCount: 1,
  zombieWhispererSelection: 'random',
  salaryCapStartupCap: null,
  salaryCapMode: 'dynasty',
  guillotineRulesAcknowledged: false,
  bigBrotherSubtitle: '',
  dynastyTaxiSlots: 4,
  devyTaxiSlots: 6,
  devyCollegeSlots: 4,
  c2cTaxiSlots: 4,
  c2cCollegeSlots: 6,
}

/** Survivor: 16–24 teams for NFL-style seasons; tighter bounds for shorter seasons. */
export function getSurvivorTeamBounds(sport: string): { min: number; max: number } {
  const s = normalizeToSupportedSport(sport) ?? 'NFL'
  if (s === 'NFL' || s === 'NCAAF') return { min: 16, max: 24 }
  if (s === 'NBA' || s === 'NHL' || s === 'MLB' || s === 'NCAAB' || s === 'SOCCER') return { min: 12, max: 20 }
  return { min: 16, max: 24 }
}

export function clampSurvivorTeamCount(sport: string, n: number): number {
  const { min, max } = getSurvivorTeamBounds(sport)
  return Math.max(min, Math.min(max, Math.round(n)))
}

/** Tribe count from team count: max 4 tribes, at least 2. */
export function suggestedSurvivorTribeCount(teamCount: number): number {
  if (teamCount <= 8) return 2
  if (teamCount <= 16) return 3
  return 4
}

export function formatOptionsApplyToLeagueType(
  leagueType: string,
  options: WizardFormatOptions,
  sport: string
): Record<string, unknown> {
  const out: Record<string, unknown> = {
    creation_format_options_version: 1,
  }

  if (leagueType === 'survivor') {
    out.survivor_creation_team_count = clampSurvivorTeamCount(sport, options.survivorTeamCount)
    out.survivor_tribe_name_mode = options.survivorTribeNameMode
    out.survivor_commissioner_role = options.survivorCommissionerRole
    out.survivor_challenges_system_run = options.survivorChallengesSystemRun !== false
    if (options.survivorSeasonThemeLabel.trim()) {
      out.survivor_season_theme_label = options.survivorSeasonThemeLabel.trim()
    }
    const cast = clampSurvivorTeamCount(sport, options.survivorTeamCount)
    const tribeCount =
      options.survivorTribeCountOverride != null
        ? Math.min(4, Math.max(2, options.survivorTribeCountOverride))
        : suggestedSurvivorTribeCount(cast)
    out.survivor_suggested_tribe_count = tribeCount
    if (options.survivorCustomTribeNamesLines.trim()) {
      out.survivor_custom_tribe_names = options.survivorCustomTribeNamesLines
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
    }
    if (options.survivorCommissionerRole === 'player_commissioner') {
      out.survivor_commissioner_fair_play_limited_visibility = true
    }
  }

  if (leagueType === 'keeper') {
    out.keeper_max_keepers = options.keeperMaxKeepers
  }

  if (leagueType === 'zombie') {
    out.zombie_creation_universe_mode = options.zombieUniverseMode
    out.zombie_creation_intertwined_league_count = Math.max(1, Math.min(8, options.zombieIntertwinedLeagueCount))
    out.zombie_whisperer_selection = options.zombieWhispererSelection === 'veteran_priority' ? 'veteran_priority' : 'random'
  }

  if (leagueType === 'salary_cap') {
    if (options.salaryCapStartupCap != null) out.salary_cap_startup_cap = options.salaryCapStartupCap
    out.salary_cap_mode = options.salaryCapMode
  }

  if (leagueType === 'big_brother' && options.bigBrotherSubtitle.trim()) {
    out.big_brother_subtitle = options.bigBrotherSubtitle.trim()
  }

  if (leagueType === 'dynasty') {
    out.dynasty_taxi_slots_creation = options.dynastyTaxiSlots
  }

  if (leagueType === 'devy') {
    out.devy_taxi_slots_creation = options.devyTaxiSlots
    out.devy_college_slots_creation = options.devyCollegeSlots
  }

  if (leagueType === 'c2c') {
    out.c2c_taxi_slots_creation = options.c2cTaxiSlots
    out.c2c_college_slots_creation = options.c2cCollegeSlots
  }

  if (leagueType === 'guillotine') {
    out.guillotine_rules_acknowledged_at_create = options.guillotineRulesAcknowledged
  }

  return out
}
