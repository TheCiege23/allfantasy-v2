import type { PickWeight, PlayerWeight } from '@/lib/upstream-apis'

export type SportCode = 'NFL' | 'NBA' | 'MLB' | string

export interface DynastyLeagueContext {
  sport: SportCode
  season: number
  isDynasty: boolean
  isSuperFlex: boolean
  isTightEndPremium: boolean
  teamCount: number
}

export interface PlayerDynastyAsset {
  playerId: string
  name: string
  position: string
  age: number | null
  dynastyValue: number
  recentInjuryScore?: number | null
  gamesPlayedLastSeason?: number | null
  draftRound?: number | null
  yearsInLeague?: number | null
}

export interface FuturePickAsset {
  season: number
  round: number
  pickNumber?: number
  ownerTeamId: string
}

export interface TeamDynastyInputs {
  leagueId: string
  teamId: string
  leagueContext: DynastyLeagueContext
  players: PlayerDynastyAsset[]
  futurePicks: FuturePickAsset[]
}

export interface RosterFutureValueBreakdown {
  nextYearStrength: number
  threeYearStrength: number
  fiveYearStrength: number
  agingRiskScore: number
  injuryRiskScore: number
}

export interface DraftPickValueBreakdown {
  totalDynastyValue: number
  nearTermContribution: number
  longTermContribution: number
}

export interface LongTermStrengthProjection {
  projectedStrengthNextYear: number
  projectedStrength3Years: number
  projectedStrength5Years: number
  rebuildProbability: number
  contenderProbability: number
  windowStartYear: number | null
  windowEndYear: number | null
  volatilityScore: number
}

export interface DynastyProjectionSnapshotPayload {
  leagueId: string
  sportType: string
  teamId: string
  season: number
  projectedStrengthNextYear: number
  projectedStrength3Years: number
  projectedStrength5Years: number
  rebuildProbability: number
  contenderProbability: number
  windowStartYear: number | null
  windowEndYear: number | null
  volatilityScore: number
  confidenceScore: number
}

