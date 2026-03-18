'use client'

import { useState, useCallback } from 'react'
import { getErrorMessage, getNetworkErrorMessage, logError, retryWithBackoff } from '@/lib/error-handling'

export type UseAsyncWithRetryOptions = {
  maxAttempts?: number
  context?: string
  onError?: (message: string) => void
}

export type UseAsyncWithRetryResult<T> = {
  data: T | null
  error: string | null
  loading: boolean
  run: (asyncFn: () => Promise<T>) => Promise<T | null>
  reset: () => void
}

/**
 * Run an async function with retry; exposes loading, error (user-friendly), and run/reset.
 * Usage: const { run, error, loading } = useAsyncWithRetry(); run(async () => fetch(...).then(r => r.json()))
 */
export function useAsyncWithRetry<T>(
  options: UseAsyncWithRetryOptions = {}
): UseAsyncWithRetryResult<T> {
  const { maxAttempts = 3, context = 'async', onError } = options
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const run = useCallback(
    async (asyncFn: () => Promise<T>): Promise<T | null> => {
      setLoading(true)
      setError(null)
      try {
        const result = await retryWithBackoff(asyncFn, { maxAttempts })
        setData(result)
        return result
      } catch (e) {
        const isNetwork = e instanceof TypeError && (e.message === 'Failed to fetch' || e.message?.includes('network'))
        const message = isNetwork ? getNetworkErrorMessage() : getErrorMessage(e, { context })
        setError(message)
        logError(e, { context })
        onError?.(message)
        return null
      } finally {
        setLoading(false)
      }
    },
    [maxAttempts, context, onError]
  )

  const reset = useCallback(() => {
    setData(null)
    setError(null)
  }, [])

  return { data, error, loading, run, reset }
}
