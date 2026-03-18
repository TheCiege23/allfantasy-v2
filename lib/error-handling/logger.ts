/**
 * Central error logging. Use in client and server.
 * In development: logs to console. Can be extended to send to a service (e.g. Sentry).
 */

export type ErrorLogContext = {
  context?: string
  userId?: string
  leagueId?: string
  path?: string
  status?: number
  [key: string]: unknown
}

function isClient(): boolean {
  return typeof window !== "undefined"
}

/**
 * Log an error with optional context. Safe to call from client or server.
 */
export function logError(error: unknown, ctx?: ErrorLogContext): void {
  const context = ctx?.context ?? "app"
  const payload: Record<string, unknown> = {
    message: error instanceof Error ? error.message : String(error),
    context,
    ...(ctx && typeof ctx === "object" ? ctx : {}),
  }
  if (error instanceof Error && error.stack) {
    payload.stack = error.stack
  }

  if (isClient()) {
    if (process.env.NODE_ENV === "development") {
      console.error(`[ErrorHandling] ${context}:`, error, ctx ?? "")
    }
    // Future: send to client-side error service (e.g. Sentry)
    return
  }

  // Server
  if (process.env.NODE_ENV === "development") {
    console.error(`[ErrorHandling] ${context}:`, payload)
  }
  // Future: send to server-side error service
}
