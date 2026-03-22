'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  DEFAULT_SPORT,
  SUPPORTED_SPORTS,
  isSupportedSport,
  normalizeToSupportedSport,
} from '@/lib/sport-scope'

export type TrendFeedType = 'hot_streak' | 'cold_streak' | 'breakout_candidate' | 'sell_high_candidate'

export interface TrendDeterministicSignals {
  performanceDelta: number | null
  usageChange: number
  minutesOrSnapShare: number
  efficiencyScore: number
}

export interface TrendFeedItemDto {
  trendType: TrendFeedType
  playerId: string
  sport: string
  displayName: string | null
  signals: TrendDeterministicSignals
  trendScore: number
  direction: string
  updatedAt: string
}

export interface TrendAIInsightDto {
  mathValidation: string | null
  hypeDetection: string | null
  actionableExplanation: string | null
}

type TimeframeId = '24h' | '7d' | '30d'

const TIMEFRAME_OPTIONS: ReadonlyArray<{ value: TimeframeId; label: string }> = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
]

const TREND_LABELS: Record<TrendFeedType, string> = {
  hot_streak: 'Hot streak',
  cold_streak: 'Cold streak',
  breakout_candidate: 'Breakout candidate',
  sell_high_candidate: 'Sell-high candidate',
}

const TREND_COLORS: Record<TrendFeedType, string> = {
  hot_streak: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40',
  cold_streak: 'bg-slate-500/20 text-slate-600 dark:text-slate-400 border-slate-500/40',
  breakout_candidate: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40',
  sell_high_candidate: 'bg-violet-500/20 text-violet-700 dark:text-violet-300 border-violet-500/40',
}

function TrendCard({ item }: { item: TrendFeedItemDto }) {
  const [insight, setInsight] = useState<TrendAIInsightDto | null>(null)
  const [loadingInsight, setLoadingInsight] = useState(false)

  const loadInsight = useCallback(() => {
    if (insight !== null) return
    setLoadingInsight(true)
    fetch(
      `/api/player-trend/insight?playerId=${encodeURIComponent(item.playerId)}&sport=${encodeURIComponent(item.sport)}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (data.insight) setInsight(data.insight)
      })
      .finally(() => setLoadingInsight(false))
  }, [item.playerId, item.sport, insight])

  const s = item.signals
  const color = TREND_COLORS[item.trendType]
  const label = TREND_LABELS[item.trendType]

  return (
    <article
      className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800/80"
      data-testid="trend-feed-card"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded border px-2 py-0.5 text-xs font-medium ${color}`}>
          {label}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400">{item.sport}</span>
      </div>
      <h3 className="mt-1 font-medium text-slate-900 dark:text-slate-100">
        {item.displayName || item.playerId}
      </h3>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
        <div>
          <span className="font-medium">Score</span> {item.trendScore.toFixed(1)}
        </div>
        {s.performanceDelta != null && (
          <div>
            <span className="font-medium">Δ</span> {s.performanceDelta >= 0 ? '+' : ''}
            {s.performanceDelta.toFixed(1)}
          </div>
        )}
        <div>
          <span className="font-medium">Usage chg</span> {s.usageChange >= 0 ? '+' : ''}
          {s.usageChange.toFixed(2)}
        </div>
        <div>
          <span className="font-medium">Lineup rate</span> {(s.minutesOrSnapShare * 100).toFixed(0)}%
        </div>
      </dl>
      <div className="mt-2">
        <button
          type="button"
          onClick={loadInsight}
          disabled={loadingInsight}
          className="text-xs text-violet-600 hover:underline dark:text-violet-400 disabled:opacity-50"
        >
          {loadingInsight ? 'Loading…' : 'Get AI insight'}
        </button>
        {insight && (
          <div className="mt-2 space-y-1 rounded bg-slate-100 p-2 text-xs dark:bg-slate-700/50">
            {insight.mathValidation && (
              <p><span className="font-medium">Math:</span> {insight.mathValidation}</p>
            )}
            {insight.hypeDetection && (
              <p><span className="font-medium">Hype:</span> {insight.hypeDetection}</p>
            )}
            {insight.actionableExplanation && (
              <p><span className="font-medium">Action:</span> {insight.actionableExplanation}</p>
            )}
          </div>
        )}
      </div>
    </article>
  )
}

export default function TrendFeedPage() {
  const searchParams = useSearchParams()
  const [sport, setSport] = useState<string>(DEFAULT_SPORT)
  const [timeframe, setTimeframe] = useState<TimeframeId>('7d')
  const [items, setItems] = useState<TrendFeedItemDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const qpSport = searchParams.get('sport')
    const qpTimeframe = searchParams.get('timeframe')
    if (qpSport && isSupportedSport(qpSport)) {
      setSport(normalizeToSupportedSport(qpSport))
    }
    if (qpTimeframe === '24h' || qpTimeframe === '7d' || qpTimeframe === '30d') {
      setTimeframe(qpTimeframe)
    }
  }, [searchParams])

  const loadFeed = useCallback(() => {
    setLoading(true)
    setError(null)
    fetch(
      `/api/player-trend/feed?sport=${encodeURIComponent(sport)}&timeframe=${encodeURIComponent(timeframe)}&limit=60`
    )
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.data)) setItems(data.data)
        else setItems([])
      })
      .catch(() => setError('Failed to load trend feed'))
      .finally(() => setLoading(false))
  }, [sport, timeframe])

  useEffect(() => {
    loadFeed()
  }, [loadFeed])

  const byType = {
    hot_streak: items.filter((i) => i.trendType === 'hot_streak'),
    cold_streak: items.filter((i) => i.trendType === 'cold_streak'),
    breakout_candidate: items.filter((i) => i.trendType === 'breakout_candidate'),
    sell_high_candidate: items.filter((i) => i.trendType === 'sell_high_candidate'),
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <nav className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <Link href="/app/home" className="text-slate-400 hover:text-slate-200">
          ← App home
        </Link>
      </nav>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Player trend feed
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
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value as TimeframeId)}
          className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          aria-label="Timeframe"
        >
          {TIMEFRAME_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={loadFeed}
          disabled={loading}
          className="rounded bg-slate-200 px-2 py-1.5 text-sm dark:bg-slate-700 disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {loading && items.length === 0 ? (
        <p className="text-sm text-slate-500">Loading trends…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500">No trend data for this sport yet.</p>
      ) : (
        <div className="space-y-6">
          {(['hot_streak', 'breakout_candidate', 'sell_high_candidate', 'cold_streak'] as const).map(
            (type) =>
              byType[type].length > 0 && (
                <section key={type}>
                  <h2 className="mb-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                    {TREND_LABELS[type]} ({byType[type].length})
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {byType[type].map((item) => (
                      <TrendCard
                        key={`${item.playerId}:${item.sport}`}
                        item={item}
                      />
                    ))}
                  </div>
                </section>
              )
          )}
        </div>
      )}
    </main>
  )
}
