/**
 * Detects roster-building and drafting strategy patterns per team.
 * Rules: ZeroRB, HeroRB, EarlyQB, LateQB, EliteTE, BalancedBuild, RookieHeavy, VeteranHeavy, Stacking.
 */
import type {
  StrategyDetectionInput,
  DetectedStrategy,
  DraftPickFact,
  LeagueFormat,
} from './types'
import { getDetectionConfig } from './detection-config'

function picksInFirstRounds(picks: DraftPickFact[], maxRound: number): DraftPickFact[] {
  return picks.filter((p) => p.round >= 1 && p.round <= maxRound)
}

function countByPosition(picks: DraftPickFact[], positions: string[]): number {
  const set = new Set(positions.map((x) => x.toUpperCase()))
  return picks.filter((p) => p.position && set.has(p.position.toUpperCase())).length
}

function getPositionShares(positionCounts: Record<string, number>): Array<{ position: string; count: number; share: number }> {
  const entries = Object.entries(positionCounts)
  const total = entries.reduce((sum, [, count]) => sum + count, 0)
  if (total <= 0) return []
  return entries
    .map(([position, count]) => ({ position, count, share: count / total }))
    .sort((a, b) => b.share - a.share)
}

/**
 * Detect which strategy types apply to this team from draft + roster.
 * Returns multiple strategies when signals overlap (e.g. HeroRB + LateQB).
 */
export function detectStrategies(input: StrategyDetectionInput): DetectedStrategy[] {
  const results: DetectedStrategy[] = []
  const config = getDetectionConfig(input.sport)
  const picks = input.draftPicks

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

  // HeroRB: one anchor at the key position group in first 2 rounds.
  const firstTwo = picksInFirstRounds(picks, 2)
  const rbInFirstTwo = countByPosition(firstTwo, config.rbPositions)
  if (
    config.rbPositions.length > 0 &&
    firstTwo.length >= 2 &&
    rbInFirstTwo >= 1 &&
    rbInFirstTwo <= config.heroRbMaxRbInFirstTwo
  ) {
    results.push({
      strategyType: 'HeroRB',
      confidence: 0.85,
      signals: [`${rbInFirstTwo} ${config.rbPositions[0]} in first two rounds`],
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

  // StarsAndScrubsBuild: concentrated early-round position allocation.
  const firstFour = picksInFirstRounds(picks, 4).filter((p) => Boolean(p.position))
  if (firstFour.length >= 4) {
    const earlyPositionCounts = firstFour.reduce<Record<string, number>>((acc, pick) => {
      const position = String(pick.position).toUpperCase()
      acc[position] = (acc[position] ?? 0) + 1
      return acc
    }, {})
    const earlyDistinctPositions = Object.keys(earlyPositionCounts).length
    const topEarlyCount = Math.max(...Object.values(earlyPositionCounts))
    if (earlyDistinctPositions <= 2 && topEarlyCount >= 3) {
      results.push({
        strategyType: 'StarsAndScrubsBuild',
        confidence: 0.77,
        signals: ['Early rounds concentrated around a narrow positional core'],
      })
    }
  }

  // DepthHeavyBuild: repeated late-round investment into a single position.
  const lateRounds = picks.filter((p) => p.round >= 8 && Boolean(p.position))
  if (lateRounds.length >= 4) {
    const lateCounts = lateRounds.reduce<Record<string, number>>((acc, pick) => {
      const position = String(pick.position).toUpperCase()
      acc[position] = (acc[position] ?? 0) + 1
      return acc
    }, {})
    const [depthPosition, depthCount] = Object.entries(lateCounts).sort((a, b) => b[1] - a[1])[0] ?? []
    if (depthPosition && depthCount >= 3) {
      results.push({
        strategyType: 'DepthHeavyBuild',
        confidence: 0.72,
        signals: [`Late-round depth accumulation at ${depthPosition}`],
      })
    }
  }

  // Goalie/Pitcher-heavy builds in sports where specialist anchors matter.
  if (input.sport === 'NHL' || input.sport === 'MLB') {
    const specialistPositions = input.sport === 'NHL' ? ['G'] : ['P', 'SP', 'RP']
    const specialistInFirstFive = countByPosition(picksInFirstRounds(picks, 5), specialistPositions)
    if (specialistInFirstFive >= 2) {
      results.push({
        strategyType: 'GoaliePitcherHeavyBuild',
        confidence: 0.8,
        signals: [`${specialistInFirstFive} ${input.sport === 'NHL' ? 'goalie' : 'pitcher'} picks in first 5 rounds`],
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

  // BalancedBuild: roster composition is spread across multiple core positions.
  const positionShares = getPositionShares(input.rosterPositions)
  if (positionShares.length >= 3) {
    const dominantShare = positionShares[0]?.share ?? 1
    const corePositions = positionShares.filter((p) => p.share >= 0.16).length
    if (dominantShare <= 0.4 && corePositions >= 3) {
      results.push({
        strategyType: 'BalancedBuild',
        confidence: 0.66,
        signals: ['Roster composition remains balanced across core positions'],
      })
    }
  }

  // Fallback: if no strong signal, default to BalancedBuild.
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
