/**
 * Matchup simulation API — returns win probability, margin, upset chance, volatility.
 * Uses Monte Carlo simulation (quantitative / DeepSeek-style modeling).
 */

import { NextRequest, NextResponse } from 'next/server'
import { simulateMatchup } from '@/lib/monte-carlo'

const DEFAULT_ITERATIONS = 2000

export async function POST(req: NextRequest) {
  let body: {
    teamA?: { mean: number; stdDev?: number }
    teamB?: { mean: number; stdDev?: number }
    iterations?: number
  } = {}
  try {
    body = await req.json().catch(() => ({}))
  } catch {}

  const meanA = Number(body.teamA?.mean ?? 0)
  const meanB = Number(body.teamB?.mean ?? 0)
  const stdDevA = Math.max(1, Number(body.teamA?.stdDev ?? 15))
  const stdDevB = Math.max(1, Number(body.teamB?.stdDev ?? 15))
  const iterations = Math.min(
    Math.max(100, Number(body.iterations) || DEFAULT_ITERATIONS),
    5000
  )

  if (!Number.isFinite(meanA) || !Number.isFinite(meanB)) {
    return NextResponse.json(
      { error: 'teamA.mean and teamB.mean are required' },
      { status: 400 }
    )
  }

  const result = simulateMatchup(
    { mean: meanA, stdDev: stdDevA },
    { mean: meanB, stdDev: stdDevB },
    iterations
  )

  const winProbA = result.winProbability
  const winProbB = 1 - winProbA
  const underdogWinProb = Math.min(winProbA, winProbB)
  const upsetChance = Math.round(underdogWinProb * 1000) / 10
  const spread = Math.abs(meanA - meanB)
  const vol = (stdDevA + stdDevB) / 2
  const volatilityTag =
    vol >= 20 ? 'high' : vol >= 14 ? 'medium' : 'low'

  return NextResponse.json({
    winProbabilityA: Math.round(winProbA * 1000) / 1000,
    winProbabilityB: Math.round(winProbB * 1000) / 1000,
    marginMean: result.marginMean,
    marginStdDev: result.marginStdDev,
    projectedScoreA: meanA,
    projectedScoreB: meanB,
    scoreRangeA: [Math.max(0, meanA - stdDevA), meanA + stdDevA],
    scoreRangeB: [Math.max(0, meanB - stdDevB), meanB + stdDevB],
    upsetChance,
    volatilityTag,
    iterations,
  })
}
