export interface YahooImportLeague {
  leagueKey: string
  leagueId: string
  name: string
  sport: string
  season: number | null
  numTeams: number
  draftStatus: string | null
  currentWeek: number | null
  startWeek: number | null
  endWeek: number | null
  isFinished: boolean
  url?: string | null
}

export interface YahooImportSettings {
  draftType: string | null
  scoringType: string | null
  usesPlayoff: boolean | null
  playoffStartWeek: number | null
  usesPlayoffReseeding: boolean | null
  usesLockEliminatedTeams: boolean | null
  usesFaab: boolean | null
  tradeEndDate: string | null
  tradeRatifyType: string | null
  rosterPositions: Array<{ position: string; count: number }>
  statCategories: Array<{
    statId: string
    name: string | null
    displayName: string | null
    enabled: boolean | null
    positionType: string | null
  }>
  statModifiers: Array<{ statId: string; value: number }>
  raw: Record<string, unknown>
}

export interface YahooImportTeam {
  teamKey: string
  teamId: string
  managerId: string
  managerGuid?: string | null
  managerName: string
  teamName: string
  logoUrl: string | null
  wins: number
  losses: number
  ties: number
  rank: number | null
  pointsFor: number
  pointsAgainst: number | null
  faabBalance: number | null
  waiverPriority: number | null
  clinchedPlayoffs: boolean
  rosterPlayerIds: string[]
  starterPlayerIds: string[]
  reservePlayerIds: string[]
  playerMap: Record<string, { name: string; position: string; team: string }>
}

export interface YahooImportScheduleWeek {
  week: number
  season: number
  matchups: Array<{
    teamKey1: string
    teamKey2: string
    points1?: number
    points2?: number
  }>
}

export interface YahooImportTransaction {
  transactionId: string
  type: string
  status: string
  createdAt: string | null
  teamKeys: string[]
  adds: Record<string, string>
  drops: Record<string, string>
}

export interface YahooImportPayload {
  sourceInput: string
  resolvedFromLeagueList: boolean
  league: YahooImportLeague
  settings: YahooImportSettings | null
  teams: YahooImportTeam[]
  schedule: YahooImportScheduleWeek[]
  scheduleWeeksExpected: number | null
  scheduleWeeksCovered: number
  transactions: YahooImportTransaction[]
  previousSeasons: Array<{
    season: string
    sourceLeagueId: string
  }>
}
