'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { PlayerCardAnalyticsPayload } from '@/lib/player-card-analytics/types'

type UsePlayerCardAnalyticsInput = {
  playerId?: string | null
  playerName: string
  position?: string | null
  team?: string | null
  sport?: string | null
  season?: string | null
}

type UsePlayerCardAnalyticsOptions = {
  enabled?: boolean
  cacheTtlMs?: number
}

type CacheEntry = {
  payload: PlayerCardAnalyticsPayload
  ts: number
}

const CACHE = new Map<string, CacheEntry>()
const DEFAULT_CACHE_TTL_MS = 2 * 60 * 1000

function toKey(input: UsePlayerCardAnalyticsInput): string {
  const name = String(input.playerName ?? '').trim().toLowerCase()
  const sport = String(input.sport ?? '').trim().toUpperCase()
  const position = String(input.position ?? '').trim().toUpperCase()
  const team = String(input.team ?? '').trim().toUpperCase()
  const season = String(input.season ?? '').trim()
  return [input.playerId ?? '', name, sport, position, team, season].join('|')
}

export function usePlayerCardAnalytics(
  input: UsePlayerCardAnalyticsInput,
  options: UsePlayerCardAnalyticsOptions = {}
) {
  const { enabled = true, cacheTtlMs = DEFAULT_CACHE_TTL_MS } = options
  const key = toKey(input)
  const [data, setData] = useState<PlayerCardAnalyticsPayload | null>(null)
  const [loading, setLoading] = useState<boolean>(enabled && !!input.playerName?.trim())
  const [error, setError] = useState<string | null>(null)
  const [hasFetched, setHasFetched] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const fetchAnalytics = useCallback(async () => {
    const playerName = String(input.playerName ?? '').trim()
    if (!playerName) return

    const cached = CACHE.get(key)
    if (cached && Date.now() - cached.ts < cacheTtlMs) {
      setData(cached.payload)
      setError(null)
      setLoading(false)
      setHasFetched(true)
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/player-card-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: input.playerId ?? null,
          playerName,
          position: input.position ?? null,
          team: input.team ?? null,
          sport: input.sport ?? null,
          season: input.season ?? null,
        }),
        signal: controller.signal,
      })
      const payload = await res.json()
      if (!res.ok || payload?.error) {
        const message = String(payload?.error ?? 'Failed to load analytics')
        setError(message)
        setData(null)
      } else {
        const next = payload as PlayerCardAnalyticsPayload
        CACHE.set(key, { payload: next, ts: Date.now() })
        setData(next)
        setError(null)
      }
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return
      setError('Failed to load analytics')
      setData(null)
    } finally {
      setLoading(false)
      setHasFetched(true)
    }
  }, [cacheTtlMs, input.playerId, input.playerName, input.position, input.season, input.sport, input.team, key])

  useEffect(() => {
    setError(null)
    setHasFetched(false)
    setData(null)
    setLoading(enabled && !!input.playerName?.trim())
  }, [enabled, input.playerName, key])

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }
    void fetchAnalytics()
    return () => {
      abortRef.current?.abort()
    }
  }, [enabled, fetchAnalytics])

  return {
    data,
    loading,
    error,
    hasFetched,
    refetch: fetchAnalytics,
  }
}
