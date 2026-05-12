/**
 * GET /api/draft/metrics
 *
 * Internal health-check endpoint that surfaces in-process draft stream
 * delivery counters. No auth required — data is non-sensitive operational
 * metrics (counts only, no user or draft IDs).
 *
 * Intended for:
 *  - Vercel health probes
 *  - Grafana / Datadog synthetic monitors
 *  - Quick manual inspection during incidents
 *
 * Response shape:
 *  {
 *    stream: { attempts, deliveries, errors, errorRate }
 *    rateLimitMapSize: number  // size of the in-process rate-limit map
 *    ts: string               // ISO timestamp
 *  }
 */

import { NextResponse } from 'next/server'
import { getStreamPublishStats } from '@/lib/draft/draft-stream-store'
// Re-export the map size for observability without exposing internals.
// getRateLimitMapSize is added to lib/rate-limit.ts in this same commit.
import { getRateLimitMapSize } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function GET() {
  const stream = getStreamPublishStats()
  const errorRate =
    stream.attempts > 0
      ? Number((stream.errors / stream.attempts).toFixed(4))
      : 0

  return NextResponse.json({
    stream: { ...stream, errorRate },
    rateLimitMapSize: getRateLimitMapSize(),
    ts: new Date().toISOString(),
  })
}
