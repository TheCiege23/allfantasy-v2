'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { SUPPORTED_SPORTS } from '@/lib/sport-scope'
import type { PlayerDynastyIntelligence } from '@/lib/dynasty-intelligence'

const POSITIONS_BY_SPORT: Record<string, readonly string[]> = {
  NFL: ['QB', 'RB', 'WR', 'TE'],
  NHL: ['C', 'LW', 'RW', 'D', 'G'],
  NBA: ['PG', 'SG', 'SF', 'PF', 'C'],
  MLB: ['SP', 'RP', 'C', '1B', '2B', '3B', 'SS', 'OF'],
  NCAAB: ['PG', 'SG', 'SF', 'PF', 'C'],
  NCAAF: ['QB', 'RB', 'WR', 'TE'],
  SOCCER: ['FWD', 'MID', 'DEF', 'GK'],
}

function getPositionsForSport(sport: string): readonly string[] {
  return POSITIONS_BY_SPORT[sport] ?? POSITIONS_BY_SPORT.NFL
}

export default function DynastyInsightsPage() {
  const [sport, setSport] = useState(SUPPORTED_SPORTS[0])
  const [position, setPosition] = useState('WR')
  const [age, setAge] = useState<number | ''>(25)
  const [baseValue, setBaseValue] = useState<number | ''>(5000)
  const [playerId, setPlayerId] = useState('')
  const [data, setData] = useState<PlayerDynastyIntelligence | null>(null)
  const [insight, setInsight] = useState<{
    mathValidation: string | null
    narrative: string | null
    explanation: string | null
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingAI, setLoadingAI] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    (withAI = false) => {
      setLoading(true)
      if (!withAI) setInsight(null)
      setError(null)
      const params = new URLSearchParams()
      params.set('sport', sport)
      params.set('position', position)
      if (age !== '') params.set('age', String(age))
      if (baseValue !== '') params.set('baseValue', String(baseValue))
      if (playerId.trim()) params.set('playerId', playerId.trim())
      if (withAI) params.set('ai', '1')
      fetch(`/api/dynasty-intelligence?${params}`)
        .then((r) => r.json())
        .then((res) => {
          if (res.error) setError(res.error)
          else {
            setData(res.data)
            if (res.insight) setInsight(res.insight)
          }
        })
        .catch(() => setError('Failed to load dynasty intelligence'))
        .finally(() => {
          setLoading(false)
          if (withAI) setLoadingAI(false)
        })
    },
    [sport, position, age, baseValue, playerId]
  )

  useEffect(() => {
    load()
  }, [load])

  const positions = getPositionsForSport(sport)

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <nav className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <Link href="/app/home" className="text-slate-400 hover:text-slate-200">
          ← App home
        </Link>
      </nav>
      <h1 className="mb-4 text-xl font-semibold text-slate-900 dark:text-slate-100">
        Dynasty valuation intelligence
      </h1>
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Sport</span>
          <select
            value={sport}
            onChange={(e) => {
              setSport(e.target.value as typeof sport)
              setPosition(getPositionsForSport(e.target.value)[0] ?? 'WR')
            }}
            aria-label="Dynasty insights sport filter"
            className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          >
            {SUPPORTED_SPORTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Position</span>
          <select
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            aria-label="Dynasty insights position filter"
            className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          >
            {positions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Age</span>
          <input
            type="number"
            min={18}
            max={45}
            value={age}
            onChange={(e) => setAge(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
            aria-label="Dynasty insights player age"
            className="w-20 rounded border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Base value</span>
          <input
            type="number"
            min={0}
            value={baseValue}
            onChange={(e) =>
              setBaseValue(e.target.value === '' ? '' : parseFloat(e.target.value))
            }
            aria-label="Dynasty insights base value"
            className="w-24 rounded border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Player ID (optional)</span>
          <input
            type="text"
            placeholder="e.g. sleeper id"
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
            aria-label="Dynasty insights player id"
            className="w-32 rounded border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          />
        </label>
        <button
          type="button"
          onClick={() => load()}
          disabled={loading}
          aria-label="Refresh dynasty insights"
          className="rounded bg-slate-200 px-3 py-1.5 text-sm dark:bg-slate-700 disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Update'}
        </button>
        <button
          type="button"
          onClick={() => {
            setLoadingAI(true)
            load(true)
          }}
          disabled={loading || loadingAI}
          aria-label="Get AI dynasty insights"
          className="rounded bg-violet-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
        >
          {loadingAI ? 'AI…' : 'Get AI insight'}
        </button>
      </div>
      {error && (
        <p className="mb-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {data && (
        <div className="space-y-6">
          {data.displayName && (
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Player: {data.displayName}
            </p>
          )}
          <section>
            <h2 className="mb-2 text-sm font-medium text-slate-600 dark:text-slate-400">
              Age curve ({data.ageCurve.sport} {data.ageCurve.position}) — Peak {data.ageCurve.peakAgeStart}–{data.ageCurve.peakAgeEnd}
            </h2>
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/80">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-600">
                    <th className="p-2">Age</th>
                    <th className="p-2">Multiplier</th>
                    <th className="p-2">Label</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ageCurve.points
                    .filter((p) => p.age % 2 === 1 || p.label)
                    .map((p) => (
                      <tr key={p.age} className="border-b border-slate-100 dark:border-slate-700">
                        <td className="p-2">{p.age}</td>
                        <td className="p-2 tabular-nums">{p.multiplier.toFixed(2)}</td>
                        <td className="p-2 text-slate-500">{p.label ?? '—'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
          {data.marketValueTrend && (
            <section>
              <h2 className="mb-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                Market value trend
              </h2>
              <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800/80">
                <p className="text-sm">
                  Direction: <strong>{data.marketValueTrend.direction}</strong> · Score:{' '}
                  {data.marketValueTrend.trendScore.toFixed(1)}
                  {data.marketValueTrend.scoreDelta != null && (
                    <> · Δ {data.marketValueTrend.scoreDelta >= 0 ? '+' : ''}{data.marketValueTrend.scoreDelta.toFixed(1)}</>
                  )}{' '}
                  · Usage chg: {data.marketValueTrend.usageChange.toFixed(2)}
                </p>
              </div>
            </section>
          )}
          {data.careerTrajectory && (
            <section>
              <h2 className="mb-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                Career trajectory (window: {data.careerTrajectory.expectedWindowYears} years)
              </h2>
              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/80">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-600">
                      <th className="p-2">Year</th>
                      <th className="p-2">Projected value</th>
                      <th className="p-2">Age mult.</th>
                      <th className="p-2">Window (yr)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.careerTrajectory.points.map((p) => (
                      <tr key={p.yearOffset} className="border-b border-slate-100 dark:border-slate-700">
                        <td className="p-2">+{p.yearOffset}</td>
                        <td className="p-2 tabular-nums">{p.projectedValue}</td>
                        <td className="p-2 tabular-nums">{p.ageMultiplier.toFixed(2)}</td>
                        <td className="p-2 tabular-nums">{p.windowYears}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {insight && (
            <section>
              <h2 className="mb-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                AI insight
              </h2>
              <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/80">
                {insight.mathValidation && (
                  <p className="text-sm">
                    <span className="font-medium">Math:</span> {insight.mathValidation}
                  </p>
                )}
                {insight.narrative && (
                  <p className="text-sm">
                    <span className="font-medium">Narrative:</span> {insight.narrative}
                  </p>
                )}
                {insight.explanation && (
                  <p className="text-sm">
                    <span className="font-medium">Explanation:</span> {insight.explanation}
                  </p>
                )}
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  )
}
