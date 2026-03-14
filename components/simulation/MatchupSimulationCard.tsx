'use client'

import { useMemo, useState, useEffect } from 'react'

export type MatchupSimulationResult = {
  winProbabilityA: number
  winProbabilityB: number
  marginMean: number
  marginStdDev: number
  projectedScoreA: number
  projectedScoreB: number
  scoreRangeA: [number, number]
  scoreRangeB: [number, number]
  upsetChance: number
  volatilityTag: 'low' | 'medium' | 'high'
  iterations?: number
}

export type MatchupSimulationCardProps = {
  teamAName: string
  teamBName: string
  /** Precomputed result; if not provided, will POST to /api/simulation/matchup when projections are set */
  result?: MatchupSimulationResult | null
  /** When result is not provided: team projections for client-side fetch */
  teamA?: { mean: number; stdDev?: number }
  teamB?: { mean: number; stdDev?: number }
  /** Optional current scores to show */
  scoreA?: number
  scoreB?: number
  className?: string
}

function VolatilityTag({ tag }: { tag: 'low' | 'medium' | 'high' }) {
  const [label, color] =
    tag === 'high'
      ? ['High volatility', 'bg-amber-500/20 text-amber-400']
      : tag === 'medium'
        ? ['Medium volatility', 'bg-cyan-500/20 text-cyan-400']
        : ['Low volatility', 'bg-emerald-500/20 text-emerald-400']
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${color}`}
      title="Score variance from simulation"
    >
      {label}
    </span>
  )
}

export function MatchupSimulationCard({
  teamAName,
  teamBName,
  result: resultProp,
  teamA,
  teamB,
  scoreA,
  scoreB,
  className = '',
}: MatchupSimulationCardProps) {
  const [result, setResult] = useState<MatchupSimulationResult | null>(resultProp ?? null)
  const [loading, setLoading] = useState(!resultProp && !!teamA && !!teamB)

  useEffect(() => {
    if (resultProp != null) {
      setResult(resultProp)
      setLoading(false)
      return
    }
    const hasProjections =
      typeof teamA?.mean === 'number' && typeof teamB?.mean === 'number'
    if (!hasProjections) {
      setLoading(false)
      return
    }
    let cancelled = false
    fetch('/api/simulation/matchup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teamA: { mean: teamA?.mean ?? 0, stdDev: teamA?.stdDev ?? 15 },
        teamB: { mean: teamB?.mean ?? 0, stdDev: teamB?.stdDev ?? 15 },
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setResult(data)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [resultProp, teamA?.mean, teamA?.stdDev, teamB?.mean, teamB?.stdDev])

  const display = useMemo(() => {
    if (!result) return null
    const probA = result.winProbabilityA * 100
    const probB = result.winProbabilityB * 100
    const favoredA = probA >= 50
    return {
      probA,
      probB,
      favoredA,
      upsetChance: result.upsetChance,
      rangeA: result.scoreRangeA,
      rangeB: result.scoreRangeB,
      projA: result.projectedScoreA,
      projB: result.projectedScoreB,
      vol: result.volatilityTag,
      iterations: result.iterations,
    }
  }, [result])

  if (loading) {
    return (
      <div
        className={`rounded-xl border border-white/10 bg-white/[0.02] p-4 ${className}`}
      >
        <div className="animate-pulse text-sm text-white/40">Simulating matchup…</div>
      </div>
    )
  }

  if (!display) {
    return (
      <div
        className={`rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/50 ${className}`}
      >
        Set team projections or pass a simulation result to see win probability and ranges.
      </div>
    )
  }

  return (
    <div
      className={`rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3 ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider">
          Matchup simulation
        </h3>
        <VolatilityTag tag={display.vol} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] font-medium text-white/80 truncate" title={teamAName}>
            {teamAName}
          </p>
          <p className="text-[10px] text-white/50 mt-0.5">
            Proj: {display.projA.toFixed(1)} (range {display.rangeA[0].toFixed(0)}–{display.rangeA[1].toFixed(0)})
          </p>
          {scoreA != null && (
            <p className="text-[10px] text-emerald-400/90 mt-0.5">Current: {scoreA.toFixed(1)}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-[11px] font-medium text-white/80 truncate" title={teamBName}>
            {teamBName}
          </p>
          <p className="text-[10px] text-white/50 mt-0.5">
            Proj: {display.projB.toFixed(1)} (range {display.rangeB[0].toFixed(0)}–{display.rangeB[1].toFixed(0)})
          </p>
          {scoreB != null && (
            <p className="text-[10px] text-emerald-400/90 mt-0.5">Current: {scoreB.toFixed(1)}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] text-white/50">
          <span>Win probability</span>
          <span>
            {display.probA >= 99 ? '99+' : display.probA.toFixed(1)}% – {display.probB >= 99 ? '99+' : display.probB.toFixed(1)}%
          </span>
        </div>
        <div className="h-3 rounded-full bg-white/10 overflow-hidden flex">
          <div
            className="bg-cyan-500/80 transition-all duration-500"
            style={{ width: `${display.probA}%` }}
          />
          <div
            className="bg-amber-500/80 transition-all duration-500"
            style={{ width: `${display.probB}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="text-cyan-400/90">{display.probA.toFixed(0)}%</span>
          <span className="text-amber-400/90">{display.probB.toFixed(0)}%</span>
        </div>
      </div>

      {display.upsetChance > 5 && (
        <div className="flex items-center justify-between rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5">
          <span className="text-[10px] text-amber-300/90">Upset chance (underdog)</span>
          <span className="text-[11px] font-semibold text-amber-400">{display.upsetChance}%</span>
        </div>
      )}

      {display.iterations != null && (
        <p className="text-[9px] text-white/30">{display.iterations.toLocaleString()} sims</p>
      )}
    </div>
  )
}
