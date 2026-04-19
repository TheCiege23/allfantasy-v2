'use client'

import { useCallback, useEffect, useState } from 'react'
import type { IntelligenceSnapshot } from '@/lib/intelligence/types'

export function useIntelligenceSnapshot(args: { leagueId: string | null; enabled?: boolean }) {
  const { leagueId, enabled = true } = args
  const [data, setData] = useState<IntelligenceSnapshot | null>(null)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState(false)

  const refresh = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError(false)
    try {
      const q = leagueId?.trim() ? `?leagueId=${encodeURIComponent(leagueId.trim())}` : ''
      const res = await fetch(`/api/intelligence/snapshot${q}`, { cache: 'no-store' })
      if (!res.ok) {
        setData(null)
        setError(true)
        return
      }
      const json = (await res.json()) as IntelligenceSnapshot
      if (json.ok && json.schemaVersion === 1) {
        setData(json)
      } else {
        setData(null)
        setError(true)
      }
    } catch {
      setData(null)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [enabled, leagueId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { data, loading, error, refresh }
}
