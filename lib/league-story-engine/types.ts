/**
 * League Story Engine (PROMPT 296) — types for narratives around leagues.
 */

export type LeagueStoryType =
  | 'closest_matchup'
  | 'underdog_story'
  | 'dominant_team'
  | 'rivalry_spotlight'
  | 'comeback_trajectory'
  | 'league_spotlight'

export interface LeagueStoryContext {
  leagueId: string
  leagueName: string
  week?: number
  season?: string
  sport?: string
  /** Standings: team name/id, wins, losses, pointsFor (optional) */
  standings?: Array<{ name: string; wins: number; losses: number; pointsFor?: number; rank?: number }>
  /** Matchups: pair of team names and optional projected/actual scores */
  matchups?: Array<{
    team1: string
    team2: string
    score1?: number
    score2?: number
    projectedMargin?: number
  }>
}

export interface LeagueStoryPayload {
  storyType: LeagueStoryType
  title: string
  narrative: string
  leagueId: string
  leagueName: string
  week?: number
  season?: string
  sport?: string
  /** Optional highlight (e.g. "Team A vs Team B", "Runaway Leader") */
  highlight?: string
}
