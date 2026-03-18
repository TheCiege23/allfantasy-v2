'use client'

/**
 * PROMPT 273 — League list with refetch on mount and window focus (throttled).
 * PROMPT 280 — Uses fetchWithRetry, getErrorMessage, logError for clean error handling.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { FOCUS_REFETCH_THROTTLE_MS } from '@/lib/state-consistency/refresh-triggers'
import { fetchWithRetry, getErrorMessage, logError } from '@/lib/error-handling'
import type { LeagueForGrouping } from '@/lib/dashboard'

export interface UseLeagueListResult {
  leagues: LeagueForGrouping[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useLeagueList(enabled: boolean = true): UseLeagueListResult {
  const [leagues, setLeagues] = useState<LeagueForGrouping[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const lastFocusRefetch = useRef(0)

  const fetchList = useCallback(async () => {
    if (!enabled) {
      setLeagues([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetchWithRetry('/api/league/list', { cache: 'no-store' }, { context: 'league-list' })
      if (res.status === 401) {
        setLeagues([])
        return
      }
      const data = await res.json().catch(() => ({}))
      setLeagues(Array.isArray(data?.leagues) ? data.leagues : [])
    } catch (e) {
      const err = e as Error & { status?: number }
      if (err.status === 401) {
        setLeagues([])
        return
      }
      setError(getErrorMessage(e, { context: 'league-list' }))
      logError(e, { context: 'useLeagueList' })
      setLeagues([])
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    void fetchList()
  }, [fetchList])

  useEffect(() => {
    if (!enabled) return
    const onFocus = () => {
      const now = Date.now()
      if (now - lastFocusRefetch.current < FOCUS_REFETCH_THROTTLE_MS) return
      lastFocusRefetch.current = now
      void fetchList()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [enabled, fetchList])

  return { leagues, loading, error, refetch: fetchList }
}
