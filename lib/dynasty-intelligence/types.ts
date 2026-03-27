/**
 * Dynasty Intelligence Engine (PROMPT 137) - types.
 * Age curve, market value trend, career trajectory, and AI-ready summaries.
 */

export type DynastyLifecycleStage =
  | 'Prospect'
  | 'Ascendant'
  | 'Prime'
  | 'Plateau'
  | 'Decline'
  | 'Cliff Risk'

export type DynastyMarketDirection = 'Hot' | 'Rising' | 'Stable' | 'Falling' | 'Cold'
export type DynastyTrajectoryLabel = 'Ascending' | 'Stable' | 'Declining' | 'Cliff Risk'
export type DynastyValuationBand =
  | 'Untouchable'
  | 'Core Asset'
  | 'Starter'
  | 'Fragile'
  | 'Depth'
export type DynastyRecommendation = 'Buy' | 'Hold' | 'Sell' | 'Monitor'

export interface DynastyOverviewCard {
  id: string
  label: string
  value: string
  detail: string
  tone: 'positive' | 'neutral' | 'negative'
}

export interface AgeCurvePoint {
  age: number
  multiplier: number
  label?: string | null
  stage?: DynastyLifecycleStage
}

export interface AgeCurveResult {
  sport: string
  position: string
  points: AgeCurvePoint[]
  peakAgeStart: number
  peakAgeEnd: number
  cliffAge: number
  currentAge: number | null
  currentMultiplier: number | null
  lifecycleStage: DynastyLifecycleStage
  yearsToPeakStart: number | null
  yearsToPeakEnd: number | null
  yearsToCliff: number | null
  riskBand: 'Low' | 'Moderate' | 'High'
}

export interface MarketTrendFactor {
  label: string
  value: number
  displayValue: string
}

export interface MarketValueTrend {
  direction: string
  canonicalDirection: DynastyMarketDirection
  trendScore: number
  scoreDelta: number | null
  usageChange: number
  demandScore: number
  liquidityScore: number
  volatilityScore: number
  confidence: number
  signalLabel: string
  signals: string[]
  factors: MarketTrendFactor[]
  updatedAt: string
}

export interface CareerTrajectoryPoint {
  yearOffset: number
  age: number
  projectedValue: number
  ageMultiplier: number
  windowYears: number
  retentionRate: number
  note?: string
}

export interface CareerTrajectoryResult {
  sport: string
  position: string
  age: number
  baseValue: number
  points: CareerTrajectoryPoint[]
  expectedWindowYears: number
  peakProjectedValue: number
  peakYearOffset: number
  valueChangePctYear3: number | null
  valueChangePctYear5: number | null
  trajectoryLabel: DynastyTrajectoryLabel
  cliffYearOffset: number | null
  retentionScore: number
}

export interface DynastyValuationBreakdown {
  dynastyScore: number
  positionMultiplier: number
  ageMultiplier: number
  windowMultiplier: number
  liquidityMultiplier: number
  marketPulse: number
  careerArc: number
  riskScore: number
}

export interface PlayerDynastyIntelligence {
  playerId?: string
  displayName?: string | null
  sport: string
  position: string
  team?: string | null
  age: number | null
  currentValue: number
  ageCurve: AgeCurveResult
  marketValueTrend: MarketValueTrend | null
  careerTrajectory: CareerTrajectoryResult | null
  lifecycleStage: DynastyLifecycleStage
  valuationBand: DynastyValuationBand
  marketRecommendation: DynastyRecommendation
  valuationBreakdown: DynastyValuationBreakdown | null
  overviewCards: DynastyOverviewCard[]
  generatedAt: string
}

export interface DynastyIntelligenceOptions {
  sport: string
  position?: string
  age?: number | null
  baseValue?: number
  playerId?: string
  isSuperFlex?: boolean
  isTightEndPremium?: boolean
}
