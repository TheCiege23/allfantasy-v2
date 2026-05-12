/**
 * withTimedRoute — lightweight timing HOF for Next.js App Router route handlers.
 *
 * Wraps a route handler and emits a structured JSON log line with:
 *   - elapsed time in milliseconds (p50/p95 visible in Vercel Log Drains)
 *   - HTTP status code
 *   - route label for easy log filtering
 *
 * Designed for hot-path draft routes where the DB-write overhead of
 * withApiUsage (ApiUsageRollup upserts) is unacceptable at peak load
 * (50+ concurrent picks/s = 50+ extra Prisma writes/s).
 *
 * Usage:
 *   export const POST = withTimedRoute('draft_pick', async (req, ctx) => {
 *     // ... handler body
 *   })
 *
 * The log line shape (JSON) is:
 *   { ts, level, source, event, route, method, statusCode, durationMs }
 *
 * Vercel Log Drain filter to extract draft pick p95:
 *   source:draft_route route:draft_pick | stats avg(durationMs) p95(durationMs)
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createTimer, logStructured } from './structured'

type RouteContext = { params: Promise<Record<string, string>> }
type RouteHandler = (req: NextRequest, ctx: RouteContext) => Promise<NextResponse | Response>

/**
 * Wrap a Next.js App Router handler with request timing.
 *
 * @param route  Short label for the route — used in log filtering (e.g. 'draft_pick')
 * @param handler  The original async route handler
 */
export function withTimedRoute(route: string, handler: RouteHandler): RouteHandler {
  return async function timedHandler(req: NextRequest, ctx: RouteContext) {
    const timer = createTimer()
    let statusCode = 500
    try {
      const response = await handler(req, ctx)
      statusCode = response.status
      return response
    } catch (err) {
      // Re-throw so Next.js error boundaries handle it; just capture the status
      statusCode = 500
      throw err
    } finally {
      const durationMs = Math.round(timer.elapsedMs())
      logStructured('info', 'draft_route', 'request_timed', {
        route,
        method: req.method,
        statusCode,
        durationMs,
      })
    }
  }
}
