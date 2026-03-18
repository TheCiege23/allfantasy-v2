/**
 * Frontend types for Zombie league (PROMPT 354).
 */

export type ZombieView =
  | 'home'
  | 'resources'
  | 'ambush'
  | 'weekly-board'
  | 'ai'

export interface ZombieSummaryConfig {
  whispererSelection: string
  infectionLossToWhisperer: boolean
  infectionLossToZombie: boolean
  serumReviveCount: number
  zombieTradeBlocked: boolean
}

export interface ZombieSummary {
  config: ZombieSummaryConfig
  statuses: { rosterId: string; status: string }[]
  whispererRosterId: string | null
  survivors: string[]
  zombies: string[]
  week: number
  movementWatch: { rosterId: string; leagueId: string; reason: string; projectedLevelId: string | null }[]
  rosterDisplayNames?: Record<string, string>
  myRosterId?: string
  myResources?: { serums: number; weapons: number; ambush: number }
}

export interface ZombieUniverseStandingsRow {
  leagueId: string
  rosterId: string
  levelId: string
  levelName: string
  status: string
  totalPoints: number
  pointsPerWeek: number[]
  winnings: number
  serums: number
  weapons: number
  weekKilled: number | null
  killedByRosterId: string | null
}

export interface ZombieMovementProjection {
  rosterId: string
  leagueId: string
  currentLevelId: string
  projectedLevelId: string
  reason: string
}
