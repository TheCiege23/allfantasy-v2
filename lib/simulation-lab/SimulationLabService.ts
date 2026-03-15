/**
 * Platform Simulation Lab — sandbox service: season, playoffs, dynasty (no league required).
 */

import {
  simulateSeason,
  simulatePlayoffs,
  type TeamProjection,
} from '@/lib/monte-carlo'
import type {
  TeamProjectionInput,
  SeasonSimLabInput,
  SeasonSimLabResult,
  PlayoffSimLabInput,
  PlayoffSimLabResult,
  DynastySimLabInput,
  DynastySimLabResult,
  DynastyTeamOutcome,
} from './types'

const DEFAULT_STD_DEV = 12
const DEFAULT_ITERATIONS = 2000
const MAX_ITERATIONS = 5000

function toProjection(t: TeamProjectionInput, index?: number): TeamProjection {
  return {
    mean: t.mean,
    stdDev: t.stdDev ?? DEFAULT_STD_DEV,
    name: t.name,
    teamId: t.teamId ?? (index != null ? `team-${index}` : undefined),
  }
}

export function runSeasonSimulation(input: SeasonSimLabInput): SeasonSimLabResult {
  const iterations = Math.min(
    Math.max(100, input.iterations ?? DEFAULT_ITERATIONS),
    MAX_ITERATIONS
  )
  const team = toProjection(input.team)
  const opponents = input.opponents.map((o, i) => toProjection(o, i))
  const result = simulateSeason(
    team,
    opponents,
    input.playoffSpots,
    input.byeSpots ?? 0,
    iterations
  )
  return {
    expectedWins: result.expectedWins,
    playoffProbability: result.playoffProbability,
    byeWeekProbability: result.byeWeekProbability,
    iterations,
  }
}

export function runPlayoffSimulation(input: PlayoffSimLabInput): PlayoffSimLabResult {
  const iterations = Math.min(
    Math.max(100, input.iterations ?? DEFAULT_ITERATIONS),
    MAX_ITERATIONS
  )
  const teams = input.teams.map((t, i) => toProjection(t, i))
  if (teams.length < 2) {
    return {
      championshipProbability: input.targetTeamIndex === 0 ? 1 : 0,
      finalistProbability: input.targetTeamIndex === 0 ? 1 : 0,
      iterations,
    }
  }
  const result = simulatePlayoffs(teams, input.targetTeamIndex, iterations)
  return {
    championshipProbability: result.championshipProbability,
    finalistProbability: result.finalistProbability,
    iterations,
  }
}

/**
 * Run one single-elimination bracket: return original team index of champion.
 */
function runOneBracket(
  projections: TeamProjection[],
  order: number[]
): number {
  let bracket: { p: TeamProjection; idx: number }[] = order.map((i) => ({
    p: projections[i],
    idx: i,
  }))
  while (bracket.length > 1) {
    const next: { p: TeamProjection; idx: number }[] = []
    for (let i = 0; i < bracket.length; i += 2) {
      if (i + 1 >= bracket.length) {
        next.push(bracket[i])
        continue
      }
      const a = bracket[i].p
      const b = bracket[i + 1].p
      const scoreA = a.mean + (a.stdDev ?? DEFAULT_STD_DEV) * boxMuller()
      const scoreB = b.mean + (b.stdDev ?? DEFAULT_STD_DEV) * boxMuller()
      next.push(scoreA >= scoreB ? bracket[i] : bracket[i + 1])
    }
    bracket = next
  }
  return bracket[0].idx
}

/**
 * Dynasty: run N seasons; each season one round-robin + one bracket; aggregate championships and wins.
 */
export function runDynastySimulation(input: DynastySimLabInput): DynastySimLabResult {
  const numTeams = input.teams.length
  const seasons = Math.min(Math.max(1, input.seasons), 200)
  const projections = input.teams.map((t, i) => toProjection(t, i))
  const outcomes: DynastyTeamOutcome[] = input.teams.map((t, i) => ({
    teamIndex: i,
    name: t.name,
    championships: 0,
    totalWins: 0,
    avgFinish: 0,
    playoffAppearances: 0,
  }))

  const totalFinishSum = new Array(numTeams).fill(0)

  for (let s = 0; s < seasons; s++) {
    const wins = new Array(numTeams).fill(0)
    for (let i = 0; i < numTeams; i++) {
      for (let j = i + 1; j < numTeams; j++) {
        const scoreI =
          projections[i].mean +
          (projections[i].stdDev ?? DEFAULT_STD_DEV) * boxMuller()
        const scoreJ =
          projections[j].mean +
          (projections[j].stdDev ?? DEFAULT_STD_DEV) * boxMuller()
        if (scoreI > scoreJ) wins[i]++
        else wins[j]++
      }
    }
    const sortedIndices = [...Array(numTeams).keys()].sort(
      (a, b) => wins[b] - wins[a]
    )
    const playoffIndices = sortedIndices.slice(0, input.playoffSpots)
    playoffIndices.forEach((idx) => {
      outcomes[idx].playoffAppearances++
    })
    for (let i = 0; i < numTeams; i++) {
      outcomes[i].totalWins += wins[i]
      totalFinishSum[i] += sortedIndices.indexOf(i) + 1
    }

    const championIdx = runOneBracket(projections, playoffIndices)
    outcomes[championIdx].championships++
  }

  for (let i = 0; i < numTeams; i++) {
    outcomes[i].avgFinish = Math.round((totalFinishSum[i] / seasons) * 10) / 10
    outcomes[i].totalWins = Math.round((outcomes[i].totalWins / seasons) * 10) / 10
  }

  outcomes.sort(
    (a, b) =>
      b.championships - a.championships || b.totalWins - a.totalWins
  )

  return {
    seasonsRun: seasons,
    outcomes,
    iterationsPerSeason: 1,
  }
}

function boxMuller(): number {
  const u = 1 - Math.random()
  const v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}
