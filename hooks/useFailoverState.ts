'use client'

import { useState, useCallback } from 'react'
import type { FailoverState, FailoverResult } from '@/lib/failover'
import { getDegradedMessage } from '@/lib/failover'
import { getErrorMessage } from '@/lib/error-handling'

export type UseFailoverStateOptions = {
  onFallback?: (message: string) => void
  onError?: (message: string) => void
}

export type UseFailoverStateResult = {
  state: FailoverState
  message: string | null
  setLoading: () => void
  setSuccess: () => void
  setFromResult: (result: FailoverResult<unknown>) => void
  setError: (error: unknown) => void
  reset: () => void
}

const INITIAL_STATE: FailoverState = 'idle'

/**
 * Hook for UI that supports loading, success, fallback (degraded), and error states.
 * Call setFromResult after runWithRetryAndFallback (or similar) to drive state and message.
 */
export function useFailoverState(
  options: UseFailoverStateOptions = {}
): UseFailoverStateResult {
  const [state, setState] = useState<FailoverState>(INITIAL_STATE)
  const [message, setMessage] = useState<string | null>(null)

  const setLoading = useCallback(() => {
    setState('loading')
    setMessage(null)
  }, [])

  const setSuccess = useCallback(() => {
    setState('success')
    setMessage(null)
  }, [])

  const setFromResult = useCallback(
    (result: FailoverResult<unknown>) => {
      if (result.ok && result.fromFallback) {
        setState('fallback')
        setMessage(getDegradedMessage({ fallbackReason: result.reason }))
        options.onFallback?.(getDegradedMessage({ fallbackReason: result.reason }))
      } else if (result.ok) {
        setState('success')
        setMessage(null)
      } else {
        setState('error')
        setMessage(result.error || getDegradedMessage())
        options.onError?.(result.error || getDegradedMessage())
      }
    },
    [options.onFallback, options.onError]
  )

  const setError = useCallback(
    (error: unknown) => {
      setState('error')
      const msg = getErrorMessage(error, { fallback: getDegradedMessage() })
      setMessage(msg)
      options.onError?.(msg)
    },
    [options.onError]
  )

  const reset = useCallback(() => {
    setState(INITIAL_STATE)
    setMessage(null)
  }, [])

  return {
    state,
    message,
    setLoading,
    setSuccess,
    setFromResult,
    setError,
    reset,
  }
}
