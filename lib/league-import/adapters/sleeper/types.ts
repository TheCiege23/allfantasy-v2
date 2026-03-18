/**
 * Sleeper API / legacy transfer raw shapes used by the Sleeper adapter.
 */

export interface SleeperLeagueRaw {
  league_id: string
  name: string
  sport: string
  season: string
  season_type?: string
  total_rosters: number
  status?: string
  settings?: {
    type?: number
    playoff_teams?: number
    num_teams?: number
  }
  scoring_settings?: Record<string, number>
  roster_positions?: string[]
  avatar?: string
  previous_league_id?: string
}

export interface SleeperUserRaw {
  user_id: string
  username: string
  display_name?: string
  avatar?: string
}

export interface SleeperRosterRaw {
  roster_id: number
  owner_id: string
  players?: string[]
  starters?: string[]
  reserve?: string[]
  taxi?: string[]
  settings?: {
    wins?: number
    losses?: number
    ties?: number
    fpts?: number
    fpts_decimal?: number
  }
}

export interface SleeperMatchupRaw {
  roster_id: number
  matchup_id: number
  points: number
}

export interface SleeperTransactionRaw {
  transaction_id: string
  type: string
  status: string
  created: number
  adds?: Record<string, string>
  drops?: Record<string, string>
  draft_picks?: unknown[]
  roster_ids?: number[]
}

export interface SleeperDraftPickRaw {
  round: number
  roster_id: number
  player_id: string
  picked_by?: string
  pick_no: number
  season?: string
  draft_id?: string
  metadata?: {
    first_name?: string
    last_name?: string
    position?: string
    team?: string
  }
}

/** Payload passed to Sleeper adapter (assembled from API or legacy transfer). */
export interface SleeperImportPayload {
  league: SleeperLeagueRaw
  users?: SleeperUserRaw[]
  rosters?: SleeperRosterRaw[]
  matchupsByWeek?: { week: number; matchups: SleeperMatchupRaw[] }[]
  transactions?: SleeperTransactionRaw[]
  draftPicks?: SleeperDraftPickRaw[]
  playerMap?: Record<string, { name: string; position: string; team: string }>
  previousSeasons?: Array<{ season: string; league: SleeperLeagueRaw }>
}
