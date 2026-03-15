/**
 * SportStrategyResolver – sport-aware strategy labels and detection config.
 * Strategy logic adapts to each sport's roster, draft, and scoring context.
 */
import type { StrategySport, StrategyType } from './types'
import { SUPPORTED_STRATEGY_SPORTS } from './types'
import { getDetectionConfig } from './detection-config'

export const STRATEGY_SPORTS: readonly StrategySport[] = [...SUPPORTED_STRATEGY_SPORTS]

/** Human-readable strategy label per sport (analogous concepts across sports). */
const STRATEGY_LABELS: Record<StrategyType, string> = {
  ZeroRB: 'Zero RB / Defer primary',
  HeroRB: 'Hero RB / One elite at key position',
  EarlyQB: 'Early QB / Early premium position',
  LateQB: 'Late QB / Late premium position',
  EliteTE: 'Elite TE / Early specialist',
  BalancedBuild: 'Balanced build',
  RookieHeavyBuild: 'Rookie-heavy build',
  VeteranHeavyBuild: 'Veteran-heavy build',
  StackingStrategies: 'Stacking strategies',
}

/** Sport-specific strategy label overrides (e.g. "Zero FWD" for soccer). */
const SPORT_STRATEGY_OVERRIDES: Partial<Record<StrategySport, Partial<Record<StrategyType, string>>>> = {
  SOCCER: {
    ZeroRB: 'Zero FWD',
    HeroRB: 'Hero FWD',
    EarlyQB: 'Early MID',
    LateQB: 'Late MID',
    EliteTE: 'Early GKP',
  },
  NBA: {
    ZeroRB: 'Zero SG/SF',
    HeroRB: 'Hero wing',
    EarlyQB: 'Early PG',
    LateQB: 'Late PG',
  },
  NHL: {
    ZeroRB: 'Zero forward',
    HeroRB: 'Hero forward',
  },
  NCAAB: {
    ZeroRB: 'Zero F/C',
    HeroRB: 'Hero big',
    EarlyQB: 'Early G',
    LateQB: 'Late G',
  },
}

/**
 * Resolve display label for a strategy type in a sport context.
 */
export function getStrategyLabelForSport(strategyType: StrategyType, sport: StrategySport): string {
  const overrides = SPORT_STRATEGY_OVERRIDES[sport]
  if (overrides && overrides[strategyType]) return overrides[strategyType]!
  return STRATEGY_LABELS[strategyType]
}

/**
 * Get detection config for a sport (draft position allocation, positional concentration).
 */
export function getSportStrategyConfig(sport: StrategySport) {
  return getDetectionConfig(sport)
}

/**
 * Normalize sport for strategy meta (must be one of STRATEGY_SPORTS).
 */
export function resolveSportForStrategy(sport: string | null | undefined): StrategySport {
  const s = (sport || 'NFL').toUpperCase().trim()
  return STRATEGY_SPORTS.includes(s as StrategySport) ? (s as StrategySport) : 'NFL'
}
