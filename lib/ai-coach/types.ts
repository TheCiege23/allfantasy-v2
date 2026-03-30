/**
 * AI Coach types — advice type, input payload, recommendation shape.
 */

export type CoachAdviceType =
  | 'start_sit'
  | 'lineup_optimization'
  | 'waiver'
  | 'trade'
  | 'draft'

export interface AICoachInput {
  type: CoachAdviceType
  teamName?: string
  leagueId?: string
  week?: number
  leagueSettings?: {
    sport?: string
    scoringFormat?: string
    teamCount?: number
    rosterSlots?: string[]
  }
  matchupData?: {
    opponentName?: string
    opponentProjection?: number
    teamProjection?: number
    spread?: number
    notes?: string
  }
  roster?: {
    playerName: string
    position?: string
    team?: string
    projectedPoints?: number
    slot?: string
  }[]
  playerStats?: {
    playerName: string
    position?: string
    projectedPoints?: number
  }[]
}

export interface CoachRecommendation {
  type: CoachAdviceType
  headline: string
  items: { label: string; detail?: string; value?: number }[]
  summaryNumbers?: { projectedLineupTotal?: number }
  contextSummary: string
}

export interface CoachExplanation {
  summary: string
  bullets: string[]
  challenge: string
  tone: 'motivational' | 'cautious' | 'celebration' | 'neutral'
  source: 'ai' | 'deterministic'
}

export interface AICoachResponse {
  type: CoachAdviceType
  recommendation: CoachRecommendation
  explanation: CoachExplanation
}
