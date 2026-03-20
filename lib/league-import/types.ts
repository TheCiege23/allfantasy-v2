/**
 * Canonical types for external league import mapping. Normalized output maps to AF entities
 * with source tracking for sync and history.
 */

export const IMPORT_PROVIDERS = ['sleeper', 'espn', 'yahoo', 'fantrax', 'mfl'] as const
export type ImportProvider = (typeof IMPORT_PROVIDERS)[number]

export interface SourceTracking {
  source_provider: ImportProvider
  source_league_id: string
  source_season_id?: string | null
  import_batch_id?: string | null
  imported_at: string
}

/** Normalized league settings shape (maps to League.settings + League fields). */
export interface NormalizedLeagueSettings {
  name: string
  sport: string
  season: number | null
  leagueSize: number
  rosterSize: number | null
  scoring: string | null
  isDynasty: boolean
  playoff_team_count?: number
  regular_season_length?: number
  schedule_unit?: string
  matchup_frequency?: string
  waiver_type?: string
  faab_budget?: number | null
  [key: string]: unknown
}

/** Normalized roster/team (maps to Roster + LeagueTeam). */
export interface NormalizedRoster {
  source_team_id: string
  source_manager_id: string
  owner_name: string
  team_name: string
  avatar_url: string | null
  wins: number
  losses: number
  ties: number
  points_for: number
  points_against?: number
  player_ids: string[]
  starter_ids: string[]
  reserve_ids?: string[]
  taxi_ids?: string[]
  faab_remaining?: number | null
  waiver_priority?: number | null
}

/** Normalized scoring (maps to AF scoring template or settings). */
export interface NormalizedScoring {
  scoring_format: string
  rules: Array<{ stat_key: string; points_value: number; multiplier?: number }>
  raw?: Record<string, unknown>
}

/** Normalized matchup (one week). */
export interface NormalizedMatchup {
  week: number
  season: number
  matchups: Array<{
    roster_id_1: string
    roster_id_2: string
    points_1?: number
    points_2?: number
  }>
}

/** Normalized draft pick. */
export interface NormalizedDraftPick {
  round: number
  pick_no: number
  source_roster_id: string
  source_player_id: string
  season?: number | null
  source_draft_id?: string | null
  player_name?: string | null
  position?: string | null
  team?: string | null
}

/** Normalized transaction (waiver/trade). */
export interface NormalizedTransaction {
  source_transaction_id: string
  type: 'waiver' | 'trade' | 'free_agent' | 'drop'
  status: string
  created_at: string
  adds?: Record<string, string>
  drops?: Record<string, string>
  roster_ids: string[]
  draft_picks?: unknown[]
}

/** Normalized standings entry. */
export interface NormalizedStandingsEntry {
  source_team_id: string
  rank: number
  wins: number
  losses: number
  ties: number
  points_for: number
  points_against?: number
}

export type ImportCoverageState = 'full' | 'partial' | 'missing'

export interface ImportCoverageBucket {
  state: ImportCoverageState
  count?: number | null
  note?: string | null
}

export interface ImportCoverage {
  leagueSettings: ImportCoverageBucket
  currentRosters: ImportCoverageBucket
  historicalRosterSnapshots: ImportCoverageBucket
  scoringSettings: ImportCoverageBucket
  playoffSettings: ImportCoverageBucket
  currentStandings: ImportCoverageBucket
  currentSchedule: ImportCoverageBucket
  draftHistory: ImportCoverageBucket
  tradeHistory: ImportCoverageBucket
  previousSeasons: ImportCoverageBucket
  playerIdentityMap: ImportCoverageBucket
}

export type ImportCoverageKey = keyof ImportCoverage

/** Full normalized import result. */
export interface NormalizedImportResult {
  source: SourceTracking
  league: NormalizedLeagueSettings
  rosters: NormalizedRoster[]
  scoring: NormalizedScoring | null
  schedule: NormalizedMatchup[]
  draft_picks: NormalizedDraftPick[]
  transactions: NormalizedTransaction[]
  standings: NormalizedStandingsEntry[]
  player_map: Record<string, { name: string; position: string; team: string }>
  identity_mappings?: ExternalIdentityMapping[]
  league_branding?: { avatar_url?: string | null; name?: string }
  previous_seasons?: Array<{ season: string; source_league_id: string }>
  coverage: ImportCoverage
}

/** Identity mapping: source id -> AF canonical id or stable key. */
export interface ExternalIdentityMapping {
  source_provider: ImportProvider
  source_id: string
  entity_type: 'player' | 'manager' | 'team' | 'league'
  af_id?: string | null
  stable_key?: string
}
