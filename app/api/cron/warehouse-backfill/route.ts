/**
 * POST /api/cron/warehouse-backfill — scheduled warehouse backfill.
 * Secured by x-cron-secret or x-admin-secret header (CRON_SECRET or WAREHOUSE_CRON_SECRET).
 * Call from Vercel Cron or external scheduler (e.g. daily).
 */

import { NextRequest, NextResponse } from 'next/server'
import { runWarehouseBackfill } from '@/lib/data-warehouse/backfill'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

function requireCron(req: Request): boolean {
  const provided =
    req.headers.get('x-cron-secret') ?? req.headers.get('x-admin-secret') ?? ''
  const cronSecret =
    process.env.WAREHOUSE_CRON_SECRET ?? process.env.CRON_SECRET
  const adminSecret =
    process.env.BRACKET_ADMIN_SECRET ?? process.env.ADMIN_PASSWORD
  return !!(
    provided &&
    ((cronSecret && provided === cronSecret) ||
      (adminSecret && provided === adminSecret))
  )
}

export async function POST(req: NextRequest) {
  if (!requireCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const dryRun = url.searchParams.get('dryRun') === '1' || url.searchParams.get('dryRun') === 'true'
  const seasonParam = url.searchParams.get('season')
  const sport = url.searchParams.get('sport') ?? undefined
  const season =
    seasonParam != null ? parseInt(seasonParam, 10) : undefined

  try {
    const result = await runWarehouseBackfill({
      sport,
      season: Number.isNaN(season as number) ? undefined : season,
      pipelines: ['standings', 'matchups', 'rosterSnapshots', 'transactions'],
      dryRun,
    })
    const status = result.ok ? 200 : 500
    return NextResponse.json(result, { status })
  } catch (err) {
    console.error('[cron/warehouse-backfill]', err)
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Backfill failed' },
      { status: 500 }
    )
  }
}
