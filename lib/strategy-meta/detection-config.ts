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

/** Soccer: FWD/MID/DEF/GKP; positional concentration and early prioritization. */
const SOCCER_CONFIG: StrategyDetectionConfig = {
  zeroRbRounds: 4,
  heroRbMaxRbInFirstTwo: 1,
  earlyQbRoundCeiling: 3,
  lateQbRoundFloor: 5,
  eliteTeRoundCeiling: 4,
  rbPositions: ['FWD'],
  qbPositions: ['MID'],
  tePositions: ['GKP'],
}

/** NCAAB: G, F, C style positions. */
const NCAAB_CONFIG: StrategyDetectionConfig = {
  zeroRbRounds: 4,
  heroRbMaxRbInFirstTwo: 1,
  earlyQbRoundCeiling: 3,
  lateQbRoundFloor: 5,
  eliteTeRoundCeiling: 4,
  rbPositions: ['F', 'C'],
  qbPositions: ['G'],
  tePositions: [],
}

/** NBA/MLB/NHL: use generic "early round" logic; no TE, RB/QB mapped to key positions. */
function genericConfig(sport: StrategySport): StrategyDetectionConfig {
  const rbPositions = sport === 'NBA' ? ['PG', 'SG'] : sport === 'NHL' ? ['C', 'LW', 'RW'] : sport === 'MLB' ? ['SP', 'RP'] : []
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
  if (sport === 'SOCCER') return SOCCER_CONFIG
  if (sport === 'NCAAB') return NCAAB_CONFIG
  return genericConfig(sport)
}
