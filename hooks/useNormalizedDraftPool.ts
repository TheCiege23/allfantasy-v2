'use client'

import { useState, useCallback, useEffect } from 'react'
import type { NormalizedDraftEntry } from '@/lib/draft-sports-models/types'

export type NormalizedDraftPoolResult = {
  entries: NormalizedDraftEntry[]
  sport: string
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Fetch normalized draft pool for a league (live, mock, auction, slow, keeper, devy, C2C).
 * Uses pipeline-backed API; same shape for all draft types. Safe to use when leagueId is null (no-op).
 */
export function useNormalizedDraftPool(leagueId: string | null): NormalizedDraftPoolResult {
  const [entries, setEntries] = useState<NormalizedDraftEntry[]>([])
  const [sport, setSport] = useState<string>('NFL')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!leagueId) {
      setEntries([])
      setSport('NFL')
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/draft/pool`, { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (res.ok && Array.isArray(data.entries)) {
        setEntries(data.entries)
        setSport(data.sport ?? 'NFL')
      } else {
        setEntries([])
        setError(data?.error ?? 'Failed to load draft pool')
      }
    } catch (e) {
      setEntries([])
      setError(e instanceof Error ? e.message : 'Failed to load draft pool')
    } finally {
      setLoading(false)
    }
  }, [leagueId])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { entries, sport, loading, error, refetch }
}
