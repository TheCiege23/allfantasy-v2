'use client'

/**
 * PROMPT 253 — Frontend hook for token balance. Refetch after spend/purchase.
 * PROMPT 268 — Refetch on window focus (throttled) to avoid stale balance after buying in another tab.
 * PROMPT 280 — Uses fetchWithRetry, getErrorMessage, logError for clean error handling.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { FOCUS_REFETCH_THROTTLE_MS } from '@/lib/state-consistency/refresh-triggers'
import { POST_PURCHASE_SYNC_EVENT } from '@/lib/state-consistency/post-purchase-sync-events'
import { addStateRefreshListener } from '@/lib/state-consistency/state-events'
import { fetchWithRetry, getErrorMessage, logError } from '@/lib/error-handling'

export interface TokenBalanceState {
  balance: number
  updatedAt: string
}

export function useTokenBalance() {
  const [data, setData] = useState<TokenBalanceState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const lastFocusRefetch = useRef(0)

  const fetchBalance = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchWithRetry('/api/tokens/balance', undefined, { context: 'token-balance' })
      const json = await res.json()
      setData({ balance: json.balance ?? 0, updatedAt: json.updatedAt ?? '' })
    } catch (e) {
      const err = e as Error & { status?: number }
      if (err.status === 401) return
      setError(getErrorMessage(e, { context: 'token-balance' }))
      logError(e, { context: 'useTokenBalance' })
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBalance()
  }, [fetchBalance])

  useEffect(() => {
    const onForeground = () => {
      const now = Date.now()
      if (now - lastFocusRefetch.current < FOCUS_REFETCH_THROTTLE_MS) return
      lastFocusRefetch.current = now
      void fetchBalance()
    }
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      onForeground()
    }
    window.addEventListener('focus', onForeground)
    window.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('focus', onForeground)
      window.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [fetchBalance])

  useEffect(() => {
    const onPostPurchaseSync = () => {
      void fetchBalance()
    }
    window.addEventListener(POST_PURCHASE_SYNC_EVENT, onPostPurchaseSync as EventListener)
    return () =>
      window.removeEventListener(
        POST_PURCHASE_SYNC_EVENT,
        onPostPurchaseSync as EventListener
      )
  }, [fetchBalance])

  useEffect(() => addStateRefreshListener(['tokens', 'all'], () => void fetchBalance()), [fetchBalance])

  return { balance: data?.balance ?? 0, updatedAt: data?.updatedAt ?? '', loading, error, refetch: fetchBalance }
}
