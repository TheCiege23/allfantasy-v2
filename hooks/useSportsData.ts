'use client'

/**
 * PROMPT 153 — Hook for GET /api/sports. Supports loading, error, and cached state for ClearSports-backed (or any) sports data.
 * Use for any UI that depends on /api/sports so we render valid loading/error/stale states and avoid dead refresh buttons.
 */

import { useState, useCallback, useEffect } from 'react'

export type SportParam = 'NFL' | 'NBA' | 'MLB' | 'NHL' | 'MLS' | 'NCAAB' | 'CFB'
export type DataTypeParam = 'teams' | 'players' | 'games' | 'stats' | 'standings' | 'schedule'

export interface UseSportsDataParams {
  sport: SportParam
  type: DataTypeParam
  id?: string
  refresh?: boolean
  enabled?: boolean
}

export interface UseSportsDataResult<T = unknown> {
  data: T | null
  loading: boolean
  error: string | null
  source: string | null
  cached: boolean
  fetchedAt: string | null
  refetch: (forceRefresh?: boolean) => Promise<void>
}

export function useSportsData<T = unknown>(
  params: UseSportsDataParams,
): UseSportsDataResult<T> {
  const { sport, type, id, refresh = false, enabled = true } = params
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<string | null>(null)
  const [cached, setCached] = useState(false)
  const [fetchedAt, setFetchedAt] = useState<string | null>(null)

  const refetch = useCallback(
    async (forceRefresh = false) => {
      if (!enabled) return
      setLoading(true)
      setError(null)
      try {
        const q = new URLSearchParams({ sport, type: type as string })
        if (id) q.set('id', id)
        if (forceRefresh || refresh) q.set('refresh', 'true')
        const res = await fetch(`/api/sports?${q.toString()}`)
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError(json.error || json.details || 'Failed to load sports data')
          setData(null)
          setSource(null)
          setCached(false)
          setFetchedAt(null)
          return
        }
        setData((json.data ?? null) as T)
        setSource(json.source ?? null)
        setCached(!!json.cached)
        setFetchedAt(json.fetchedAt ?? null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Network error')
        setData(null)
        setSource(null)
        setCached(false)
        setFetchedAt(null)
      } finally {
        setLoading(false)
      }
    },
    [enabled, sport, type, id, refresh],
  )

  useEffect(() => {
    if (enabled) refetch(false)
  }, [enabled, sport, type, id])

  return {
    data,
    loading,
    error,
    source,
    cached,
    fetchedAt,
    refetch,
  }
}
