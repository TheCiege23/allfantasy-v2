'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { SUPPORTED_SPORTS } from '@/lib/sport-scope'
import type {
  MetaAnalysisResult,
  DraftStrategyShift,
  PositionValueChange,
  WaiverStrategyTrend,
} from '@/lib/strategy-meta-engine'

const LEAGUE_FORMATS = [
  { value: '', label: 'All formats' },
  { value: 'dynasty_sf', label: 'Dynasty SF' },
  { value: 'dynasty_1qb', label: 'Dynasty 1QB' },
  { value: 'redraft_sf', label: 'Redraft SF' },
  { value: 'redraft_1qb', label: 'Redraft 1QB' },
] as const

export default function MetaInsightsPage() {
  const [sport, setSport] = useState<string>(SUPPORTED_SPORTS[0])
  const [leagueFormat, setLeagueFormat] = useState<string>('')
  const [windowDays, setWindowDays] = useState(30)
  const [data, setData] = useState<MetaAnalysisResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (sport) params.set('sport', sport)
    if (leagueFormat) params.set('leagueFormat', leagueFormat)
    params.set('windowDays', String(windowDays))
    fetch(`/api/meta-analysis?${params}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.error) setError(res.error)
        else setData(res)
      })
      .catch(() => setError('Failed to load meta analysis'))
      .finally(() => setLoading(false))
  }, [sport, leagueFormat, windowDays])

  useEffect(() => {
    load()
  }, [load])

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <nav className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <Link href="/app/home" className="text-slate-400 hover:text-slate-200">
          ← App home
        </Link>
        <Link href="/app/meta-insights" className="text-slate-400 hover:text-slate-200">
          Meta insights
        </Link>
      </nav>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Strategy meta dashboard
        </h1>
        <select
          value={sport}
          onChange={(e) => setSport(e.target.value)}
          className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          aria-label="Sport"
        >
          {SUPPORTED_SPORTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={leagueFormat}
          onChange={(e) => setLeagueFormat(e.target.value)}
          className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          aria-label="League format"
        >
          {LEAGUE_FORMATS.map((f) => (
            <option key={f.value || 'all'} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <select
          value={windowDays}
          onChange={(e) => setWindowDays(Number(e.target.value))}
          className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          aria-label="Window days"
        >
          <option value={7}>7 days</option>
          <option value={30}>30 days</option>
          <option value={90}>90 days</option>
        </select>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded bg-slate-200 px-2 py-1.5 text-sm dark:bg-slate-700 disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {loading && !data ? (
        <p className="text-sm text-slate-500">Loading meta analysis…</p>
      ) : data ? (
        <div className="space-y-8">
          <section>
            <h2 className="mb-2 text-sm font-medium text-slate-600 dark:text-slate-400">
              Draft strategy shifts
            </h2>
            {data.draftStrategyShifts.length === 0 ? (
              <p className="text-sm text-slate-500">
                No strategy reports yet. Run report generation to populate.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/80">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-600 dark:text-slate-400">
                      <th className="p-2">Strategy</th>
                      <th className="p-2">Format</th>
                      <th className="p-2">Usage</th>
                      <th className="p-2">Success</th>
                      <th className="p-2">Shift</th>
                      <th className="p-2">N</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.draftStrategyShifts.map((r: DraftStrategyShift) => (
                      <tr
                        key={`${r.strategyType}-${r.sport}-${r.leagueFormat}`}
                        className="border-b border-slate-100 dark:border-slate-700"
                      >
                        <td className="p-2 font-medium">{r.strategyType}</td>
                        <td className="p-2 text-slate-600 dark:text-slate-400">
                          {r.leagueFormat}
                        </td>
                        <td className="p-2 tabular-nums">
                          {Math.round(r.usageRate * 100)}%
                        </td>
                        <td className="p-2 tabular-nums">
                          {Math.round(r.successRate * 100)}%
                        </td>
                        <td className="p-2">{r.shiftLabel}</td>
                        <td className="p-2 tabular-nums">{r.sampleSize}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <section>
            <h2 className="mb-2 text-sm font-medium text-slate-600 dark:text-slate-400">
              Position value changes (trade history)
            </h2>
            {data.positionValueChanges.length === 0 ? (
              <p className="text-sm text-slate-500">
                No position-level trade insights yet.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/80">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-600 dark:text-slate-400">
                      <th className="p-2">Position</th>
                      <th className="p-2">Sport</th>
                      <th className="p-2">Avg given</th>
                      <th className="p-2">Avg received</th>
                      <th className="p-2">Trend</th>
                      <th className="p-2">N</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.positionValueChanges.map((p: PositionValueChange) => (
                      <tr
                        key={`${p.position}-${p.sport}`}
                        className="border-b border-slate-100 dark:border-slate-700"
                      >
                        <td className="p-2 font-medium">{p.position}</td>
                        <td className="p-2">{p.sport}</td>
                        <td className="p-2 tabular-nums">
                          {p.avgValueGiven != null
                            ? p.avgValueGiven.toFixed(1)
                            : '—'}
                        </td>
                        <td className="p-2 tabular-nums">
                          {p.avgValueReceived != null
                            ? p.avgValueReceived.toFixed(1)
                            : '—'}
                        </td>
                        <td className="p-2">{p.marketTrend ?? '—'}</td>
                        <td className="p-2 tabular-nums">{p.sampleSize}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <section>
            <h2 className="mb-2 text-sm font-medium text-slate-600 dark:text-slate-400">
              Waiver strategy trends (last {windowDays} days)
            </h2>
            {data.waiverStrategyTrends.length === 0 ? (
              <p className="text-sm text-slate-500">
                No waiver signal data in this window.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/80">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-600 dark:text-slate-400">
                      <th className="p-2">Sport</th>
                      <th className="p-2">Adds</th>
                      <th className="p-2">Drops</th>
                      <th className="p-2">Net</th>
                      <th className="p-2">Add/day</th>
                      <th className="p-2">Drop/day</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.waiverStrategyTrends.map((w: WaiverStrategyTrend) => (
                      <tr
                        key={w.sport}
                        className="border-b border-slate-100 dark:border-slate-700"
                      >
                        <td className="p-2 font-medium">{w.sport}</td>
                        <td className="p-2 tabular-nums">{w.addCount}</td>
                        <td className="p-2 tabular-nums">{w.dropCount}</td>
                        <td className="p-2 tabular-nums">{w.netAdds}</td>
                        <td className="p-2 tabular-nums">
                          {w.addRatePerDay.toFixed(1)}
                        </td>
                        <td className="p-2 tabular-nums">
                          {w.dropRatePerDay.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <p className="text-xs text-slate-500">
            Generated at {data.generatedAt}. Data: league warehouse, draft logs, trade history.
          </p>
        </div>
      ) : null}
    </main>
  )
}
