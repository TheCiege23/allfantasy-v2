/**
 * League Promotion / Relegation — types for division hierarchy and season-end transitions.
 */

export interface DivisionView {
  divisionId: string
  leagueId: string
  tierLevel: number
  sport: string
  name: string | null
  teamCount: number
}

export interface TeamStandingInDivision {
  teamId: string
  teamName: string
  ownerName: string
  divisionId: string | null
  tierLevel: number | null
  wins: number
  losses: number
  ties: number
  pointsFor: number
  rank: number
  /** In promotion zone (top N of lower tier) */
  inPromotionZone: boolean
  /** In relegation zone (bottom N of higher tier) */
  inRelegationZone: boolean
}

export interface PromotionRuleView {
  ruleId: string
  leagueId: string
  fromTierLevel: number
  toTierLevel: number
  promoteCount: number
  relegateCount: number
}

export interface SeasonEndTransition {
  teamId: string
  teamName: string
  fromDivisionId: string
  fromTierLevel: number
  toDivisionId: string
  toTierLevel: number
  type: 'promotion' | 'relegation'
}
