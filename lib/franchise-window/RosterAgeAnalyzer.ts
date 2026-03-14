import type { RosterAgeMetrics } from './types'

export interface RosterPlayerAgeInput {
  age: number | null
  isStarter: boolean
}

export function analyzeRosterAges(players: RosterPlayerAgeInput[]): RosterAgeMetrics {
  if (!players.length) {
    return {
      averageAge: 0,
      weightedStarterAge: 0,
      youngCoreScore: 0,
      agingRiskScore: 0,
    }
  }

  let totalAge = 0
  let totalCount = 0
  let starterAgeSum = 0
  let starterCount = 0
  let youngCore = 0
  let agingRisk = 0

  for (const p of players) {
    if (p.age == null || p.age <= 0) continue
    totalAge += p.age
    totalCount++

    if (p.isStarter) {
      starterAgeSum += p.age
      starterCount++
    }

    if (p.age <= 25) youngCore += 1
    if (p.age >= 28) agingRisk += (p.isStarter ? 1.5 : 1)
  }

  const averageAge = totalCount > 0 ? totalAge / totalCount : 0
  const weightedStarterAge = starterCount > 0 ? starterAgeSum / starterCount : averageAge

  const youngCoreScore = Math.min(100, (youngCore / Math.max(1, players.length)) * 120)
  const agingRiskScore = Math.min(100, (agingRisk / Math.max(1, totalCount)) * 40)

  return {
    averageAge: Math.round(averageAge * 10) / 10,
    weightedStarterAge: Math.round(weightedStarterAge * 10) / 10,
    youngCoreScore,
    agingRiskScore,
  }
}

