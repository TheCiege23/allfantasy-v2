/**
 * Matchup simulation API — returns win probability, margin, upset chance, volatility.
 * Uses simulation engine (Monte Carlo, sport-aware stdDev). Optional persist when sport + leagueId + weekOrPeriod provided.
 */

import { NextRequest, NextResponse } from 'next/server'
import { runMatchupSimulation } from '@/lib/simulation-engine/MatchupSimulator'
import { getDefaultScoreStdDev } from '@/lib/simulation-engine/SportSimulationResolver'

export async function POST(req: NextRequest) {
  let body: {
    teamA?: { mean: number; stdDev?: number; teamId?: string }
    teamB?: { mean: number; stdDev?: number; teamId?: string }
    iterations?: number
    sport?: string
    leagueId?: string
    weekOrPeriod?: number
    persist?: boolean
  } = {}
  try {
    body = await req.json().catch(() => ({}))
  } catch {}

  const meanA = Number(body.teamA?.mean ?? 0)
  const meanB = Number(body.teamB?.mean ?? 0)
  if (!Number.isFinite(meanA) || !Number.isFinite(meanB)) {
    return NextResponse.json(
      { error: 'teamA.mean and teamB.mean are required' },
      { status: 400 }
    )
  }

  const sport = body.sport ?? 'NFL'
  const weekOrPeriod = Number(body.weekOrPeriod) || 1
  const persist = Boolean(body.persist && body.leagueId)

  try {
    const out = await runMatchupSimulation(
      {
        sport,
        leagueId: body.leagueId,
        weekOrPeriod,
        teamA: { mean: meanA, stdDev: body.teamA?.stdDev, teamId: body.teamA?.teamId },
        teamB: { mean: meanB, stdDev: body.teamB?.stdDev, teamId: body.teamB?.teamId },
        iterations: body.iterations,
      },
      { persist }
    )
    return NextResponse.json({
      winProbabilityA: out.winProbabilityA,
      winProbabilityB: out.winProbabilityB,
      marginMean: out.marginMean,
      marginStdDev: out.marginStdDev,
      projectedScoreA: out.expectedScoreA,
      projectedScoreB: out.expectedScoreB,
      scoreRangeA: [
        Math.max(0, out.expectedScoreA - getDefaultScoreStdDev(sport)),
        out.expectedScoreA + getDefaultScoreStdDev(sport),
      ] as [number, number],
      scoreRangeB: [
        Math.max(0, out.expectedScoreB - getDefaultScoreStdDev(sport)),
        out.expectedScoreB + getDefaultScoreStdDev(sport),
      ] as [number, number],
      upsetChance: out.upsetChance,
      volatilityTag: out.volatilityTag,
      iterations: out.iterations,
    })
  } catch (e) {
    console.error('[simulation/matchup]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Simulation failed' },
      { status: 500 }
    )
  }
}
