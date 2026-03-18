/**
 * Fetch with retry and user-friendly error handling.
 */

import { getErrorMessage, getNetworkErrorMessage } from "./user-messages"
import { logError } from "./logger"
import { retryWithBackoff } from "./retry"

export type FetchWithRetryOptions = {
  maxAttempts?: number
  context?: string
}

/**
 * Fetch with retries (for transient failures). On failure throws an Error
 * whose message is user-friendly (from getErrorMessage).
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const { maxAttempts = 3, context = "fetch" } = options

  const run = async (): Promise<Response> => {
    const res = await fetch(input, init)
    if (res.ok) return res
    const text = await res.text().catch(() => "")
    let body: { error?: string } | null = null
    try {
      body = text ? JSON.parse(text) : null
    } catch {
      // ignore
    }
    const message = body?.error ?? `Request failed (${res.status})`
    const err = new Error(message) as Error & { status: number }
    err.status = res.status
    throw err
  }

  try {
    return await retryWithBackoff(run, {
      maxAttempts,
      retryable: (e) => {
        const status = (e as { status?: number })?.status
        return status === 408 || status === 429 || status === 500 || status === 502 || status === 503
      },
    })
  } catch (e) {
    const status = (e as { status?: number })?.status
    const isNetwork = e instanceof TypeError && (e.message === "Failed to fetch" || e.message?.includes("network"))
    const userMessage = isNetwork
      ? getNetworkErrorMessage()
      : getErrorMessage(e, { context })
    logError(e, { context, status, path: typeof input === "string" ? input : (input as Request)?.url })
    const err = new Error(userMessage) as Error & { status?: number }
    if (status != null) err.status = status
    throw err
  }
}

/**
 * Convenience: fetch JSON with retry. Returns parsed JSON or throws with user-friendly message.
 */
export async function fetchJsonWithRetry<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: FetchWithRetryOptions
): Promise<T> {
  const res = await fetchWithRetry(input, init, options)
  const data = await res.json().catch(() => null)
  if (data == null) {
    const err = new Error("Invalid response. Please try again.")
    logError(err, { context: options?.context ?? "fetchJson" })
    throw err
  }
  return data as T
}
