/**
 * Lightweight structured logging for server-side draft and API paths.
 *
 * Follows the same JSON-line convention as lib/league-engine-performance/observability.ts
 * so Vercel Log Drains can parse and aggregate both sources uniformly.
 *
 * Usage:
 *   import { logStructured } from '@/lib/logging/structured'
 *   logStructured('error', 'submit_pick', 'lifecycle_transition_failed', {
 *     leagueId: input.leagueId,
 *     error: String(e),
 *   })
 *
 * Client code: errors are forwarded to logError() instead of console so they
 * reach the existing client-side error tracking pipeline.
 *
 * Do NOT log PII (emails, names, IPs) in the `meta` object — treat every
 * line as potentially visible in plaintext Vercel function logs.
 */

export type LogLevel = 'info' | 'warn' | 'error'

/**
 * Emit a structured JSON log line on the server.
 * On the client, errors are forwarded to the existing logError() path;
 * info/warn are no-ops to keep the client console clean.
 */
export function logStructured(
  level: LogLevel,
  source: string,
  event: string,
  meta?: Record<string, unknown>,
): void {
  const isServer = typeof window === 'undefined'

  if (!isServer) {
    // Client: only surface errors; route through existing tracking pipeline.
    if (level === 'error') {
      // Dynamic import avoids a circular-dep cycle at build time.
      void import('@/lib/error-handling').then(({ logError }) => {
        logError(new Error(event), { context: source, ...meta })
      })
    }
    return
  }

  const payload: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    source,
    event,
    ...meta,
  }
  const line = JSON.stringify(payload)

  switch (level) {
    case 'error': console.error(line); break
    case 'warn':  console.warn(line);  break
    default:      console.log(line);   break
  }
}

/**
 * Create a high-resolution timer (server only; falls back to Date.now() on client).
 * Returns { elapsedMs } to match the createEngineTimer() API in
 * lib/league-engine-performance/observability.ts.
 */
export function createTimer(): { elapsedMs: () => number } {
  if (typeof process !== 'undefined' && process.hrtime?.bigint) {
    const start = process.hrtime.bigint()
    return { elapsedMs: () => Number(process.hrtime.bigint() - start) / 1_000_000 }
  }
  const start = Date.now()
  return { elapsedMs: () => Date.now() - start }
}
