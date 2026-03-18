/**
 * API failure logging. Call from API route wrappers (e.g. withApiUsage catch or on non-2xx response).
 */

import { captureException } from './capture'

export type ApiFailureContext = {
  endpoint: string
  method: string
  status: number
  durationMs?: number
  userId?: string | null
  leagueId?: string | null
  error?: unknown
}

/**
 * Log an API failure (4xx/5xx or thrown error). Use in withApiUsage or equivalent.
 */
export function logApiFailure(ctx: ApiFailureContext): void {
  const { endpoint, method, status, durationMs, userId, leagueId, error } = ctx
  const payload = {
    endpoint,
    method,
    status,
    durationMs,
    userId: userId ?? undefined,
    leagueId: leagueId ?? undefined,
  }
  if (error != null) {
    captureException(error, {
      context: 'api_failure',
      path: endpoint,
      ...payload,
      tags: { type: 'api', status: String(status) },
    })
  } else {
    // Non-thrown failure (e.g. handler returned 404/500)
    captureException(new Error(`API ${method} ${endpoint} returned ${status}`), {
      context: 'api_failure',
      path: endpoint,
      ...payload,
      tags: { type: 'api', status: String(status) },
    })
  }
}
