/**
 * Dynasty Intelligence Engine (PROMPT 137) – types.
 * Age curve, market value trend, career trajectory.
 */

/** Single point on an age curve (age -> dynasty multiplier). */
export interface AgeCurvePoint {
  age: number
  multiplier: number
  /** Optional label e.g. "Peak" | "Cliff" */
  label?: string
}

/** Age curve for a position/sport (for charts and comparison). */
export interface AgeCurveResult {
  sport: string
  position: string
  points: AgeCurvePoint[]
  /** Peak age range (approximate). */
  peakAgeStart: number
  peakAgeEnd: number
}

/** Market value trend from platform signals (e.g. PlayerMetaTrend). */
export interface MarketValueTrend {
  direction: 'Rising' | 'Hot' | 'Stable' | 'Falling' | 'Cold'
  trendScore: number
  /** Current minus previous period score. */
  scoreDelta: number | null
  /** Add rate - drop rate (usage). */
  usageChange: number
  updatedAt: string
}

/** Projected value at a future year (career trajectory). */
export interface CareerTrajectoryPoint {
  yearOffset: number
  /** 0 = current, 1 = next year, etc. */
  projectedValue: number
  /** Multiplier applied to base value. */
  ageMultiplier: number
  /** Expected remaining window (years) at this point. */
  windowYears: number
}

/** Career trajectory for a player/profile. */
export interface CareerTrajectoryResult {
  sport: string
  position: string
  age: number
  baseValue: number
  points: CareerTrajectoryPoint[]
  /** Expected premium window (years of peak-ish value). */
  expectedWindowYears: number
}

/** Full dynasty intelligence for a player or a position profile. */
export interface PlayerDynastyIntelligence {
  playerId?: string
  displayName?: string | null
  sport: string
  position: string
  age: number | null
  /** Current market/dynasty value (e.g. from FantasyCalc or internal). */
  currentValue: number
  ageCurve: AgeCurveResult
  marketValueTrend: MarketValueTrend | null
  careerTrajectory: CareerTrajectoryResult | null
  generatedAt: string
}

export interface DynastyIntelligenceOptions {
  sport: string
  position?: string
  /** For trajectory: age in years. */
  age?: number | null
  /** For trajectory: base dynasty value. */
  baseValue?: number
  /** Player id for market trend lookup. */
  playerId?: string
  /** SuperFlex / TEP for value scaling (optional). */
  isSuperFlex?: boolean
  isTightEndPremium?: boolean
}
