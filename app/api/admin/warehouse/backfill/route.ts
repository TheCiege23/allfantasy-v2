/**
 * POST /api/admin/warehouse/backfill — trigger warehouse ingestion pipelines (backfill).
 * Admin-only. Optional: call from cron (e.g. Vercel cron or external scheduler).
 */

import { withApiUsage } from '@/lib/telemetry/usage'
import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedRequest, adminUnauthorized } from '@/lib/adminAuth'
import { runWarehouseBackfill, type BackfillPipeline } from '@/lib/data-warehouse/backfill'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export const POST = withApiUsage({
  endpoint: '/api/admin/warehouse/backfill',
  tool: 'AdminWarehouseBackfill',
})(async (request: NextRequest) => {
  try {
    if (!isAuthorizedRequest(request)) return adminUnauthorized()

    const body = await request.json().catch(() => ({}))
    const leagueIds = Array.isArray(body.leagueIds) ? body.leagueIds : undefined
    const sport = typeof body.sport === 'string' ? body.sport : undefined
    const season = typeof body.season === 'number' ? body.season : undefined
    const weeks = Array.isArray(body.weeks) ? body.weeks.filter((w: unknown) => typeof w === 'number') : undefined
    const pipelines = Array.isArray(body.pipelines)
      ? (body.pipelines.filter((p: unknown) =>
          ['gameStats', 'matchups', 'standings', 'rosterSnapshots', 'drafts', 'transactions'].includes(String(p))
        ) as BackfillPipeline[])
      : undefined
    const dryRun = Boolean(body.dryRun)

    const result = await runWarehouseBackfill({
      leagueIds,
      sport,
      season,
      weeks,
      pipelines,
      dryRun,
    })

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-cache, no-store' },
    })
  } catch (err) {
    console.error('[admin/warehouse/backfill]', err)
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Backfill failed' },
      { status: 500 }
    )
  }
})
