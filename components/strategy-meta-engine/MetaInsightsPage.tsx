'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { DEFAULT_SPORT, SUPPORTED_SPORTS, normalizeToSupportedSport } from '@/lib/sport-scope'
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
type TimeframeId = '24h' | '7d' | '30d'

const TIMEFRAME_OPTIONS: Array<{ value: TimeframeId; label: string }> = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
]

const WINDOW_DAYS_BY_TIMEFRAME: Record<TimeframeId, number> = {
  '24h': 1,
  '7d': 7,
  '30d': 30,
}

export default function MetaInsightsPage() {
  const searchParams = useSearchParams()
  const [sport, setSport] = useState<string>(DEFAULT_SPORT)
  const [leagueFormat, setLeagueFormat] = useState<string>('')
  const [timeframe, setTimeframe] = useState<TimeframeId>('30d')
  const [data, setData] = useState<MetaAnalysisResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSuccessRateBars, setShowSuccessRateBars] = useState(true)
  const [activeWidgetTab, setActiveWidgetTab] = useState<'draft' | 'roster'>('draft')
  const [detailShift, setDetailShift] = useState<DraftStrategyShift | null>(null)

  useEffect(() => {
    const sportParam = searchParams.get('sport')
    const timeframeParam = searchParams.get('timeframe')
    const leagueFormatParam = searchParams.get('leagueFormat')
    if (sportParam) setSport(normalizeToSupportedSport(sportParam))
    if (timeframeParam === '24h' || timeframeParam === '7d' || timeframeParam === '30d') {
      setTimeframe(timeframeParam)
    }
    if (leagueFormatParam != null) setLeagueFormat(leagueFormatParam)
  }, [searchParams])

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    setDetailShift(null)
    const params = new URLSearchParams()
    if (sport) params.set('sport', sport)
    if (leagueFormat) params.set('leagueFormat', leagueFormat)
    params.set('timeframe', timeframe)
    params.set('windowDays', String(WINDOW_DAYS_BY_TIMEFRAME[timeframe]))
    fetch(`/api/meta-analysis?${params}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((res) => {
        if (res.error) setError(res.error)
        else setData(res)
      })
      .catch(() => setError('Failed to load meta analysis'))
      .finally(() => setLoading(false))
  }, [sport, leagueFormat, timeframe])

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
        <Link href="/mock-draft-simulator" className="text-slate-400 hover:text-slate-200">
          Mock draft
        </Link>
      </nav>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Strategy meta dashboard
        </h1>
        <select
          value={sport}
          onChange={(e) => setSport(normalizeToSupportedSport(e.target.value))}
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
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value as TimeframeId)}
          className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          aria-label="Timeframe"
        >
          {TIMEFRAME_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded bg-slate-200 px-2 py-1.5 text-sm dark:bg-slate-700 disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
        <button
          type="button"
          onClick={() => setShowSuccessRateBars((v) => !v)}
          className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          aria-label={showSuccessRateBars ? 'Hide success rate graph' : 'Show success rate graph'}
        >
          {showSuccessRateBars ? 'Hide' : 'Show'} success graph
        </button>
      </div>
      <div className="mb-4 flex items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => setActiveWidgetTab('draft')}
          className={`rounded-full px-3 py-1.5 ${
            activeWidgetTab === 'draft'
              ? 'bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900'
              : 'border border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'
          }`}
        >
          Draft strategy widgets
        </button>
        <button
          type="button"
          onClick={() => setActiveWidgetTab('roster')}
          className={`rounded-full px-3 py-1.5 ${
            activeWidgetTab === 'roster'
              ? 'bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900'
              : 'border border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'
          }`}
        >
          Roster strategy widgets
        </button>
      </div>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {loading && !data ? (
        <p className="text-sm text-slate-500">Loading meta analysis…</p>
      ) : data ? (
        <div className="space-y-8">
          {activeWidgetTab === 'draft' && (
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
                      <th className="p-2">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.draftStrategyShifts.map((r: DraftStrategyShift) => (
                      <tr
                        key={`${r.strategyType}-${r.sport}-${r.leagueFormat}`}
                        className="border-b border-slate-100 dark:border-slate-700"
                      >
                        <td className="p-2 font-medium">{r.strategyLabel ?? r.strategyType}</td>
                        <td className="p-2 text-slate-600 dark:text-slate-400">
                          {r.leagueFormat}
                        </td>
                        <td className="p-2 tabular-nums">
                          {Math.round(r.usageRate * 100)}%
                        </td>
                        <td className="p-2 tabular-nums">
                          {Math.round(r.successRate * 100)}%
                          {showSuccessRateBars && (
                            <div className="mt-1 h-1.5 w-16 overflow-hidden rounded bg-slate-200 dark:bg-slate-700">
                              <div className="h-full rounded bg-emerald-500 dark:bg-emerald-400" style={{ width: `${Math.round(r.successRate * 100)}%` }} />
                            </div>
                          )}
                        </td>
                        <td className="p-2">{r.shiftLabel}</td>
                        <td className="p-2 tabular-nums">{r.sampleSize}</td>
                        <td className="p-2">
                          <button
                            type="button"
                            onClick={() =>
                              setDetailShift(
                                detailShift?.strategyType === r.strategyType &&
                                  detailShift?.sport === r.sport &&
                                  detailShift?.leagueFormat === r.leagueFormat
                                  ? null
                                  : r
                              )
                            }
                            className="text-violet-600 hover:underline dark:text-violet-400"
                            aria-label={`View strategy details for ${r.strategyType}`}
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {detailShift && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-700 dark:bg-slate-800/80" role="dialog" aria-label="Strategy details">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{detailShift.strategyLabel ?? detailShift.strategyType}</p>
                  <button
                    type="button"
                    onClick={() => setDetailShift(null)}
                    className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                    aria-label="Close strategy details"
                  >
                    Close
                  </button>
                </div>
                <p className="mt-1 text-slate-600 dark:text-slate-300">
                  {Math.round(detailShift.usageRate * 100)}% usage · {Math.round(detailShift.successRate * 100)}% success · {detailShift.shiftLabel}
                </p>
                <div className="mt-2 flex flex-wrap gap-3">
                  <Link href={`/mock-draft-simulator?sport=${encodeURIComponent(sport)}`} className="text-violet-600 hover:underline dark:text-violet-400">
                    Open mock draft context
                  </Link>
                  <Link href={`/af-legacy?tab=mock-draft`} className="text-violet-600 hover:underline dark:text-violet-400">
                    Open War Room
                  </Link>
                </div>
              </div>
            )}
          </section>
          )}
          {activeWidgetTab === 'roster' && (
          <>
          <section>
            <h2 className="mb-2 text-sm font-medium text-slate-600 dark:text-slate-400">
              Roster strategy value shifts
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
              Roster churn strategy trends (last {WINDOW_DAYS_BY_TIMEFRAME[timeframe]} days)
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
          </>
          )}
          <p className="text-xs text-slate-500">
            Generated at {data.generatedAt}. Data: league warehouse, draft logs, trade history.
          </p>
        </div>
      ) : null}
    </main>
  )
}
