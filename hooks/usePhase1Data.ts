'use client'

import { useCallback, useEffect, useState } from 'react'

/** Generic fetch-JSON hook with loading/error/refresh. */
export function useFetchJson<T>(
  url: string | null,
  options?: { method?: string; body?: unknown }
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(!!url)
  const [error, setError] = useState<string | null>(null)
  const bodyStr = options?.body ? JSON.stringify(options.body) : undefined

  const fetchData = useCallback(async () => {
    if (!url) { setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(url, {
        method: options?.method ?? 'GET',
        headers: bodyStr ? { 'Content-Type': 'application/json' } : undefined,
        body: bodyStr,
        cache: 'no-store',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setError(err.error ?? `Request failed (${res.status})`)
        return
      }
      setData(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }, [url, options?.method, bodyStr])

  useEffect(() => { fetchData() }, [fetchData])

  return { data, loading, error, refresh: fetchData }
}

// ── Shared Types ──

export type LiveScoreGame = {
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  status: string
  quarter?: string | null
  clock?: string | null
  sport: string
  startTime: string | null
}

export type GameWeather = {
  team: string
  venue: string
  isDome: boolean
  temp?: number
  wind?: number
  impact?: string
}

export type StandingRow = {
  rank: number
  teamName: string
  teamLogo?: string
  wins: number
  losses: number
  ties?: number
  pointsFor?: number
  pointsAgainst?: number
  streak?: string
}

export type DepthChartEntry = {
  team: string
  position: string
  players: string[]
  source: string
}

export type SimMatchupResult = {
  winProbabilityA: number
  winProbabilityB: number
  projectedScoreA: number
  projectedScoreB: number
  keyFactors: string[]
  swingPlayers: string[]
}
