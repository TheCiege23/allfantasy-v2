export interface MflImportLeague {
  leagueId: string
  name: string
  sport: string
  season: number | null
  size: number
  currentWeek: number | null
  isFinished: boolean
  playoffTeamCount: number | null
  regularSeasonLength: number | null
  url: string | null
}

export interface MflImportSettings {
  scoringType: string | null
  draftType: string | null
  rosterPositions: Array<{ position: string; count: number }>
  usesFaab: boolean | null
  acquisitionBudget: number | null
  waiverType: string | null
  usesTaxi: boolean | null
  raw: Record<string, unknown>
}

export interface MflImportTeam {
  franchiseId: string
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

export interface MflImportScheduleWeek {
  week: number
  season: number
  matchups: Array<{
    franchiseId1: string
    franchiseId2: string
    points1?: number
    points2?: number
  }>
}

export interface MflImportTransaction {
  transactionId: string
  type: string
  status: string
  createdAt: string | null
  franchiseIds: string[]
  adds: Record<string, string>
  drops: Record<string, string>
}

export interface MflImportDraftPick {
  round: number
  pickNumber: number
  franchiseId: string
  playerId: string
  playerName?: string | null
  position?: string | null
  team?: string | null
}

export interface MflImportPayload {
  sourceInput: string
  league: MflImportLeague
  settings: MflImportSettings | null
  teams: MflImportTeam[]
  schedule: MflImportScheduleWeek[]
  transactions: MflImportTransaction[]
  draftPicks: MflImportDraftPick[]
  playerMap: Record<string, { name: string; position: string; team: string }>
  lineupBreakdownAvailable: boolean
}
