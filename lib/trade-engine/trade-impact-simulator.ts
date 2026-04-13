/**
 * Trade Impact Monte Carlo Simulator
 *
 * Runs 1,000–10,000 simulations per trade to compute championship %
 * before/after and classify the trade impact.
 *
 * Includes: weekly projections, injury randomness, matchup strength,
 * schedule difficulty, precomputed distributions, and player variance caching.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlayerProjection {
  playerId: string
  name: string
  position: string
  /** Expected weekly fantasy points */
  weeklyMean: number
  /** Weekly standard deviation */
  weeklyStdDev: number
  /** Probability of missing any given week (0-1) */
  injuryRate: number
  /** Age — affects injury rate scaling */
  age: number | null
}

export interface TeamSimProfile {
  teamId: string
  name: string
  /** All rostered players with projections */
  players: PlayerProjection[]
  /** Current record */
  wins: number
  losses: number
  pointsFor: number
  /** Precomputed team-level projection (sum of starters) */
  weeklyMean: number
  weeklyStdDev: number
}

export interface ScheduleMatchup {
  opponentId: string
  week: number
  /** Matchup strength modifier (-0.15 to +0.15) — positive = harder */
  strengthModifier: number
}

export interface TradeImpactSimInput {
  /** All teams in the league with projections */
  teams: TeamSimProfile[]
  /** Index of the team being evaluated */
  targetTeamIndex: number
  /** Remaining schedule for each team (teamId → matchups) */
  schedules: Map<string, ScheduleMatchup[]>
  /** Number of playoff spots */
  playoffSpots: number
  /** Number of bye spots */
  byeSpots: number
  /** Mean PPG delta from the trade (positive = team improves) */
  tradeMeanDelta: number
  /** StdDev change from the trade */
  tradeStdDevDelta: number
  /** Player-level changes for injury simulation */
  playersGained: PlayerProjection[]
  playersLost: PlayerProjection[]
  /** Number of simulations (1000-10000, auto-capped) */
  iterations?: number
}

export type TradeImpactClassification =
  | 'major_win'      // +5%
  | 'strong_win'     // +2% to +5%
  | 'minor_edge'     // 0% to +2%
  | 'neutral'        // ~0%
  | 'negative_trade'  // <0%

export interface TradeImpactResult {
  /** Championship % before trade (0-100) */
  championshipBefore: number
  /** Championship % after trade (0-100) */
  championshipAfter: number
  /** Delta in percentage points */
  delta: number
  /** Classification of the trade impact */
  classification: TradeImpactClassification
  /** Human-readable label */
  classificationLabel: string
  /** Playoff probability before/after */
  playoffBefore: number
  playoffAfter: number
  playoffDelta: number
  /** Expected wins before/after */
  expectedWinsBefore: number
  expectedWinsAfter: number
  /** Simulation metadata */
  meta: {
    iterations: number
    injuryEventsTotal: number
    avgInjuriesPerSim: number
    scheduleDifficultyRating: number
    confidenceScore: number
    computeTimeMs: number
  }
  /** Weekly projection samples (percentiles) */
  weeklyProjection: WeeklyProjectionSample[]
}

export interface WeeklyProjectionSample {
  week: number
  /** Projected score percentiles after trade */
  p10: number
  p25: number
  p50: number
  p75: number
  p90: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_ITERATIONS = 1000
const MAX_ITERATIONS_DEV = 10000
const MAX_ITERATIONS_PROD = 5000

/** Age-based injury rate multiplier */
const AGE_INJURY_MULTIPLIER: [number, number][] = [
  [23, 0.8],
  [25, 0.9],
  [27, 1.0],
  [29, 1.2],
  [31, 1.4],
  [33, 1.7],
  [35, 2.0],
]

// ---------------------------------------------------------------------------
// Precomputed Distribution Cache
// ---------------------------------------------------------------------------

// Player variance cache uses the PLAYER_VARIANCE_CACHE below for per-player caching.

// Distribution cache is available for future use when batch sampling is needed.
// Individual simulations use randomNormal() directly for per-call variance.

// ---------------------------------------------------------------------------
// Player Variance Cache
// ---------------------------------------------------------------------------

interface PlayerVarianceEntry {
  weeklyMean: number
  weeklyStdDev: number
  injuryRate: number
  effectiveInjuryRate: number // age-adjusted
  computedAt: number
}

const PLAYER_VARIANCE_CACHE = new Map<string, PlayerVarianceEntry>()
const PLAYER_VARIANCE_TTL_MS = 20 * 60 * 1000 // 20 minutes

function getPlayerVariance(player: PlayerProjection): PlayerVarianceEntry {
  const cached = PLAYER_VARIANCE_CACHE.get(player.playerId)
  if (cached && Date.now() - cached.computedAt < PLAYER_VARIANCE_TTL_MS) {
    return cached
  }

  // Age-adjusted injury rate
  let injuryMultiplier = 1.0
  if (player.age != null) {
    for (const [ageThreshold, mult] of AGE_INJURY_MULTIPLIER) {
      if (player.age <= ageThreshold) {
        injuryMultiplier = mult
        break
      }
    }
    if (player.age > 35) injuryMultiplier = 2.0
  }

  const entry: PlayerVarianceEntry = {
    weeklyMean: player.weeklyMean,
    weeklyStdDev: player.weeklyStdDev,
    injuryRate: player.injuryRate,
    effectiveInjuryRate: Math.min(0.5, player.injuryRate * injuryMultiplier),
    computedAt: Date.now(),
  }

  PLAYER_VARIANCE_CACHE.set(player.playerId, entry)
  return entry
}

// ---------------------------------------------------------------------------
// Core Functions
// ---------------------------------------------------------------------------

function randomNormal(mean: number, stdDev: number): number {
  const u = 1 - Math.random()
  const v = Math.random()
  return mean + stdDev * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function capIterations(requested: number): number {
  const isProd = process.env.NODE_ENV === 'production'
  const max = isProd ? MAX_ITERATIONS_PROD : MAX_ITERATIONS_DEV
  return Math.max(MIN_ITERATIONS, Math.min(requested, max))
}

function getAgeInjuryMultiplier(age: number | null): number {
  if (age == null) return 1.0
  for (const [threshold, mult] of AGE_INJURY_MULTIPLIER) {
    if (age <= threshold) return mult
  }
  return 2.0
}

/**
 * Simulate one week's score for a team, accounting for:
 * - Per-player injury randomness
 * - Matchup strength modifier
 * - Weekly variance from precomputed distributions
 */
function simulateWeekScore(
  team: TeamSimProfile,
  matchup: ScheduleMatchup | null,
): { score: number; injuryEvents: number } {
  let totalScore = 0
  let injuryEvents = 0

  // If we have player-level data, simulate per-player
  if (team.players.length > 0) {
    for (const player of team.players) {
      const variance = getPlayerVariance(player)

      // Injury check — if injured, contribute 0 (or replacement-level)
      if (Math.random() < variance.effectiveInjuryRate) {
        injuryEvents++
        // Replacement-level contribution (waiver wire pickup)
        totalScore += Math.max(0, randomNormal(3, 2))
        continue
      }

      // Healthy: sample from player's distribution
      totalScore += Math.max(0, randomNormal(variance.weeklyMean, variance.weeklyStdDev))
    }
  } else {
    // Fallback to team-level projection
    totalScore = Math.max(0, randomNormal(team.weeklyMean, team.weeklyStdDev))
  }

  // Apply matchup strength modifier
  if (matchup) {
    // Modifier is -0.15 to +0.15 where positive = harder matchup
    // Convert to score adjustment (e.g., +0.10 harder → -5% points)
    totalScore *= (1 - matchup.strengthModifier * 0.33)
  }

  return { score: totalScore, injuryEvents }
}

/**
 * Run one full season simulation with all enhancements.
 * Returns final standings sorted by wins then points.
 */
function runOneEnhancedSimulation(
  teams: TeamSimProfile[],
  schedules: Map<string, ScheduleMatchup[]>,
): { standings: SimStanding[]; injuryEvents: number } {
  const wins = new Map<string, number>()
  const losses = new Map<string, number>()
  const pointsFor = new Map<string, number>()
  let totalInjuryEvents = 0

  for (const team of teams) {
    wins.set(team.teamId, team.wins)
    losses.set(team.teamId, team.losses)
    pointsFor.set(team.teamId, team.pointsFor)
  }

  // Get all weeks from all schedules
  const allWeeks = new Set<number>()
  for (const matchups of schedules.values()) {
    for (const m of matchups) allWeeks.add(m.week)
  }
  const weeks = [...allWeeks].sort((a, b) => a - b)

  for (const week of weeks) {
    // Build matchup pairs for this week
    const processed = new Set<string>()

    for (const team of teams) {
      if (processed.has(team.teamId)) continue

      const schedule = schedules.get(team.teamId)
      const matchup = schedule?.find(m => m.week === week)
      if (!matchup) continue

      const oppTeam = teams.find(t => t.teamId === matchup.opponentId)
      if (!oppTeam || processed.has(oppTeam.teamId)) continue

      processed.add(team.teamId)
      processed.add(oppTeam.teamId)

      const oppSchedule = schedules.get(oppTeam.teamId)
      const oppMatchup = oppSchedule?.find(m => m.week === week)

      const resultA = simulateWeekScore(team, matchup)
      const resultB = simulateWeekScore(oppTeam, oppMatchup ?? null)

      totalInjuryEvents += resultA.injuryEvents + resultB.injuryEvents

      pointsFor.set(team.teamId, (pointsFor.get(team.teamId) ?? 0) + resultA.score)
      pointsFor.set(oppTeam.teamId, (pointsFor.get(oppTeam.teamId) ?? 0) + resultB.score)

      if (Math.abs(resultA.score - resultB.score) < 0.01) {
        // Tie — award win to higher scorer (fantasy tiebreaker: total points)
        if (resultA.score >= resultB.score) {
          wins.set(team.teamId, (wins.get(team.teamId) ?? 0) + 1)
          losses.set(oppTeam.teamId, (losses.get(oppTeam.teamId) ?? 0) + 1)
        } else {
          wins.set(oppTeam.teamId, (wins.get(oppTeam.teamId) ?? 0) + 1)
          losses.set(team.teamId, (losses.get(team.teamId) ?? 0) + 1)
        }
      } else if (resultA.score > resultB.score) {
        wins.set(team.teamId, (wins.get(team.teamId) ?? 0) + 1)
        losses.set(oppTeam.teamId, (losses.get(oppTeam.teamId) ?? 0) + 1)
      } else {
        wins.set(oppTeam.teamId, (wins.get(oppTeam.teamId) ?? 0) + 1)
        losses.set(team.teamId, (losses.get(team.teamId) ?? 0) + 1)
      }
    }
  }

  const standings: SimStanding[] = teams.map(t => ({
    teamId: t.teamId,
    wins: wins.get(t.teamId) ?? 0,
    losses: losses.get(t.teamId) ?? 0,
    pointsFor: pointsFor.get(t.teamId) ?? 0,
    seed: 0,
  }))

  standings.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins
    return b.pointsFor - a.pointsFor
  })
  standings.forEach((s, i) => { s.seed = i + 1 })

  return { standings, injuryEvents: totalInjuryEvents }
}

interface SimStanding {
  teamId: string
  wins: number
  losses: number
  pointsFor: number
  seed: number
}

/**
 * Run playoff bracket from standings.
 */
function runPlayoffBracket(
  standings: SimStanding[],
  playoffSpots: number,
  teams: TeamSimProfile[],
): string | null {
  const playoffTeams = standings.filter(s => s.seed <= playoffSpots)
  if (playoffTeams.length < 2) return playoffTeams[0]?.teamId ?? null

  // Bracket seeding: standard 1-vs-last pairing for any size
  const n = playoffTeams.length
  const seedOrder = buildBracketSeedOrder(n)

  const teamMap = new Map(teams.map(t => [t.teamId, t]))
  let bracket = seedOrder
    .map(seed => playoffTeams.find(t => t.seed === seed))
    .filter((t): t is SimStanding => t != null)
    .map(t => t.teamId)

  while (bracket.length > 1) {
    const next: string[] = []
    for (let i = 0; i < bracket.length; i += 2) {
      if (i + 1 >= bracket.length) {
        next.push(bracket[i])
        continue
      }
      const a = teamMap.get(bracket[i])
      const b = teamMap.get(bracket[i + 1])
      const scoreA = randomNormal(a?.weeklyMean ?? 100, a?.weeklyStdDev ?? 15)
      const scoreB = randomNormal(b?.weeklyMean ?? 100, b?.weeklyStdDev ?? 15)
      next.push(scoreA >= scoreB ? bracket[i] : bracket[i + 1])
    }
    bracket = next
  }

  return bracket[0] ?? null
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

/**
 * Build standard bracket seed pairing for any playoff size.
 * Pairs 1 vs N, 2 vs N-1, etc. with proper bracket positioning.
 */
function buildBracketSeedOrder(n: number): number[] {
  // Standard known sizes
  if (n === 8) return [1, 8, 4, 5, 2, 7, 3, 6]
  if (n === 6) return [1, 6, 3, 4, 2, 5]
  if (n === 4) return [1, 4, 2, 3]
  if (n === 2) return [1, 2]
  if (n <= 1) return [1]

  // For any other size: pair 1vsN, then recurse for remaining
  const order: number[] = []
  const half = Math.ceil(n / 2)
  for (let i = 0; i < half; i++) {
    order.push(i + 1)
    const opponent = n - i
    if (opponent > half) order.push(opponent)
  }
  return order.slice(0, n)
}

function classifyDelta(delta: number): {
  classification: TradeImpactClassification
  label: string
} {
  if (delta >= 5) return { classification: 'major_win', label: 'Major Win (+5%+)' }
  if (delta >= 2) return { classification: 'strong_win', label: 'Strong Win (+2-5%)' }
  if (delta > 0.5) return { classification: 'minor_edge', label: 'Minor Edge (+0.5-2%)' }
  if (delta >= -0.5) return { classification: 'neutral', label: 'Neutral (~0%)' }
  return { classification: 'negative_trade', label: `Negative Trade (${delta.toFixed(1)}%)` }
}

function computeScheduleDifficulty(
  schedules: Map<string, ScheduleMatchup[]>,
  targetTeamId: string,
): number {
  const schedule = schedules.get(targetTeamId)
  if (!schedule || schedule.length === 0) return 0.5

  const avg = schedule.reduce((sum, m) => sum + m.strengthModifier, 0) / schedule.length
  // Normalize to 0-1 scale (0 = easiest, 1 = hardest)
  return Math.max(0, Math.min(1, 0.5 + avg * 3.33))
}

function computeConfidence(iterations: number, weekCount: number): number {
  const simScore = iterations >= 5000 ? 100 : iterations >= 2000 ? 75 : Math.round((iterations / 2000) * 75)
  const dataScore = weekCount >= 10 ? 100 : Math.round((weekCount / 10) * 100)
  return Math.round(0.6 * simScore + 0.4 * dataScore)
}

// ---------------------------------------------------------------------------
// Weekly Projection Sampling
// ---------------------------------------------------------------------------

function sampleWeeklyProjections(
  team: TeamSimProfile,
  weekCount: number,
  sampleSize: number,
): WeeklyProjectionSample[] {
  const results: WeeklyProjectionSample[] = []

  for (let week = 1; week <= weekCount; week++) {
    const scores: number[] = []
    for (let i = 0; i < sampleSize; i++) {
      let total = 0
      for (const player of team.players) {
        const variance = getPlayerVariance(player)
        if (Math.random() < variance.effectiveInjuryRate) {
          total += Math.max(0, randomNormal(3, 2))
        } else {
          total += Math.max(0, randomNormal(variance.weeklyMean, variance.weeklyStdDev))
        }
      }
      // Fallback if no players
      if (team.players.length === 0) {
        total = Math.max(0, randomNormal(team.weeklyMean, team.weeklyStdDev))
      }
      scores.push(total)
    }

    scores.sort((a, b) => a - b)
    const pct = (p: number) => scores[Math.min(scores.length - 1, Math.floor(p * scores.length))]

    results.push({
      week,
      p10: Math.round(pct(0.10) * 10) / 10,
      p25: Math.round(pct(0.25) * 10) / 10,
      p50: Math.round(pct(0.50) * 10) / 10,
      p75: Math.round(pct(0.75) * 10) / 10,
      p90: Math.round(pct(0.90) * 10) / 10,
    })
  }

  return results
}

// ---------------------------------------------------------------------------
// Main Entry Point
// ---------------------------------------------------------------------------

/**
 * Run a full Monte Carlo trade impact simulation.
 *
 * Computes championship % before/after the trade, classifies the impact,
 * and returns detailed metadata including injury events and weekly projections.
 */
export function simulateTradeImpact(input: TradeImpactSimInput): TradeImpactResult {
  const startTime = Date.now()
  const iterations = capIterations(input.iterations ?? 3000)
  const targetTeam = input.teams[input.targetTeamIndex]

  if (!targetTeam) {
    return emptyResult(iterations, Date.now() - startTime)
  }

  // --- Build "after trade" version of target team ---
  const afterTeam: TeamSimProfile = {
    ...targetTeam,
    weeklyMean: targetTeam.weeklyMean + input.tradeMeanDelta,
    weeklyStdDev: Math.max(1, targetTeam.weeklyStdDev + input.tradeStdDevDelta),
    players: [
      // Remove lost players
      ...targetTeam.players.filter(
        p => !input.playersLost.some(l => l.playerId === p.playerId),
      ),
      // Add gained players
      ...input.playersGained,
    ],
  }

  const beforeTeams = input.teams
  const afterTeams = input.teams.map((t, i) =>
    i === input.targetTeamIndex ? afterTeam : t,
  )

  // --- Run simulations ---
  let beforeChampWins = 0
  let afterChampWins = 0
  let beforePlayoffCount = 0
  let afterPlayoffCount = 0
  let beforeTotalWins = 0
  let afterTotalWins = 0
  let totalInjuryEvents = 0

  for (let sim = 0; sim < iterations; sim++) {
    // Before trade
    const beforeSim = runOneEnhancedSimulation(beforeTeams, input.schedules)
    const beforeStanding = beforeSim.standings.find(s => s.teamId === targetTeam.teamId)
    if (beforeStanding) {
      beforeTotalWins += beforeStanding.wins
      if (beforeStanding.seed <= input.playoffSpots) {
        beforePlayoffCount++
        const winner = runPlayoffBracket(beforeSim.standings, input.playoffSpots, beforeTeams)
        if (winner === targetTeam.teamId) beforeChampWins++
      }
    }

    // After trade
    const afterSim = runOneEnhancedSimulation(afterTeams, input.schedules)
    const afterStanding = afterSim.standings.find(s => s.teamId === targetTeam.teamId)
    if (afterStanding) {
      afterTotalWins += afterStanding.wins
      if (afterStanding.seed <= input.playoffSpots) {
        afterPlayoffCount++
        const winner = runPlayoffBracket(afterSim.standings, input.playoffSpots, afterTeams)
        if (winner === targetTeam.teamId) afterChampWins++
      }
    }

    totalInjuryEvents += beforeSim.injuryEvents + afterSim.injuryEvents
  }

  // --- Compute results ---
  const championshipBefore = Math.round((beforeChampWins / iterations) * 10000) / 100
  const championshipAfter = Math.round((afterChampWins / iterations) * 10000) / 100
  const delta = Math.round((championshipAfter - championshipBefore) * 100) / 100

  const playoffBefore = Math.round((beforePlayoffCount / iterations) * 10000) / 100
  const playoffAfter = Math.round((afterPlayoffCount / iterations) * 10000) / 100

  const expectedWinsBefore = Math.round((beforeTotalWins / iterations) * 10) / 10
  const expectedWinsAfter = Math.round((afterTotalWins / iterations) * 10) / 10

  const { classification, label } = classifyDelta(delta)

  // Schedule difficulty for target team
  const scheduleDifficultyRating = computeScheduleDifficulty(input.schedules, targetTeam.teamId)

  // Weekly projections (sample with after-trade roster)
  const remainingWeeks = input.schedules.get(targetTeam.teamId)?.length ?? 0
  const weeklyProjection = sampleWeeklyProjections(
    afterTeam,
    Math.min(remainingWeeks, 14),
    Math.min(500, iterations),
  )

  const computeTimeMs = Date.now() - startTime

  return {
    championshipBefore,
    championshipAfter,
    delta,
    classification,
    classificationLabel: label,
    playoffBefore,
    playoffAfter,
    playoffDelta: Math.round((playoffAfter - playoffBefore) * 100) / 100,
    expectedWinsBefore,
    expectedWinsAfter,
    meta: {
      iterations,
      injuryEventsTotal: totalInjuryEvents,
      avgInjuriesPerSim: Math.round((totalInjuryEvents / (iterations * 2)) * 10) / 10,
      scheduleDifficultyRating: Math.round(scheduleDifficultyRating * 100) / 100,
      confidenceScore: computeConfidence(iterations, remainingWeeks),
      computeTimeMs,
    },
    weeklyProjection,
  }
}

function emptyResult(iterations: number, computeTimeMs: number): TradeImpactResult {
  return {
    championshipBefore: 0,
    championshipAfter: 0,
    delta: 0,
    classification: 'neutral',
    classificationLabel: 'Unable to simulate',
    playoffBefore: 0,
    playoffAfter: 0,
    playoffDelta: 0,
    expectedWinsBefore: 0,
    expectedWinsAfter: 0,
    meta: {
      iterations,
      injuryEventsTotal: 0,
      avgInjuriesPerSim: 0,
      scheduleDifficultyRating: 0.5,
      confidenceScore: 0,
      computeTimeMs,
    },
    weeklyProjection: [],
  }
}

/**
 * Clear cached distributions and player variance.
 * Call this when player data is refreshed.
 */
export function clearSimulationCaches(): void {
  PLAYER_VARIANCE_CACHE.clear()
}
