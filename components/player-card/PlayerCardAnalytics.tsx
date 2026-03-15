'use client'

import { useState, useEffect } from 'react'
import { Sparkles, TrendingUp, Target, LineChart } from 'lucide-react'
import type {
  PlayerCardAnalyticsPayload,
  PlayerCardMetaTrend,
  PlayerCardCareerProjection,
} from '@/lib/player-card-analytics/types'

export interface PlayerCardAnalyticsProps {
  playerId?: string | null
  playerName: string
  position?: string | null
  team?: string | null
  sport?: string | null
  /** When true, fetch on mount; when false, only when expanded or explicitly requested */
  eager?: boolean
}

export default function PlayerCardAnalytics({
  playerId,
  playerName,
  position,
  team,
  sport,
  eager = true,
}: PlayerCardAnalyticsProps) {
  const [data, setData] = useState<PlayerCardAnalyticsPayload | null>(null)
  const [loading, setLoading] = useState(eager)
  const [error, setError] = useState<string | null>(null)
  const [fetched, setFetched] = useState(false)

  const fetchCard = () => {
    if (!playerName?.trim()) return
    setLoading(true)
    setError(null)
    fetch('/api/player-card-analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId,
        playerName: playerName.trim(),
        position,
        team,
        sport,
      }),
    })
      .then((r) => r.json())
      .then((payload) => {
        if (payload?.error) {
          setError(payload.error)
          setData(null)
        } else {
          setData(payload)
        }
      })
      .catch(() => {
        setError('Failed to load analytics')
        setData(null)
      })
      .finally(() => {
        setLoading(false)
        setFetched(true)
      })
  }

  useEffect(() => {
    if (eager && playerName?.trim() && !fetched) fetchCard()
  }, [eager, playerName, fetched])

  if (!playerName?.trim()) return null

  const showSection =
    (data?.aiInsights || data?.metaTrends || data?.matchupPrediction || data?.careerProjection) &&
    !loading &&
    !error

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-white">Player card analytics</h3>
        {!eager && !fetched && (
          <button
            type="button"
            onClick={fetchCard}
            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white hover:bg-white/10"
          >
            Load
          </button>
        )}
        {fetched && !showSection && !loading && !error && (
          <span className="text-xs text-zinc-500">No data</span>
        )}
      </div>

      {loading && (
        <p className="mt-2 text-xs text-zinc-400">Loading…</p>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}

      {showSection && data && (
        <div className="mt-3 space-y-4">
          {data.aiInsights && (
            <Section icon={<Sparkles className="h-4 w-4 text-amber-400" />} title="AI insights">
              <p className="text-sm text-zinc-300">{data.aiInsights}</p>
            </Section>
          )}

          {data.metaTrends && (
            <Section icon={<TrendingUp className="h-4 w-4 text-green-400" />} title="Meta trends">
              <MetaTrendsBlock meta={data.metaTrends} />
            </Section>
          )}

          {data.matchupPrediction && (
            <Section icon={<Target className="h-4 w-4 text-cyan-400" />} title="Matchup outlook">
              <MatchupBlock pred={data.matchupPrediction} />
            </Section>
          )}

          {data.careerProjection && (
            <Section icon={<LineChart className="h-4 w-4 text-violet-400" />} title="Career projection">
              <CareerBlock proj={data.careerProjection} />
            </Section>
          )}
        </div>
      )}
    </div>
  )
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs font-medium text-white/80">
        {icon}
        {title}
      </div>
      <div className="mt-1.5">{children}</div>
    </div>
  )
}

function MetaTrendsBlock({ meta }: { meta: PlayerCardMetaTrend }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
      <span>Trend: {meta.trendingDirection}</span>
      <span>Score: {meta.trendScore.toFixed(1)}</span>
      <span>Add rate: {(meta.addRate * 100).toFixed(0)}%</span>
      <span>Draft rate: {(meta.draftRate * 100).toFixed(0)}%</span>
    </div>
  )
}

function MatchupBlock({ pred }: { pred: PlayerCardAnalyticsPayload['matchupPrediction'] }) {
  if (!pred) return null
  return (
    <div className="text-xs text-zinc-300">
      {pred.outlook && <p>{pred.outlook}</p>}
      {(pred.expectedPoints != null || pred.expectedPointsPerGame != null) && (
        <p className="mt-1">
          {pred.expectedPointsPerGame != null && `Expected ${pred.expectedPointsPerGame.toFixed(1)} PPG`}
          {pred.expectedPoints != null && pred.expectedPointsPerGame != null && ' · '}
          {pred.expectedPoints != null && `${pred.expectedPoints.toFixed(0)} pts (season)`}
        </p>
      )}
    </div>
  )
}

function CareerBlock({ proj }: { proj: PlayerCardCareerProjection }) {
  return (
    <div className="space-y-1 text-xs text-zinc-400">
      <p>
        Y1–Y5: {proj.projectedPointsYear1} → {proj.projectedPointsYear2} → {proj.projectedPointsYear3} → {proj.projectedPointsYear4} → {proj.projectedPointsYear5} pts
      </p>
      <p>
        Breakout: {proj.breakoutProbability.toFixed(0)}% · Decline: {proj.declineProbability.toFixed(0)}% · Volatility: {proj.volatilityScore}
      </p>
    </div>
  )
}
