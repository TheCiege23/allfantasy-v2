'use client'

import { useCallback, useEffect, useState } from 'react'
import type { AiTimeContextPayload, UserTimeContext } from '@/lib/time-engine/types'

type TimeContextBundle = {
  context: UserTimeContext | null
  aiTimeContext: AiTimeContextPayload | null
  /** Same payload as `aiTimeContext` — canonical Fantasy Time Engine contract for AI. */
  fantasyTimeEngine: AiTimeContextPayload | null
}

/**
 * Client hook: loads authoritative time context from GET /api/user/time-context (server UTC + account TZ).
 */
export function useTimeContext(enabled: boolean): TimeContextBundle & { refresh: () => Promise<void>; loading: boolean } {
  const [data, setData] = useState<TimeContextBundle>({
    context: null,
    aiTimeContext: null,
    fantasyTimeEngine: null,
  })

  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    try {
      const r = await fetch('/api/user/time-context', { credentials: 'same-origin', cache: 'no-store' })
      if (!r.ok) {
        setData({ context: null, aiTimeContext: null, fantasyTimeEngine: null })
        return
      }
      const j = (await r.json()) as {
        context?: UserTimeContext
        aiTimeContext?: AiTimeContextPayload
        fantasyTimeEngine?: AiTimeContextPayload
      }
      const ai = j.aiTimeContext ?? j.fantasyTimeEngine ?? null
      setData({
        context: j.context ?? null,
        aiTimeContext: ai,
        fantasyTimeEngine: j.fantasyTimeEngine ?? ai,
      })
    } catch {
      setData({ context: null, aiTimeContext: null, fantasyTimeEngine: null })
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { ...data, refresh, loading }
}
