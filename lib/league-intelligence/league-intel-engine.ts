/**
 * League Intelligence Engine — Premium AI League Analysis
 *
 * Layers deep team intelligence on top of the existing rankings engine.
 * Produces per-team grades, health scores, recommendations, and
 * league-wide insights (most overrated, dangerous underdog, etc.).
 *
 * Consumes: rankingsEngine, league-intelligence, contender.ts, team-context-adjustment.
 * Pure deterministic. No AI calls. Target: <50ms for full league.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TeamGrade = 'S' | 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F'

export type TeamTrend = 'rising' | 'stable' | 'falling' | 'volatile'

export type TeamCategory = 'elite_contender' | 'contender' | 'playoff_bubble' | 'middle_pack' | 'retooling' | 'rebuilding' | 'tanking'

export type RecommendedAction =
  | 'push_for_title'
  | 'buy_depth'
  | 'sell_aging_assets'
  | 'trade_for_win_now'
  | 'start_rebuild'
  | 'hold_steady'
  | 'accumulate_picks'
  | 'trade_for_youth'
  | 'address_weakness'

export interface TeamIntelCard {
  rosterId: number
  teamName: string
  managerId: string | null

  // Overall grade
  grade: TeamGrade
  powerScore: number         // 0-100

  // Dimension scores
  rosterHealthScore: number  // 0-100 (injury exposure + age profile)
  depthScore: number         // 0-100 (bench quality vs league)
  futureAssetScore: number   // 0-100 (picks + youth)
  championshipWindowScore: number // 0-100

  // Classification
  category: TeamCategory
  trend: TeamTrend
  riskLevel: 'low' | 'medium' | 'high' | 'extreme'

  // Analysis
  biggestStrength: string
  biggestWeakness: string
  recommendedAction: RecommendedAction
  recommendationExplanation: string
  futureOutlook: string       // 1-2 sentence outlook

  // Positional detail
  needs: string[]
  surplus: string[]
  starterValue: number
  benchValue: number
  pickValue: number

  // Luck & performance
  luckScore: number           // 0-100 (50 = neutral, >50 = lucky, <50 = unlucky)
  performanceLabel: 'overperforming' | 'underperforming' | 'on_pace'

  // Risk flags
  riskFlags: string[]
}

export interface LeagueWideInsights {
  strongestTeam: { teamName: string; reason: string }
  mostOverratedTeam: { teamName: string; reason: string } | null
  mostDangerousUnderdog: { teamName: string; reason: string } | null
  bestRebuild: { teamName: string; reason: string } | null
  bestTradeTargetRoster: { teamName: string; reason: string } | null
  volatilityRanking: { teamName: string; volatility: number }[]
  leagueCompetitiveness: 'tight' | 'moderate' | 'lopsided'
  contenderCount: number
  rebuilderCount: number
}

export interface LeagueIntelResult {
  teamCards: TeamIntelCard[]
  leagueInsights: LeagueWideInsights
  computedAt: string
}

// ---------------------------------------------------------------------------
// Input (flexible — works with what's available)
// ---------------------------------------------------------------------------

export interface LeagueIntelInput {
  teams: Array<{
    rosterId: number
    teamName: string
    managerId?: string | null
    /** Assets by type */
    starterValue: number
    benchValue: number
    pickValue: number
    totalValue: number
    /** Roster composition */
    needs: string[]
    surplus: string[]
    youngAssetCount: number
    pickCount: number
    rosterSize: number
    starterCount: number
    /** Performance */
    wins: number
    losses: number
    pointsFor: number
    /** Classification from existing engine */
    contenderTier: 'champion' | 'contender' | 'middle' | 'rebuild'
    starterStrengthIndex: number
    /** Optional enrichment */
    injuredPlayerCount?: number
    avgAge?: number
    agingAssetCount?: number // players past decline age
  }>
  leagueAvgPoints: number
  numTeams: number
  isDynasty: boolean
  isSF: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

function gradeFromScore(score: number): TeamGrade {
  if (score >= 95) return 'S'
  if (score >= 88) return 'A+'
  if (score >= 80) return 'A'
  if (score >= 72) return 'B+'
  if (score >= 64) return 'B'
  if (score >= 55) return 'C+'
  if (score >= 45) return 'C'
  if (score >= 30) return 'D'
  return 'F'
}

function categoryFromTierAndScore(
  tier: string,
  powerScore: number,
  wins: number,
  losses: number,
): TeamCategory {
  const winPct = (wins + losses) > 0 ? wins / (wins + losses) : 0.5

  if (tier === 'champion' || (powerScore >= 85 && winPct >= 0.65)) return 'elite_contender'
  if (tier === 'contender' || powerScore >= 70) return 'contender'
  if (powerScore >= 58 && winPct >= 0.45) return 'playoff_bubble'
  if (tier === 'middle' || powerScore >= 45) return 'middle_pack'
  if (tier === 'rebuild' && powerScore >= 35) return 'retooling'
  if (tier === 'rebuild') return 'rebuilding'
  return 'middle_pack'
}

// ---------------------------------------------------------------------------
// Dimension Scoring
// ---------------------------------------------------------------------------

function computeRosterHealthScore(team: LeagueIntelInput['teams'][0]): number {
  let score = 70

  // Injury penalty
  const injured = team.injuredPlayerCount ?? 0
  score -= injured * 8

  // Age profile
  const avgAge = team.avgAge ?? 26
  if (avgAge > 28) score -= (avgAge - 28) * 5
  if (avgAge < 25) score += 5

  // Aging assets penalty
  const aging = team.agingAssetCount ?? 0
  score -= aging * 4

  return clamp(Math.round(score), 0, 100)
}

function computeDepthScore(
  team: LeagueIntelInput['teams'][0],
  leagueAvgBench: number,
): number {
  if (leagueAvgBench <= 0) return 50

  const ratio = team.benchValue / leagueAvgBench
  return clamp(Math.round(ratio * 50), 0, 100)
}

function computeFutureAssetScore(
  team: LeagueIntelInput['teams'][0],
  leagueAvgPicks: number,
  isDynasty: boolean,
): number {
  if (!isDynasty) return 50 // Redraft doesn't have meaningful future assets

  let score = 30

  // Pick value
  if (leagueAvgPicks > 0) {
    score += Math.round((team.pickValue / leagueAvgPicks) * 25)
  }

  // Youth premium
  score += Math.min(25, team.youngAssetCount * 5)

  // Pick count
  score += Math.min(20, team.pickCount * 3)

  return clamp(score, 0, 100)
}

function computeChampionshipWindowScore(
  team: LeagueIntelInput['teams'][0],
  leagueAvgValue: number,
): number {
  let score = 0

  // Starter strength (primary signal)
  score += Math.min(40, team.starterStrengthIndex * 0.4)

  // Value vs league
  if (leagueAvgValue > 0) {
    const ratio = team.totalValue / leagueAvgValue
    score += clamp(Math.round((ratio - 0.8) * 100), 0, 30)
  }

  // Record (secondary signal)
  const winPct = (team.wins + team.losses) > 0 ? team.wins / (team.wins + team.losses) : 0.5
  score += Math.round(winPct * 20)

  // Needs penalty
  score -= team.needs.length * 3

  return clamp(Math.round(score), 0, 100)
}

// ---------------------------------------------------------------------------
// Luck Score
// ---------------------------------------------------------------------------

function computeLuckScore(
  team: LeagueIntelInput['teams'][0],
  leagueAvgPoints: number,
): number {
  if (leagueAvgPoints <= 0 || (team.wins + team.losses) === 0) return 50

  const winPct = team.wins / (team.wins + team.losses)
  const pointsRatio = team.pointsFor / leagueAvgPoints

  // Expected win percentage from points scored
  const expectedWinPct = clamp(0.3 + pointsRatio * 0.4, 0.1, 0.9)
  const luckDelta = winPct - expectedWinPct

  // Map to 0-100 scale where 50 = neutral
  return clamp(Math.round(50 + luckDelta * 150), 0, 100)
}

function performanceLabelFromLuck(luck: number): 'overperforming' | 'underperforming' | 'on_pace' {
  if (luck >= 60) return 'overperforming'
  if (luck <= 40) return 'underperforming'
  return 'on_pace'
}

// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------

function computeRecommendation(
  team: LeagueIntelInput['teams'][0],
  card: Partial<TeamIntelCard>,
  isDynasty: boolean,
): { action: RecommendedAction; explanation: string } {
  const champ = card.championshipWindowScore ?? 0
  const health = card.rosterHealthScore ?? 50
  const depth = card.depthScore ?? 50
  const future = card.futureAssetScore ?? 50

  if (champ >= 75 && health >= 60) {
    return {
      action: 'push_for_title',
      explanation: 'Championship window is wide open. Trade future assets for proven starters.',
    }
  }

  if (champ >= 60 && depth < 40) {
    return {
      action: 'buy_depth',
      explanation: 'Starting lineup is strong but depth is thin. One injury could derail the season.',
    }
  }

  if (champ >= 55 && team.needs.length >= 2) {
    return {
      action: 'address_weakness',
      explanation: `Needs help at ${team.needs.slice(0, 2).join(' and ')}. Targeted trades could push into contention.`,
    }
  }

  if (card.category === 'playoff_bubble') {
    return {
      action: 'trade_for_win_now',
      explanation: 'On the bubble — a strategic trade for a proven starter could secure a playoff spot.',
    }
  }

  if (health < 40 && isDynasty) {
    return {
      action: 'sell_aging_assets',
      explanation: 'Aging core is a ticking clock. Sell veterans for youth and picks before value craters.',
    }
  }

  if (card.category === 'retooling' || card.category === 'middle_pack') {
    return isDynasty
      ? { action: 'accumulate_picks', explanation: 'Stuck in the middle. Accumulate draft capital to accelerate the rebuild.' }
      : { action: 'hold_steady', explanation: 'Middle of the pack. Monitor for trade opportunities but don\'t overpay.' }
  }

  if (card.category === 'rebuilding' || card.category === 'tanking') {
    return isDynasty
      ? { action: 'trade_for_youth', explanation: 'Full rebuild mode. Target young players and early draft picks.' }
      : { action: 'start_rebuild', explanation: 'Season is lost. Focus on finding value for next year\'s keeper picks.' }
  }

  return { action: 'hold_steady', explanation: 'No urgent moves needed. Monitor and react to opportunities.' }
}

// ---------------------------------------------------------------------------
// Risk & Trend
// ---------------------------------------------------------------------------

function computeRiskLevel(card: Partial<TeamIntelCard>): 'low' | 'medium' | 'high' | 'extreme' {
  let risk = 0
  if ((card.rosterHealthScore ?? 50) < 40) risk += 1
  if ((card.depthScore ?? 50) < 35) risk += 1
  if ((card.championshipWindowScore ?? 50) < 30) risk += 1
  if ((card.riskFlags?.length ?? 0) >= 3) risk += 1

  if (risk >= 3) return 'extreme'
  if (risk >= 2) return 'high'
  if (risk >= 1) return 'medium'
  return 'low'
}

function computeTrend(team: LeagueIntelInput['teams'][0], luck: number): TeamTrend {
  const winPct = (team.wins + team.losses) > 0 ? team.wins / (team.wins + team.losses) : 0.5
  if (luck >= 65 && winPct >= 0.6) return 'rising'
  if (luck <= 35 && winPct <= 0.4) return 'falling'
  if (Math.abs(luck - 50) >= 15) return 'volatile'
  return 'stable'
}

function buildRiskFlags(team: LeagueIntelInput['teams'][0], card: Partial<TeamIntelCard>): string[] {
  const flags: string[] = []
  if ((card.rosterHealthScore ?? 50) < 40) flags.push('poor_roster_health')
  if ((card.depthScore ?? 50) < 35) flags.push('thin_depth')
  if (team.needs.length >= 3) flags.push('multiple_needs')
  if ((team.agingAssetCount ?? 0) >= 3) flags.push('aging_core')
  if ((team.injuredPlayerCount ?? 0) >= 2) flags.push('injury_stacking')
  if ((card.luckScore ?? 50) >= 70) flags.push('unsustainable_luck')
  if ((card.luckScore ?? 50) <= 30) flags.push('bad_luck_underperformer')
  return flags
}

function buildFutureOutlook(card: Partial<TeamIntelCard>, isDynasty: boolean): string {
  const champ = card.championshipWindowScore ?? 0
  const future = card.futureAssetScore ?? 50
  const health = card.rosterHealthScore ?? 50

  if (champ >= 75 && health >= 60) return 'Championship contender with a healthy core. Win-now window is open.'
  if (champ >= 60) return 'Competitive roster with playoff upside. Could push for a title with the right moves.'
  if (future >= 70 && isDynasty) return 'Strong future assets. Rebuild is progressing well — patience will pay off.'
  if (health < 40) return 'Aging/injured roster is a concern. Value will decline without action.'
  if (card.category === 'middle_pack') return 'Stuck in the middle. Needs to pick a direction — push in or pivot out.'
  return 'Standard outlook. Monitor for opportunities.'
}

function findBiggestStrength(team: LeagueIntelInput['teams'][0], card: Partial<TeamIntelCard>): string {
  if ((card.championshipWindowScore ?? 0) >= 75) return 'Elite championship window'
  if (team.starterStrengthIndex >= 80) return 'Dominant starting lineup'
  if ((card.futureAssetScore ?? 0) >= 70) return 'Loaded with future assets'
  if ((card.depthScore ?? 0) >= 70) return 'Deep bench'
  if (team.surplus.length > 0) return `Surplus at ${team.surplus[0]}`
  return 'Balanced roster'
}

function findBiggestWeakness(team: LeagueIntelInput['teams'][0], card: Partial<TeamIntelCard>): string {
  if (team.needs.length > 0) return `Needs ${team.needs[0]}`
  if ((card.depthScore ?? 50) < 35) return 'Thin bench depth'
  if ((card.rosterHealthScore ?? 50) < 40) return 'Poor roster health (aging/injuries)'
  if ((card.futureAssetScore ?? 50) < 30) return 'No future capital'
  if ((card.championshipWindowScore ?? 50) < 30) return 'No realistic path to championship'
  return 'No major weakness'
}

// ---------------------------------------------------------------------------
// Power Score (composite)
// ---------------------------------------------------------------------------

function computePowerScore(
  team: LeagueIntelInput['teams'][0],
  card: Partial<TeamIntelCard>,
  isDynasty: boolean,
): number {
  const health = card.rosterHealthScore ?? 50
  const depth = card.depthScore ?? 50
  const future = card.futureAssetScore ?? 50
  const champ = card.championshipWindowScore ?? 50

  // Weight depends on format
  const weights = isDynasty
    ? { champ: 0.30, health: 0.20, depth: 0.20, future: 0.30 }
    : { champ: 0.45, health: 0.20, depth: 0.25, future: 0.10 }

  return clamp(Math.round(
    champ * weights.champ +
    health * weights.health +
    depth * weights.depth +
    future * weights.future
  ), 0, 100)
}

// ---------------------------------------------------------------------------
// League-Wide Insights
// ---------------------------------------------------------------------------

function computeLeagueInsights(cards: TeamIntelCard[]): LeagueWideInsights {
  const sorted = [...cards].sort((a, b) => b.powerScore - a.powerScore)

  // Strongest team
  const strongest = sorted[0]

  // Most overrated: lucky + high rank but mediocre roster
  const overrated = sorted.find(c =>
    c.luckScore >= 60 && c.performanceLabel === 'overperforming' && c.rosterHealthScore < 55,
  )

  // Most dangerous underdog: unlucky + strong roster
  const underdog = sorted.find(c =>
    c.luckScore <= 40 && c.championshipWindowScore >= 55 && c.performanceLabel === 'underperforming',
  )

  // Best rebuild: highest future asset score among rebuilders
  const rebuilders = sorted.filter(c => c.category === 'rebuilding' || c.category === 'retooling')
  const bestRebuild = rebuilders.sort((a, b) => b.futureAssetScore - a.futureAssetScore)[0]

  // Best trade target: team with surplus at positions others need
  const tradeTarget = sorted.find(c => c.surplus.length >= 2 && c.category !== 'elite_contender')

  // Volatility ranking
  const volatilityRanking = [...cards]
    .map(c => ({
      teamName: c.teamName,
      volatility: Math.abs(c.luckScore - 50) + (c.riskFlags.length * 5),
    }))
    .sort((a, b) => b.volatility - a.volatility)
    .slice(0, 5)

  // League competitiveness
  const topScore = sorted[0]?.powerScore ?? 0
  const bottomScore = sorted[sorted.length - 1]?.powerScore ?? 0
  const spread = topScore - bottomScore
  const competitiveness: LeagueWideInsights['leagueCompetitiveness'] =
    spread <= 25 ? 'tight' : spread <= 40 ? 'moderate' : 'lopsided'

  return {
    strongestTeam: { teamName: strongest?.teamName ?? '', reason: strongest?.biggestStrength ?? '' },
    mostOverratedTeam: overrated
      ? { teamName: overrated.teamName, reason: `${overrated.performanceLabel} — record exceeds roster quality (luck score: ${overrated.luckScore})` }
      : null,
    mostDangerousUnderdog: underdog
      ? { teamName: underdog.teamName, reason: `Strong roster (${underdog.championshipWindowScore}/100 window) but unlucky record` }
      : null,
    bestRebuild: bestRebuild
      ? { teamName: bestRebuild.teamName, reason: `Future asset score ${bestRebuild.futureAssetScore}/100 — rebuild is on track` }
      : null,
    bestTradeTargetRoster: tradeTarget
      ? { teamName: tradeTarget.teamName, reason: `Surplus at ${tradeTarget.surplus.join(', ')} — trade partners should target this roster` }
      : null,
    volatilityRanking,
    leagueCompetitiveness: competitiveness,
    contenderCount: cards.filter(c => c.category === 'elite_contender' || c.category === 'contender').length,
    rebuilderCount: cards.filter(c => c.category === 'rebuilding' || c.category === 'tanking').length,
  }
}

// ---------------------------------------------------------------------------
// Main Entry Point
// ---------------------------------------------------------------------------

export function computeLeagueIntel(input: LeagueIntelInput): LeagueIntelResult {
  const leagueAvgValue = input.teams.reduce((s, t) => s + t.totalValue, 0) / (input.teams.length || 1)
  const leagueAvgBench = input.teams.reduce((s, t) => s + t.benchValue, 0) / (input.teams.length || 1)
  const leagueAvgPicks = input.teams.reduce((s, t) => s + t.pickValue, 0) / (input.teams.length || 1)

  const cards: TeamIntelCard[] = input.teams.map((team) => {
    // Dimension scores
    const rosterHealthScore = computeRosterHealthScore(team)
    const depthScore = computeDepthScore(team, leagueAvgBench)
    const futureAssetScore = computeFutureAssetScore(team, leagueAvgPicks, input.isDynasty)
    const championshipWindowScore = computeChampionshipWindowScore(team, leagueAvgValue)
    const luckScore = computeLuckScore(team, input.leagueAvgPoints)
    const performanceLabel = performanceLabelFromLuck(luckScore)

    const partial: Partial<TeamIntelCard> = {
      rosterHealthScore,
      depthScore,
      futureAssetScore,
      championshipWindowScore,
      luckScore,
      performanceLabel,
    }

    const powerScore = computePowerScore(team, partial, input.isDynasty)
    const category = categoryFromTierAndScore(team.contenderTier, powerScore, team.wins, team.losses)
    const trend = computeTrend(team, luckScore)
    const riskFlags = buildRiskFlags(team, partial)

    partial.powerScore = powerScore
    partial.category = category
    partial.riskFlags = riskFlags

    const { action, explanation } = computeRecommendation(team, partial, input.isDynasty)

    return {
      rosterId: team.rosterId,
      teamName: team.teamName,
      managerId: team.managerId ?? null,
      grade: gradeFromScore(powerScore),
      powerScore,
      rosterHealthScore,
      depthScore,
      futureAssetScore,
      championshipWindowScore,
      category,
      trend,
      riskLevel: computeRiskLevel(partial),
      biggestStrength: findBiggestStrength(team, partial),
      biggestWeakness: findBiggestWeakness(team, partial),
      recommendedAction: action,
      recommendationExplanation: explanation,
      futureOutlook: buildFutureOutlook(partial, input.isDynasty),
      needs: team.needs,
      surplus: team.surplus,
      starterValue: team.starterValue,
      benchValue: team.benchValue,
      pickValue: team.pickValue,
      luckScore,
      performanceLabel,
      riskFlags,
    }
  })

  // Sort by power score
  cards.sort((a, b) => b.powerScore - a.powerScore)

  const leagueInsights = computeLeagueInsights(cards)

  return {
    teamCards: cards,
    leagueInsights,
    computedAt: new Date().toISOString(),
  }
}
