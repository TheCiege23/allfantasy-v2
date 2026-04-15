'use client'

import { useCallback, useState } from 'react'
import type { AiPlayerComparisonRequest, AiPlayerComparisonResponse } from '@/lib/ai-player-comparison/types'

export function useAiPlayerComparison() {
  const [data, setData] = useState<AiPlayerComparisonResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(async (req: AiPlayerComparisonRequest) => {
    setLoading(true)
    setError(null)
    setData(null)
    try {
      const res = await fetch('/api/ai/player-comparison', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      })
      const json = (await res.json().catch(() => ({}))) as AiPlayerComparisonResponse | { ok?: boolean; error?: string }
      if (!res.ok) {
        const err = typeof (json as { error?: string }).error === 'string' ? (json as { error: string }).error : 'Request failed'
        setError(err)
        return null
      }
      if (json && typeof json === 'object' && 'ok' in json && json.ok === true) {
        setData(json as AiPlayerComparisonResponse)
        return json as AiPlayerComparisonResponse
      }
      setError('Unexpected response')
      return null
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setData(null)
    setError(null)
  }, [])

  return { data, loading, error, run, reset }
}
