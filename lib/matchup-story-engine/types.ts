import type { SupportedSport } from '@/lib/sport-scope'

export interface MatchupStoryEngineInput {
  sport?: SupportedSport | string | null
  teamAName: string
  teamBName: string
  projectedScoreA: number
  projectedScoreB: number
  winProbabilityA: number
  winProbabilityB: number
  upsetChance?: number | null
  volatilityTag?: 'low' | 'medium' | 'high' | string | null
}

export interface MatchupStoryEngineSuccess {
  ok: true
  sport: SupportedSport
  narrative: string
  source: 'ai'
  model: string
}

export interface MatchupStoryEngineFailure {
  ok: false
  sport: SupportedSport
  error: string
  status: number
}

export type MatchupStoryEngineResult =
  | MatchupStoryEngineSuccess
  | MatchupStoryEngineFailure
