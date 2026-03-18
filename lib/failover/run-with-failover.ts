/**
 * Run an async operation with retry and optional fallback for graceful degradation.
 * Uses retryWithBackoff from error-handling; on final failure runs fallback and returns data with fromFallback: true.
 */

import { retryWithBackoff } from '@/lib/error-handling/retry'
import type { FailoverResult } from './types'
import type { RunWithFailoverOptions } from './types'

/**
 * Run primary fn with retry; on final failure run fallback (value or fn) and return result with fromFallback: true.
 * Use for external calls (APIs, email, etc.) where a fallback value or degraded result is acceptable.
 */
export async function runWithRetryAndFallback<T>(
  primary: () => Promise<T>,
  options: RunWithFailoverOptions<T>
): Promise<FailoverResult<T>> {
  const {
    maxAttempts = 3,
    baseMs = 800,
    maxMs = 8000,
    retryable,
    fallback,
    label = 'operation',
  } = options

  try {
    const data = await retryWithBackoff(primary, {
      maxAttempts,
      baseMs,
      maxMs,
      retryable,
    })
    return { ok: true, data, fromFallback: false }
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e)
    if (label) {
      console.warn(`[failover] ${label} failed after retries, using fallback:`, reason)
    }
    try {
      const fallbackValue =
        typeof fallback === 'function'
          ? await Promise.resolve((fallback as () => T | Promise<T>)())
          : fallback
      return { ok: true, data: fallbackValue, fromFallback: true, reason }
    } catch (fallbackError) {
      const errMsg =
        fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
      return { ok: false, error: errMsg }
    }
  }
}

/**
 * Run primary fn with retry only (no fallback). On failure returns FailoverResult with ok: false.
 * Use when there is no sensible fallback and you want a consistent result shape.
 */
export async function runWithRetryOnly<T>(
  fn: () => Promise<T>,
  options: { maxAttempts?: number; baseMs?: number; maxMs?: number; retryable?: (e: unknown) => boolean; label?: string } = {}
): Promise<FailoverResult<T>> {
  const { maxAttempts = 3, baseMs = 800, maxMs = 8000, retryable, label } = options
  try {
    const data = await retryWithBackoff(fn, { maxAttempts, baseMs, maxMs, retryable })
    return { ok: true, data, fromFallback: false }
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    if (label) console.warn(`[failover] ${label} failed:`, error)
    return { ok: false, error }
  }
}
