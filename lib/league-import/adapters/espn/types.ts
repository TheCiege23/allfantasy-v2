export interface EspnImportLeague {
  leagueId: string
  name: string
  sport: string
  season: number | null
  size: number
  currentWeek: number | null
  isFinished: boolean
  playoffTeamCount: number | null
  regularSeasonLength: number | null
}

export interface EspnImportSettings {
  scoringType: string | null
  draftType: string | null
  lineupSlotCounts: Array<{ slotId: number; slot: string; count: number }>
  scoringItems: Array<{ statId: number; points: number }>
  usesFaab: boolean
  acquisitionBudget: number | null
  waiverProcessDay: number | null
  playoffTeamCount: number | null
  matchupPeriodCount: number | null
  regularSeasonMatchupCount: number | null
  raw: Record<string, unknown>
}

export interface EspnImportTeam {
  teamId: string
  managerId: string
  managerName: string
  teamName: string
  logoUrl: string | null
  wins: number
  losses: number
  ties: number
  rank: number | null
  pointsFor: number
  pointsAgainst: number | null
  faabRemaining: number | null
  waiverPriority: number | null
  rosterPlayerIds: string[]
  starterPlayerIds: string[]
  reservePlayerIds: string[]
  playerMap: Record<string, { name: string; position: string; team: string }>
}

export interface EspnImportScheduleWeek {
  week: number
  season: number
  matchups: Array<{
    teamId1: string
    teamId2: string
    points1?: number
    points2?: number
  }>
}

export interface EspnImportPayload {
  sourceInput: string
  league: EspnImportLeague
  settings: EspnImportSettings | null
  teams: EspnImportTeam[]
  schedule: EspnImportScheduleWeek[]
  previousSeasons: Array<{
    season: string
    sourceLeagueId: string
  }>
}
