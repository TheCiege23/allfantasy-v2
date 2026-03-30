'use client'

import { useState, useEffect, useCallback } from 'react'
import type { SportRules } from '@/lib/sport-rules-engine'
import { emitLeagueCreationPerf } from '@/lib/league-creation/perf'

const SPORT_RULES_CACHE_TTL_MS = 5 * 60 * 1000
const sportRulesCache = new Map<string, { data: SportRules; expiresAt: number }>()
const sportRulesInflight = new Map<string, Promise<SportRules>>()

function buildSportRulesCacheKey(sport: string, format?: string | null): string {
  return `${String(sport).trim().toUpperCase()}::${String(format ?? '').trim().toUpperCase()}`
}

/**
 * Fetches sport rules (valid roster slots, scoring, player pool, draft options) for league creation/settings.
 * GET /api/sport-rules?sport=NFL&format=PPR
 */
export function useSportRules(sport: string, format?: string | null) {
  const [rules, setRules] = useState<SportRules | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (s: string, f?: string | null, opts?: { force?: boolean }) => {
    if (!s?.trim()) {
      setRules(null)
      setLoading(false)
      return
    }
    const force = opts?.force === true
    const key = buildSportRulesCacheKey(s, f)
    const start = typeof performance !== 'undefined' ? performance.now() : Date.now()
    if (!force) {
      const cached = sportRulesCache.get(key)
      if (cached && cached.expiresAt > Date.now()) {
        emitLeagueCreationPerf('sport_rules_fetch', {
          sport: s.trim(),
          format: f?.trim() ?? null,
          source: 'memory_cache',
          forceRefresh: force,
          durationMs: Number(
            ((typeof performance !== 'undefined' ? performance.now() : Date.now()) - start).toFixed(1)
          ),
        })
        setRules(cached.data)
        setError(null)
        setLoading(false)
        return
      }
    } else {
      sportRulesCache.delete(key)
    }

    setLoading(true)
    setError(null)
    try {
      let inflight = sportRulesInflight.get(key)
      const source = inflight ? 'inflight' : 'network'
      if (!inflight) {
        inflight = (async () => {
          const params = new URLSearchParams({ sport: s.trim() })
          if (f?.trim()) params.set('format', f.trim())
          const res = await fetch(`/api/sport-rules?${params.toString()}`)
          if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            throw new Error(data.error ?? 'Failed to load sport rules')
          }
          const data = (await res.json()) as SportRules
          sportRulesCache.set(key, {
            data,
            expiresAt: Date.now() + SPORT_RULES_CACHE_TTL_MS,
          })
          return data
        })().finally(() => {
          sportRulesInflight.delete(key)
        })
        sportRulesInflight.set(key, inflight)
      }
      const data = await inflight
      emitLeagueCreationPerf('sport_rules_fetch', {
        sport: s.trim(),
        format: f?.trim() ?? null,
        source,
        forceRefresh: force,
        durationMs: Number(
          ((typeof performance !== 'undefined' ? performance.now() : Date.now()) - start).toFixed(1)
        ),
      })
      setRules(data)
    } catch (e) {
      emitLeagueCreationPerf('sport_rules_fetch_error', {
        sport: s.trim(),
        format: f?.trim() ?? null,
        forceRefresh: force,
        message: e instanceof Error ? e.message : 'Failed to load sport rules',
        durationMs: Number(
          ((typeof performance !== 'undefined' ? performance.now() : Date.now()) - start).toFixed(1)
        ),
      })
      setError(e instanceof Error ? e.message : 'Failed to load sport rules')
      setRules(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(sport, format)
  }, [sport, format, load])

  return { rules, loading, error, refetch: () => load(sport, format, { force: true }) }
}
