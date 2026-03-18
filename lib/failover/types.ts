/**
 * Failover system types — retry, fallback states, graceful degradation.
 */

/** Result of an operation that may have used a fallback after primary failure. */
export type FailoverResult<T> =
  | { ok: true; data: T; fromFallback: false }
  | { ok: true; data: T; fromFallback: true; reason?: string }
  | { ok: false; error: string; fromFallback?: false }

/** UI-friendly state for components that support retry and fallback. */
export type FailoverState =
  | 'idle'
  | 'loading'
  | 'success'
  | 'fallback'
  | 'error'

export type FailoverStateAndMessage = {
  state: FailoverState
  message: string | null
}

/** Options for runWithRetryAndFallback. */
export type RunWithFailoverOptions<T> = {
  /** Max attempts for primary (default 3). */
  maxAttempts?: number
  /** Base delay ms for backoff (default 800). */
  baseMs?: number
  /** Max delay ms (default 8000). */
  maxMs?: number
  /** When to retry (default: 408, 429, 5xx, network). */
  retryable?: (error: unknown) => boolean
  /** Fallback value or async fn when primary fails after retries. */
  fallback: T | (() => T) | (() => Promise<T>)
  /** Optional label for logging. */
  label?: string
}
