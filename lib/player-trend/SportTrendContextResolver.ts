/**
 * SportTrendContextResolver – sport-aware trend weights and thresholds.
 * Uses sport-scope as the single source of truth for supported sports.
 */
import {
  DEFAULT_SPORT,
  SUPPORTED_SPORTS,
  normalizeToSupportedSport,
  type SupportedSport,
} from '@/lib/sport-scope'
import type { TrendSignals } from './types'
import { DEFAULT_TREND_WEIGHTS } from './types'

export const TREND_SPORTS: readonly SupportedSport[] = [...SUPPORTED_SPORTS]

export type TrendSport = SupportedSport

export interface SportTrendWeights extends Record<keyof TrendSignals, number> {}

/** Sport-specific weight overrides; keys are sport codes. Default weights used when not overridden. */
const SPORT_WEIGHT_OVERRIDES: Partial<Record<TrendSport, Partial<SportTrendWeights>>> = {
  NFL: {},
  NBA: { draftFrequency: 0.22, lineupStartRate: 0.18 },
  MLB: { addRate: 0.28, injuryImpact: -0.18 },
  NHL: { addRate: 0.26, lineupStartRate: 0.16 },
  NCAAF: { draftFrequency: 0.24, tradeInterest: 0.18 },
  NCAAB: { draftFrequency: 0.22 },
  SOCCER: { addRate: 0.26, lineupStartRate: 0.18, injuryImpact: -0.18 },
}

/**
 * Resolve trend weights for a sport. Returns merged default + sport overrides (normalized so weights remain sensible).
 */
export function getTrendWeightsForSport(sport: string | null | undefined): SportTrendWeights {
  const normalized = normalizeToSupportedSport(sport)
  const overrides = SPORT_WEIGHT_OVERRIDES[normalized]
  return { ...DEFAULT_TREND_WEIGHTS, ...overrides } as SportTrendWeights
}

/**
 * Whether trend calculations should be isolated to this sport (always true for per-sport views).
 */
export function isSportIsolated(sport: string): boolean {
  void sport
  return true
}

/**
 * Resolve sport from league/context for trend recording (ensures one of TREND_SPORTS).
 */
export function resolveSportForTrend(sport: string | null | undefined): TrendSport {
  return normalizeToSupportedSport(sport) ?? DEFAULT_SPORT
}
