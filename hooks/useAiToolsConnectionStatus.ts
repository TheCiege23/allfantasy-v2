'use client'

import { useCallback, useEffect, useState } from 'react'

export type ConnectionChipState = 'connected' | 'loading' | 'degraded' | 'unavailable'

export type AiToolsConnectionPayload = {
  database: ConnectionChipState
  sportsData: ConnectionChipState
  news: ConnectionChipState
  aiEngine: ConnectionChipState
  rollingInsights?: ConnectionChipState
  clearSports?: ConnectionChipState
  computedAt: string
}

function map(s: string | undefined): ConnectionChipState {
  if (s === 'connected') return 'connected'
  if (s === 'degraded') return 'degraded'
  if (s === 'unavailable') return 'unavailable'
  return 'unavailable'
}

export function useAiToolsConnectionStatus(enabled = true) {
  const [data, setData] = useState<AiToolsConnectionPayload | null>(null)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState(false)

  const refresh = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError(false)
    try {
      const res = await fetch('/api/ai-tools/connection-status', { cache: 'no-store' })
      if (!res.ok) {
        setData(null)
        setError(true)
        return
      }
      const json = (await res.json()) as {
        database?: string
        sportsData?: string
        news?: string
        aiEngine?: string
        rollingInsights?: string
        clearSports?: string
        computedAt?: string
      }
      setData({
        database: map(json.database),
        sportsData: map(json.sportsData),
        news: map(json.news),
        aiEngine: map(json.aiEngine),
        rollingInsights: json.rollingInsights ? map(json.rollingInsights) : undefined,
        clearSports: json.clearSports ? map(json.clearSports) : undefined,
        computedAt: typeof json.computedAt === 'string' ? json.computedAt : new Date().toISOString(),
      })
    } catch {
      setData(null)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { data, loading, error, refresh }
}
