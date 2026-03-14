'use client'

import { useState, useEffect, useCallback } from 'react'
import { LeagueForecastDashboard } from './LeagueForecastDashboard'
import type { TeamSeasonForecastDisplay } from './TeamForecastCard'

const currentYear = new Date().getFullYear()
const defaultWeek = 1

type LeagueForecastSectionProps = {
  leagueId: string
  season?: number
  week?: number
  /** Map teamId (roster id) -> display name */
  teamNames?: Record<string, string>
  /** Map teamId -> current rank (1-based) from standings */
  teamRanks?: Record<string, number>
  playoffSpots?: number
  className?: string
}

export function LeagueForecastSection({
  leagueId,
  season = currentYear,
  week = defaultWeek,
  teamNames = {},
  teamRanks = {},
  playoffSpots = 6,
  className = '',
}: LeagueForecastSectionProps) {
  const [forecasts, setForecasts] = useState<TeamSeasonForecastDisplay[] | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aiSummary, setAiSummary] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!leagueId) return
    setError(null)
    try {
      const res = await fetch(
        `/api/leagues/${encodeURIComponent(leagueId)}/season-forecast?season=${season}&week=${week}`,
        { cache: 'no-store' }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setForecasts(null)
        setGeneratedAt(null)
        if (res.status === 404) setError(null)
        else setError(data?.error || 'Failed to load forecast')
        return
      }
      if (data.generated && Array.isArray(data.teamForecasts)) {
        setForecasts(data.teamForecasts)
        setGeneratedAt(data.generatedAt ?? null)
      } else {
        setForecasts(null)
        setGeneratedAt(null)
      }
    } catch {
      setError('Failed to load forecast')
      setForecasts(null)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [leagueId, season, week])

  const generate = useCallback(async () => {
    if (!leagueId) return
    setRefreshing(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/leagues/${encodeURIComponent(leagueId)}/season-forecast`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ season, week }),
        }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || 'Failed to generate forecast')
        return
      }
      if (Array.isArray(data.teamForecasts)) {
        setForecasts(data.teamForecasts)
        setGeneratedAt(new Date().toISOString())
      }
      await load()
    } catch {
      setError('Failed to generate forecast')
    } finally {
      setRefreshing(false)
    }
  }, [leagueId, season, week, load])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  useEffect(() => {
    if (!forecasts?.length || aiSummary != null) return
    fetch(`/api/leagues/${encodeURIComponent(leagueId)}/forecast-summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ season, week, teamForecasts: forecasts }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.summary && setAiSummary(d.summary))
      .catch(() => {})
  }, [leagueId, season, week, forecasts, aiSummary])

  if (loading && !forecasts) {
    return (
      <div className={`rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center text-sm text-white/50 ${className}`}>
        Loading season forecast…
      </div>
    )
  }

  if (error && !forecasts) {
    return (
      <div className={`space-y-3 ${className}`}>
        <p className="text-sm text-amber-400/90">{error}</p>
        <button
          type="button"
          onClick={() => void generate()}
          disabled={refreshing}
          className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-50"
        >
          {refreshing ? 'Generating…' : 'Generate forecast'}
        </button>
      </div>
    )
  }

  if (!forecasts?.length) {
    return (
      <div className={`space-y-3 ${className}`}>
        <p className="text-sm text-white/60">
          No forecast for this league yet. Generate one from current standings and rankings.
        </p>
        <button
          type="button"
          onClick={() => void generate()}
          disabled={refreshing}
          className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-50"
        >
          {refreshing ? 'Generating…' : 'Generate forecast'}
        </button>
      </div>
    )
  }

  const avgConfidence =
    forecasts.reduce((s, t) => s + t.confidenceScore, 0) / forecasts.length

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2 mb-4">
        <h2 className="text-base font-semibold text-white/90">Season & playoff forecast</h2>
        <button
          type="button"
          onClick={() => void generate()}
          disabled={refreshing}
          className="rounded-lg border border-white/20 bg-white/5 px-2.5 py-1.5 text-xs text-white/80 hover:bg-white/10 disabled:opacity-50"
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      <LeagueForecastDashboard
        teamForecasts={forecasts}
        playoffSpots={playoffSpots}
        teamNames={teamNames}
        teamRanks={teamRanks}
        aiSummary={aiSummary}
        generatedAt={generatedAt}
        avgConfidence={avgConfidence}
        simulationCount={2000}
      />
    </div>
  )
}
