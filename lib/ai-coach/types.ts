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
  leagueSettings?: { sport?: string }
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
