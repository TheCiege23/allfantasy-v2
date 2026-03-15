/**
 * League Broadcast Mode — types for watch parties, streams, big screens.
 */

export interface BroadcastStandingRow {
  teamId: string
  teamName: string
  ownerName: string
  wins: number
  losses: number
  ties: number
  pointsFor: number
  pointsAgainst: number
  rank: number
}

export interface BroadcastMatchupRow {
  matchupId: string
  teamAId: string
  teamAName: string
  teamBId: string
  teamBName: string
  scoreA: number
  scoreB: number
  winnerTeamId: string | null
  weekOrPeriod: number
  season: number | null
}

export interface BroadcastStorylineRow {
  id: string
  headline: string
  summary: string | null
  dramaType: string
  dramaScore: number
  createdAt: string
}

export interface BroadcastRivalryRow {
  id: string
  managerAId: string
  managerBId: string
  managerAName: string
  managerBName: string
  intensityScore: number
  eventCount: number
}

export interface BroadcastPayload {
  leagueId: string
  leagueName: string | null
  sport: string
  standings: BroadcastStandingRow[]
  matchups: BroadcastMatchupRow[]
  storylines: BroadcastStorylineRow[]
  rivalries: BroadcastRivalryRow[]
  currentWeek: number | null
  season: number | null
  fetchedAt: string
}
