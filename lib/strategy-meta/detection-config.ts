/**
 * Configurable detection rules per sport for strategy pattern detection.
 */
import type { StrategySport, StrategyDetectionConfig } from './types'

const NFL_CONFIG: StrategyDetectionConfig = {
  zeroRbRounds: 4,
  heroRbMaxRbInFirstTwo: 1,
  earlyQbRoundCeiling: 3,
  lateQbRoundFloor: 5,
  eliteTeRoundCeiling: 4,
  rbPositions: ['RB'],
  qbPositions: ['QB'],
  tePositions: ['TE'],
}

/** NCAA Football: same as NFL for draft strategy. */
const NCAAF_CONFIG: StrategyDetectionConfig = {
  ...NFL_CONFIG,
}

/** NBA/MLB/NHL/NCAAB: use generic "early round" logic; no TE, RB/QB mapped to key positions. */
function genericConfig(sport: StrategySport): StrategyDetectionConfig {
  const rbPositions = sport === 'NBA' ? ['PG', 'SG'] : sport === 'NHL' ? ['C', 'LW', 'RW'] : []
  const qbPositions = sport === 'NBA' ? ['PG'] : []
  return {
    zeroRbRounds: 4,
    heroRbMaxRbInFirstTwo: 1,
    earlyQbRoundCeiling: 3,
    lateQbRoundFloor: 5,
    eliteTeRoundCeiling: 4,
    rbPositions,
    qbPositions,
    tePositions: [],
  }
}

export function getDetectionConfig(sport: StrategySport): StrategyDetectionConfig {
  if (sport === 'NFL') return NFL_CONFIG
  if (sport === 'NCAAF') return NCAAF_CONFIG
  return genericConfig(sport)
}
