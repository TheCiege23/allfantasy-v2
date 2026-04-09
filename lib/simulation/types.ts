export interface SimulationConfig {
  leagueId: string
  leagueType: string
  leagueVariant: string | null
  sport: string
  playerCount: number
  teamCount: number
  seasonWeeks: number
}

export interface SimulatedWeek {
  week: number
  events: string[]
  scores?: Record<string, number>
  eliminated?: string
  immunityWinner?: string
  challengeWinner?: string
  twist?: string
}

export interface SimulationReport {
  leagueId: string
  leagueType: string
  leagueVariant: string | null
  sport: string
  weeksSimulated: number
  playerCount: number
  champion: string | null
  runnerUp: string | null
  weeks: SimulatedWeek[]
  keyEvents: string[]
  finalStandings: Array<{ rank: number; name: string; record?: string; points?: number }>
  formatSpecific: Record<string, unknown>
  simulatedAt: string
}

export interface Simulator {
  simulate(config: SimulationConfig, teams: SimTeam[]): Promise<SimulationReport>
}

export interface SimTeam {
  id: string
  name: string
  ownerName: string
  projectedPoints: number
}
