/**
 * Detects roster-building and drafting strategy patterns per team.
 * Rules: ZeroRB, HeroRB, EarlyQB, LateQB, EliteTE, BalancedBuild, RookieHeavy, VeteranHeavy, Stacking.
 */
import type {
  StrategyType,
  StrategyDetectionInput,
  DetectedStrategy,
  DraftPickFact,
  LeagueFormat,
} from './types'
import { getDetectionConfig } from './detection-config'

function picksByRound(picks: DraftPickFact[]): Map<number, DraftPickFact[]> {
  const byRound = new Map<number, DraftPickFact[]>()
  for (const p of picks) {
    const list = byRound.get(p.round) ?? []
    list.push(p)
    byRound.set(p.round, list)
  }
  return byRound
}

function picksInFirstRounds(picks: DraftPickFact[], maxRound: number): DraftPickFact[] {
  return picks.filter((p) => p.round >= 1 && p.round <= maxRound)
}

function countByPosition(picks: DraftPickFact[], positions: string[]): number {
  const set = new Set(positions.map((x) => x.toUpperCase()))
  return picks.filter((p) => p.position && set.has(p.position.toUpperCase())).length
}

/**
 * Detect which strategy types apply to this team from draft + roster.
 * Returns multiple strategies when signals overlap (e.g. HeroRB + LateQB).
 */
export function detectStrategies(input: StrategyDetectionInput): DetectedStrategy[] {
  const results: DetectedStrategy[] = []
  const config = getDetectionConfig(input.sport)
  const picks = input.draftPicks
  const byRound = picksByRound(picks)

  // ZeroRB: no RB in first X rounds
  const firstRounds = picksInFirstRounds(picks, config.zeroRbRounds)
  const rbInFirst = countByPosition(firstRounds, config.rbPositions)
  if (config.rbPositions.length > 0 && firstRounds.length >= 3 && rbInFirst === 0) {
    results.push({
      strategyType: 'ZeroRB',
      confidence: Math.min(0.95, 0.6 + firstRounds.length * 0.08),
      signals: [`No ${config.rbPositions.join('/')} in first ${config.zeroRbRounds} rounds`],
    })
  }

  // HeroRB: exactly one RB in first 2 rounds
  const firstTwo = picksInFirstRounds(picks, 2)
  const rbInFirstTwo = countByPosition(firstTwo, config.rbPositions)
  if (config.rbPositions.length > 0 && firstTwo.length >= 2 && rbInFirstTwo === 1) {
    results.push({
      strategyType: 'HeroRB',
      confidence: 0.85,
      signals: [`One ${config.rbPositions[0]} in first two rounds`],
    })
  }

  // EarlyQB: QB in first N rounds
  const qbInEarly = countByPosition(picksInFirstRounds(picks, config.earlyQbRoundCeiling), config.qbPositions)
  if (config.qbPositions.length > 0 && qbInEarly >= 1) {
    results.push({
      strategyType: 'EarlyQB',
      confidence: 0.8,
      signals: [`${config.qbPositions[0]} in first ${config.earlyQbRoundCeiling} rounds`],
    })
  }

  // LateQB: no QB in first M rounds
  const firstLate = picksInFirstRounds(picks, config.lateQbRoundFloor)
  const qbInLate = countByPosition(firstLate, config.qbPositions)
  if (config.qbPositions.length > 0 && firstLate.length >= config.lateQbRoundFloor && qbInLate === 0) {
    results.push({
      strategyType: 'LateQB',
      confidence: 0.82,
      signals: [`No ${config.qbPositions[0]} in first ${config.lateQbRoundFloor} rounds`],
    })
  }

  // EliteTE: TE in first K rounds (NFL/NCAAF only)
  if (config.tePositions.length > 0) {
    const teInEarly = countByPosition(picksInFirstRounds(picks, config.eliteTeRoundCeiling), config.tePositions)
    if (teInEarly >= 1) {
      results.push({
        strategyType: 'EliteTE',
        confidence: 0.78,
        signals: [`${config.tePositions[0]} in first ${config.eliteTeRoundCeiling} rounds`],
      })
    }
  }

  // StackingStrategies: same-team stacks present
  if (input.stacks && input.stacks.length > 0) {
    results.push({
      strategyType: 'StackingStrategies',
      confidence: Math.min(0.9, 0.5 + input.stacks.length * 0.15),
      signals: input.stacks.map((s) => `${s.type} stack`),
    })
  }

  // RookieHeavyBuild / VeteranHeavyBuild from roster composition
  if (input.rookieCount != null && input.veteranCount != null) {
    const total = input.rookieCount + input.veteranCount
    if (total >= 5) {
      const rookiePct = input.rookieCount / total
      if (rookiePct >= 0.4) {
        results.push({
          strategyType: 'RookieHeavyBuild',
          confidence: Math.min(0.88, 0.5 + rookiePct * 0.5),
          signals: [`${Math.round(rookiePct * 100)}% roster rookies`],
        })
      }
      if (input.veteranCount / total >= 0.5) {
        results.push({
          strategyType: 'VeteranHeavyBuild',
          confidence: 0.75,
          signals: ['Veteran-heavy roster'],
        })
      }
    }
  }

  // BalancedBuild: default when no strong signal, or when no other strategy detected
  if (results.length === 0) {
    results.push({
      strategyType: 'BalancedBuild',
      confidence: 0.5,
      signals: [picks.length > 0 ? 'No dominant strategy detected' : 'Insufficient data; defaulting to BalancedBuild'],
    })
  }

  return results
}

/**
 * Normalize league settings to LeagueFormat for meta segmentation.
 */
export function toLeagueFormat(opts: {
  isDynasty: boolean
  isSuperFlex: boolean
}): LeagueFormat {
  if (opts.isDynasty && opts.isSuperFlex) return 'dynasty_sf'
  if (opts.isDynasty && !opts.isSuperFlex) return 'dynasty_1qb'
  if (!opts.isDynasty && opts.isSuperFlex) return 'redraft_sf'
  if (!opts.isDynasty && !opts.isSuperFlex) return 'redraft_1qb'
  return 'unknown'
}
