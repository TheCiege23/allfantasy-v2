'use client'

import { useState, useEffect, useCallback } from 'react'
import type { SportRules } from '@/lib/sport-rules-engine'

/**
 * Fetches sport rules (valid roster slots, scoring, player pool, draft options) for league creation/settings.
 * GET /api/sport-rules?sport=NFL&format=PPR
 */
export function useSportRules(sport: string, format?: string | null) {
  const [rules, setRules] = useState<SportRules | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (s: string, f?: string | null) => {
    if (!s?.trim()) {
      setRules(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ sport: s.trim() })
      if (f?.trim()) params.set('format', f.trim())
      const res = await fetch(`/api/sport-rules?${params.toString()}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to load sport rules')
      }
      const data = await res.json()
      setRules(data as SportRules)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sport rules')
      setRules(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(sport, format)
  }, [sport, format, load])

  return { rules, loading, error, refetch: () => load(sport, format) }
}
