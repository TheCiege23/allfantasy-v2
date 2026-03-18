/**
 * Retry logic with exponential backoff for async operations (e.g. fetch).
 */

export type RetryOptions = {
  maxAttempts?: number
  baseMs?: number
  maxMs?: number
  retryable?: (error: unknown) => boolean
}

const DEFAULT_RETRYABLE = (error: unknown): boolean => {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    if (msg.includes("failed (5") || msg.includes("failed (429)")) return true
    if (msg.includes("network") || msg.includes("fetch")) return true
  }
  const withStatus = error as { status?: number }
  const status = withStatus?.status
  if (status === 408 || status === 429 || status === 502 || status === 503) return true
  return false
}

/**
 * Run an async function with retries and exponential backoff.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseMs = 800,
    maxMs = 8000,
    retryable = DEFAULT_RETRYABLE,
  } = options

  let lastError: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (e) {
      lastError = e
      if (attempt === maxAttempts || !retryable(e)) throw e
      const delay = Math.min(baseMs * Math.pow(2, attempt - 1), maxMs)
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  throw lastError
}
