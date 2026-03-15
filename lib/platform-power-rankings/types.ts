/**
 * Platform Power Rankings — cross-league ranking using legacy score, XP, championships, win %.
 */

export interface PlatformPowerRow {
  managerId: string
  rank: number
  powerScore: number
  legacyScore: number | null
  totalXP: number
  championshipCount: number
  winPercentage: number | null
  totalLeaguesPlayed: number
  displayName?: string | null
}

export interface PlatformPowerLeaderboardResult {
  rows: PlatformPowerRow[]
  total: number
  generatedAt: string
}

export interface PlatformPowerOptions {
  sport?: string | null
  limit?: number
  offset?: number
}
