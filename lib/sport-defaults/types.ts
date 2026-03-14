/**
 * Sport Defaults Core Registry — shared types for all sport default domains.
 * Aligns with LeagueSport / SportType: NFL, NBA, MLB, NHL, NCAAF, NCAAB.
 */

export type SportType =
  | 'NFL'
  | 'NBA'
  | 'MLB'
  | 'NHL'
  | 'NCAAF'
  | 'NCAAB'
  | 'SOCCER'

export const SPORT_TYPES: SportType[] = ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB', 'SOCCER']

/** NFL league variants (presets). Other sports use STANDARD or sport-specific format. */
export type NFLLeagueVariant = 'STANDARD' | 'PPR' | 'HALF_PPR' | 'SUPERFLEX' | 'IDP' | 'DYNASTY_IDP'

/** League variant key (sport-agnostic); NFL uses NFLLeagueVariant. */
export type LeagueVariant = NFLLeagueVariant | 'STANDARD' | string

/** Sport-level metadata: display, icon, logo, season type. */
export interface SportMetadata {
  sport_type: SportType
  display_name: string
  short_name: string
  icon: string
  logo_strategy: 'sleeper' | 'espn' | 'local' | 'none'
  default_season_type: 'regular' | 'full' | 'playoff'
}

/** League-level defaults (team count, playoff, season length, matchup unit, trade deadline). */
export interface LeagueDefaults {
  sport_type: SportType
  default_league_name_pattern: string
  default_team_count: number
  default_playoff_team_count: number
  default_regular_season_length: number
  default_matchup_unit: 'week' | 'round' | 'day'
  default_trade_deadline_logic: 'none' | 'week_based' | 'date_based'
}

/** Playoff structure default (bracket, weeks, byes). */
export interface DefaultPlayoffConfig {
  sport_type: SportType
  playoff_team_count: number
  playoff_weeks: number
  first_round_byes: number
  bracket_type: 'single_elimination' | 'double_elimination' | 'consolation'
  consolation_plays_for: 'pick' | 'none' | 'cash'
}

/** Schedule and lock behavior default. */
export interface DefaultScheduleConfig {
  sport_type: SportType
  schedule_unit: 'week' | 'round' | 'series' | 'slate'
  regular_season_length: number
  matchup_frequency: 'weekly' | 'daily' | 'round' | 'slate'
  season_labeling: 'week' | 'round' | 'matchup'
  lock_time_behavior: 'game_time' | 'first_game' | 'slate_lock' | 'manual'
  injury_slot_behavior: 'ir_only' | 'ir_or_out' | 'flexible' | 'none'
}

/** Full default league settings (for League.settings JSON and commissioner overrides). */
export interface DefaultLeagueSettings {
  sport_type: SportType
  default_team_count: number
  regular_season_length: number
  playoff_team_count: number
  playoff_structure: Omit<DefaultPlayoffConfig, 'sport_type'>
  matchup_frequency: string
  season_labeling: string
  scoring_mode: 'points' | 'category' | 'roto'
  roster_mode: 'redraft' | 'dynasty' | 'keeper'
  waiver_mode: string
  trade_review_mode: 'none' | 'commissioner' | 'league_vote' | 'instant'
  standings_tiebreakers: string[]
  schedule_unit: string
  injury_slot_behavior: string
  lock_time_behavior: string
}

/** Roster slot defaults. */
export interface RosterDefaults {
  sport_type: SportType
  starter_slots: Record<string, number>
  bench_slots: number
  IR_slots: number
  taxi_slots: number
  devy_slots: number
  flex_definitions: Array<{ slotName: string; allowedPositions: string[] }>
}

/** Scoring: template id (or key) and category type. */
export interface ScoringDefaults {
  sport_type: SportType
  scoring_template_id: string
  scoring_format: string
  category_type: 'points' | 'category' | 'roto'
}

/** Draft defaults. */
export interface DraftDefaults {
  sport_type: SportType
  draft_type: 'snake' | 'linear' | 'auction'
  rounds_default: number
  timer_seconds_default: number | null
  pick_order_rules: 'snake' | 'linear'
}

/** Waiver defaults. */
export interface WaiverDefaults {
  sport_type: SportType
  waiver_type: 'faab' | 'rolling' | 'reverse_standings' | 'fcfs' | 'standard'
  processing_days: number[] | null
  FAAB_budget_default: number | null
}

/** Single team metadata (for team list / logos). */
export interface TeamMetadataDefault {
  team_id: string
  team_name: string
  city: string
  abbreviation: string
  primary_logo: string | null
  alternate_logo: string | null
}

/** Team metadata list per sport (optional; can be loaded from external source). */
export interface TeamMetadataDefaults {
  sport_type: SportType
  teams: TeamMetadataDefault[]
}

/** Aggregated defaults for one sport (what the resolver returns). */
export interface SportDefaultSet {
  metadata: SportMetadata
  league: LeagueDefaults
  roster: RosterDefaults
  scoring: ScoringDefaults
  draft: DraftDefaults
  waiver: WaiverDefaults
  teamMetadata: TeamMetadataDefaults | null
}
