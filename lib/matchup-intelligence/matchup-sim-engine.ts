/**
 * Enhanced Matchup Simulation Engine
 *
 * Layers premium intelligence on top of the existing Monte Carlo and
 * DeterministicMatchupEngine. Adds:
 * - Injury-adjusted projections (Q/D/O status → volatility + projection multipliers)
 * - Player-level leverage scoring (swing player ranking)
 * - Boom/bust exposure detection
 * - Scenario analysis (underdog path, favored path, ceiling, safe-floor)
 * - Win/loss condition narratives
 *
 * Reuses: ScoreDistributionModel, randomNormal, existing simulation types.
 */

import { sampleScoreDistribution, percentiles } from '@/lib/simulation-engine/ScoreDistributionModel'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InjuryDesignation = 'healthy' | 'questionable' | 'doubtful' | 'out' | 'ir' | 'unknown'

export interface SimPlayer {
  playerId: string
  name: string
  position: string
  team: string | null
  projection: number       // expected fantasy points
  floor: number
  ceiling: number
  stdDev: number           // weekly variance
  injuryStatus: InjuryDesignation
  /** Weather adjustment factor (1.0 = none, <1.0 = negative, >1.0 = positive) */
  weatherFactor: number
}

export interface SimTeam {
  teamId: string
  teamName: string
  lineup: SimPlayer[]
}

export interface MatchupSimInput {
  teamA: SimTeam
  teamB: SimTeam
  iterations?: number
  sport?: string
}

export type SimMode = 'standard' | 'underdog_path' | 'favored_path' | 'ceiling_path' | 'safe_floor_path'

export interface SwingPlayer {
  name: string
  position: string
  team: 'A' | 'B'
  leverageScore: number     // 0-100
  boomProbability: number   // 0-1
  bustProbability: number   // 0-1
  projectedRange: [number, number]
  impactDescription: string
}

export interface ScenarioResult {
  mode: SimMode
  winPctA: number
  winPctB: number
  medianA: number
  medianB: number
  description: string
}

export interface WinLoseCondition {
  type: 'must_win' | 'lose_scenario'
  description: string
  probability: number // 0-100
}

export interface MatchupSimResult {
  // Core outcomes
  teamAWinPct: number
  teamBWinPct: number
  medianOutcome: { teamA: number; teamB: number }
  scoreRanges: {
    teamA: { p10: number; p25: number; p50: number; p75: number; p90: number }
    teamB: { p10: number; p25: number; p50: number; p75: number; p90: number }
  }

  // Leverage & volatility
  keySwingPlayers: SwingPlayer[]
  xFactors: string[]
  riskNotes: string[]

  // Scenarios
  mustWinConditions: WinLoseCondition[]
  loseScenarios: WinLoseCondition[]
  scenarioResults: ScenarioResult[]

  // Metadata
  simulationCount: number
  confidencePct: number
  volatilityTag: 'low' | 'medium' | 'high'
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_ITERATIONS = 500
const MAX_ITERATIONS = 10000
const DEFAULT_ITERATIONS = 3000

/** Injury designation → (projection multiplier, volatility multiplier) */
const INJURY_ADJUSTMENTS: Record<InjuryDesignation, { projMult: number; volMult: number; playProb: number }> = {
  healthy:      { projMult: 1.00, volMult: 1.0,  playProb: 1.00 },
  questionable: { projMult: 0.90, volMult: 1.25, playProb: 0.75 },
  doubtful:     { projMult: 0.50, volMult: 1.50, playProb: 0.25 },
  out:          { projMult: 0.00, volMult: 0.00, playProb: 0.00 },
  ir:           { projMult: 0.00, volMult: 0.00, playProb: 0.00 },
  unknown:      { projMult: 0.85, volMult: 1.15, playProb: 0.85 },
}

const REPLACEMENT_LEVEL_POINTS = 4.0 // waiver-wire replacement level per game

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

function randomNormal(mean: number, stdDev: number): number {
  const u = 1 - Math.random()
  const v = Math.random()
  return mean + stdDev * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function round1(v: number): number {
  return Math.round(v * 10) / 10
}

// ---------------------------------------------------------------------------
// Injury-Adjusted Projection
// ---------------------------------------------------------------------------

function adjustForInjury(player: SimPlayer): { mean: number; stdDev: number } {
  const adj = INJURY_ADJUSTMENTS[player.injuryStatus] ?? INJURY_ADJUSTMENTS.healthy

  if (adj.playProb <= 0) {
    // Player won't play — replacement level
    return { mean: REPLACEMENT_LEVEL_POINTS, stdDev: 2.0 }
  }

  // Weighted: playProb * normal projection + (1-playProb) * replacement
  const normalMean = player.projection * adj.projMult * player.weatherFactor
  const normalStdDev = player.stdDev * adj.volMult

  const effectiveMean = normalMean * adj.playProb + REPLACEMENT_LEVEL_POINTS * (1 - adj.playProb)
  const effectiveStdDev = normalStdDev * adj.playProb + 2.0 * (1 - adj.playProb)

  return { mean: Math.max(0, effectiveMean), stdDev: Math.max(0.5, effectiveStdDev) }
}

// ---------------------------------------------------------------------------
// Single Simulation Run
// ---------------------------------------------------------------------------

function simulateOnce(teamA: SimPlayer[], teamB: SimPlayer[]): { scoreA: number; scoreB: number; playerScores: Map<string, number> } {
  let scoreA = 0
  let scoreB = 0
  const playerScores = new Map<string, number>()

  for (const player of teamA) {
    const { mean, stdDev } = adjustForInjury(player)
    const score = clamp(randomNormal(mean, stdDev), player.floor * 0.5, player.ceiling * 1.5)
    scoreA += score
    playerScores.set(player.playerId, score)
  }

  for (const player of teamB) {
    const { mean, stdDev } = adjustForInjury(player)
    const score = clamp(randomNormal(mean, stdDev), player.floor * 0.5, player.ceiling * 1.5)
    scoreB += score
    playerScores.set(player.playerId, score)
  }

  return { scoreA, scoreB, playerScores }
}

// ---------------------------------------------------------------------------
// Swing Player Analysis
// ---------------------------------------------------------------------------

function computeSwingPlayers(
  teamA: SimPlayer[],
  teamB: SimPlayer[],
  playerSimResults: Map<string, number[]>,
  iterations: number,
): SwingPlayer[] {
  const allPlayers = [
    ...teamA.map(p => ({ ...p, side: 'A' as const })),
    ...teamB.map(p => ({ ...p, side: 'B' as const })),
  ]

  return allPlayers
    .map((player) => {
      const scores = playerSimResults.get(player.playerId) ?? []
      if (scores.length === 0) return null

      const sorted = [...scores].sort((a, b) => a - b)
      const mean = scores.reduce((s, v) => s + v, 0) / scores.length
      const stdDev = Math.sqrt(scores.reduce((s, v) => s + (v - mean) ** 2, 0) / scores.length)

      const projectedRange: [number, number] = [
        round1(sorted[Math.floor(scores.length * 0.1)] ?? 0),
        round1(sorted[Math.floor(scores.length * 0.9)] ?? 0),
      ]

      // Boom = top 20% of personal ceiling
      const boomThreshold = player.projection * 1.5
      const boomProbability = scores.filter(s => s >= boomThreshold).length / iterations

      // Bust = below 40% of projection
      const bustThreshold = player.projection * 0.4
      const bustProbability = scores.filter(s => s <= bustThreshold).length / iterations

      // Leverage = how much this player's variance affects the matchup outcome
      const leverageScore = clamp(Math.round((stdDev / Math.max(mean, 1)) * 100 + (boomProbability * 30)), 0, 100)

      const impactDescription =
        boomProbability >= 0.25 ? 'High boom potential — league-winning upside this week' :
        bustProbability >= 0.30 ? 'Bust risk — could sink your week if they underperform' :
        leverageScore >= 60 ? 'High-variance play — outcome depends heavily on this player' :
        'Steady contributor — reliable but limited ceiling'

      return {
        name: player.name,
        position: player.position,
        team: player.side,
        leverageScore,
        boomProbability: round1(boomProbability),
        bustProbability: round1(bustProbability),
        projectedRange,
        impactDescription,
      }
    })
    .filter((p): p is SwingPlayer => p !== null)
    .sort((a, b) => b.leverageScore - a.leverageScore)
    .slice(0, 6)
}

// ---------------------------------------------------------------------------
// Scenario Analysis
// ---------------------------------------------------------------------------

function runScenarioMode(
  teamA: SimPlayer[],
  teamB: SimPlayer[],
  mode: SimMode,
  iterations: number,
): ScenarioResult {
  let winsA = 0
  const scoresA: number[] = []
  const scoresB: number[] = []

  for (let i = 0; i < iterations; i++) {
    const { scoreA, scoreB } = simulateOnce(teamA, teamB)

    // Filter based on scenario mode
    let include = true
    switch (mode) {
      case 'ceiling_path':
        include = scoreA > teamA.reduce((s, p) => s + p.projection * 1.2, 0) ||
                  scoreB > teamB.reduce((s, p) => s + p.projection * 1.2, 0)
        break
      case 'safe_floor_path':
        include = scoreA > teamA.reduce((s, p) => s + p.floor, 0) &&
                  scoreB > teamB.reduce((s, p) => s + p.floor, 0)
        break
      default:
        break
    }

    if (include) {
      scoresA.push(scoreA)
      scoresB.push(scoreB)
      if (scoreA > scoreB) winsA++
    }
  }

  const total = scoresA.length || 1
  const medianA = scoresA.length > 0 ? [...scoresA].sort((a, b) => a - b)[Math.floor(scoresA.length / 2)] : 0
  const medianB = scoresB.length > 0 ? [...scoresB].sort((a, b) => a - b)[Math.floor(scoresB.length / 2)] : 0

  const descriptions: Record<SimMode, string> = {
    standard: 'Standard simulation with all factors applied',
    underdog_path: 'Scenarios where the underdog overcomes the projected deficit',
    favored_path: 'Scenarios where the favorite wins as expected',
    ceiling_path: 'Scenarios where at least one team hits their ceiling',
    safe_floor_path: 'Scenarios where both teams hit at least their floor projections',
  }

  return {
    mode,
    winPctA: round1((winsA / total) * 100),
    winPctB: round1(((total - winsA) / total) * 100),
    medianA: round1(medianA),
    medianB: round1(medianB),
    description: descriptions[mode],
  }
}

// ---------------------------------------------------------------------------
// Win/Lose Condition Analysis
// ---------------------------------------------------------------------------

function analyzeWinLoseConditions(
  teamA: SimPlayer[],
  teamB: SimPlayer[],
  simResults: Array<{ scoreA: number; scoreB: number; playerScores: Map<string, number> }>,
): { mustWin: WinLoseCondition[]; loseScenarions: WinLoseCondition[] } {
  const mustWin: WinLoseCondition[] = []
  const loseScenarions: WinLoseCondition[] = []

  const wins = simResults.filter(r => r.scoreA > r.scoreB)
  const losses = simResults.filter(r => r.scoreA <= r.scoreB)
  const total = simResults.length

  // Analyze what happens in wins vs losses for each player
  for (const player of teamA) {
    const winScores = wins.map(r => r.playerScores.get(player.playerId) ?? 0)
    const lossScores = losses.map(r => r.playerScores.get(player.playerId) ?? 0)

    const avgInWins = winScores.length > 0 ? winScores.reduce((s, v) => s + v, 0) / winScores.length : 0
    const avgInLosses = lossScores.length > 0 ? lossScores.reduce((s, v) => s + v, 0) / lossScores.length : 0

    const gap = avgInWins - avgInLosses
    if (gap >= 5) {
      mustWin.push({
        type: 'must_win',
        description: `${player.name} averaging ${round1(avgInWins)} pts in wins vs ${round1(avgInLosses)} in losses — needs a big game`,
        probability: Math.round((winScores.filter(s => s >= avgInWins).length / (winScores.length || 1)) * 100),
      })
    }
  }

  // Opponent boom scenarios
  for (const player of teamB) {
    const boomThreshold = player.projection * 1.5
    const boomLossCount = losses.filter(r => (r.playerScores.get(player.playerId) ?? 0) >= boomThreshold).length

    if (boomLossCount > losses.length * 0.3 && losses.length > 0) {
      loseScenarions.push({
        type: 'lose_scenario',
        description: `${player.name} booming (${round1(boomThreshold)}+ pts) causes ${Math.round((boomLossCount / losses.length) * 100)}% of losses`,
        probability: Math.round((boomLossCount / total) * 100),
      })
    }
  }

  // Floor collapse scenario
  const floorCollapseCount = losses.filter(r => {
    const teamAFloor = teamA.reduce((s, p) => s + p.floor, 0)
    return r.scoreA < teamAFloor
  }).length

  if (floorCollapseCount > 0 && total > 0) {
    loseScenarions.push({
      type: 'lose_scenario',
      description: `Team A falling below floor projection causes ${Math.round((floorCollapseCount / total) * 100)}% of losses`,
      probability: Math.round((floorCollapseCount / total) * 100),
    })
  }

  return {
    mustWin: mustWin.sort((a, b) => b.probability - a.probability).slice(0, 4),
    loseScenarions: loseScenarions.sort((a, b) => b.probability - a.probability).slice(0, 4),
  }
}

// ---------------------------------------------------------------------------
// X-Factors & Risk Notes
// ---------------------------------------------------------------------------

function buildXFactors(teamA: SimPlayer[], teamB: SimPlayer[]): string[] {
  const factors: string[] = []
  const allPlayers = [...teamA, ...teamB]

  // Injury X-factors
  const questionablePlayers = allPlayers.filter(p => p.injuryStatus === 'questionable' || p.injuryStatus === 'doubtful')
  if (questionablePlayers.length > 0) {
    factors.push(`${questionablePlayers.length} player(s) with injury uncertainty: ${questionablePlayers.map(p => p.name).join(', ')}`)
  }

  // Weather X-factors
  const weatherImpacted = allPlayers.filter(p => Math.abs(p.weatherFactor - 1.0) > 0.05)
  if (weatherImpacted.length > 0) {
    factors.push(`Weather impact on ${weatherImpacted.length} player(s)`)
  }

  // High-variance players
  const highVar = allPlayers.filter(p => p.stdDev > p.projection * 0.35)
  if (highVar.length > 0) {
    factors.push(`${highVar.length} high-variance player(s) could swing the outcome`)
  }

  return factors.slice(0, 5)
}

function buildRiskNotes(teamA: SimPlayer[], teamB: SimPlayer[]): string[] {
  const notes: string[] = []

  // Concentration risk
  for (const [label, team] of [['Team A', teamA], ['Team B', teamB]] as const) {
    const total = team.reduce((s, p) => s + p.projection, 0)
    const topPlayer = [...team].sort((a, b) => b.projection - a.projection)[0]
    if (topPlayer && total > 0 && topPlayer.projection / total > 0.3) {
      notes.push(`${label} is ${Math.round((topPlayer.projection / total) * 100)}% dependent on ${topPlayer.name}`)
    }
  }

  // Injury stacking
  const teamAInjured = teamA.filter(p => p.injuryStatus !== 'healthy').length
  const teamBInjured = teamB.filter(p => p.injuryStatus !== 'healthy').length
  if (teamAInjured >= 2) notes.push(`Team A has ${teamAInjured} players with injury designations`)
  if (teamBInjured >= 2) notes.push(`Team B has ${teamBInjured} players with injury designations`)

  return notes.slice(0, 4)
}

// ---------------------------------------------------------------------------
// Main Entry Point
// ---------------------------------------------------------------------------

export function runEnhancedMatchupSim(input: MatchupSimInput): MatchupSimResult {
  const iterations = clamp(input.iterations ?? DEFAULT_ITERATIONS, MIN_ITERATIONS, MAX_ITERATIONS)
  const teamA = input.teamA.lineup
  const teamB = input.teamB.lineup

  // Run all simulations, collect detailed results
  let winsA = 0
  const allScoresA: number[] = []
  const allScoresB: number[] = []
  const allResults: Array<{ scoreA: number; scoreB: number; playerScores: Map<string, number> }> = []
  const playerSimResults = new Map<string, number[]>()

  // Initialize player result trackers
  for (const p of [...teamA, ...teamB]) {
    playerSimResults.set(p.playerId, [])
  }

  for (let i = 0; i < iterations; i++) {
    const result = simulateOnce(teamA, teamB)

    allScoresA.push(result.scoreA)
    allScoresB.push(result.scoreB)
    if (result.scoreA > result.scoreB) winsA++

    // Track player scores (sample for memory efficiency)
    if (i < 500) {
      allResults.push(result)
      for (const [pid, score] of result.playerScores) {
        playerSimResults.get(pid)?.push(score)
      }
    }
  }

  // Score percentiles
  const sortedA = [...allScoresA].sort((a, b) => a - b)
  const sortedB = [...allScoresB].sort((a, b) => a - b)
  const pA = percentiles(sortedA, [10, 25, 50, 75, 90])
  const pB = percentiles(sortedB, [10, 25, 50, 75, 90])

  // Win probability
  const teamAWinPct = round1((winsA / iterations) * 100)
  const teamBWinPct = round1(((iterations - winsA) / iterations) * 100)

  // Swing players
  const keySwingPlayers = computeSwingPlayers(teamA, teamB, playerSimResults, Math.min(iterations, 500))

  // Scenarios
  const scenarioModes: SimMode[] = ['standard', 'ceiling_path', 'safe_floor_path']
  const scenarioResults = scenarioModes.map(mode =>
    runScenarioMode(teamA, teamB, mode, Math.min(iterations, 1000)),
  )

  // Win/lose conditions
  const { mustWin: mustWinConditions, loseScenarions: loseScenarios } =
    analyzeWinLoseConditions(teamA, teamB, allResults)

  // X-factors and risk notes
  const xFactors = buildXFactors(teamA, teamB)
  const riskNotes = buildRiskNotes(teamA, teamB)

  // Confidence
  let confidencePct = 60
  if (iterations >= 2000) confidencePct += 15
  if (teamA.length >= 7 && teamB.length >= 7) confidencePct += 10
  const injuryUncertainty = [...teamA, ...teamB].filter(p => p.injuryStatus !== 'healthy').length
  confidencePct -= injuryUncertainty * 3
  confidencePct = clamp(confidencePct, 20, 95)

  // Volatility
  const combinedStdDev = Math.sqrt(
    teamA.reduce((s, p) => s + p.stdDev ** 2, 0) +
    teamB.reduce((s, p) => s + p.stdDev ** 2, 0),
  )
  const volatilityTag: MatchupSimResult['volatilityTag'] =
    combinedStdDev >= 20 ? 'high' : combinedStdDev >= 14 ? 'medium' : 'low'

  return {
    teamAWinPct,
    teamBWinPct,
    medianOutcome: { teamA: pA[2], teamB: pB[2] },
    scoreRanges: {
      teamA: { p10: pA[0], p25: pA[1], p50: pA[2], p75: pA[3], p90: pA[4] },
      teamB: { p10: pB[0], p25: pB[1], p50: pB[2], p75: pB[3], p90: pB[4] },
    },
    keySwingPlayers,
    xFactors,
    riskNotes,
    mustWinConditions,
    loseScenarios,
    scenarioResults,
    simulationCount: iterations,
    confidencePct,
    volatilityTag,
  }
}
