/**
 * Cron: enqueue Devy Dynasty jobs (NCAA sync, graduation, pools, snapshots, rankings).
 * Call on schedule (e.g. daily). Requires x-cron-secret or x-admin-secret header.
 * Body: { job: DevyJobType, leagueId?, sport?, seasonYear?, rosterId?, periodKey? } or { all: true } to enqueue multiple.
 */

import { NextRequest, NextResponse } from 'next/server'
import { enqueueDevy } from '@/lib/jobs/enqueue'
import type { DevyJobType } from '@/lib/jobs/types'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

function requireCron(req: NextRequest): boolean {
  const provided =
    req.headers.get('x-cron-secret') ??
    req.headers.get('x-admin-secret') ??
    ''
  const cronSecret = process.env.LEAGUE_CRON_SECRET
  const adminSecret = process.env.BRACKET_ADMIN_SECRET || process.env.ADMIN_PASSWORD
  return !!(
    provided &&
    ((cronSecret && provided === cronSecret) ||
      (adminSecret && provided === adminSecret))
  )
}

const DEVY_JOB_TYPES: DevyJobType[] = [
  'ncaa_player_sync',
  'declare_status_refresh',
  'auto_graduation_after_draft',
  'rookie_pool_generation',
  'devy_pool_generation',
  'promotion_window_sync',
  'rookie_draft_exclusion_list',
  'best_ball_lineup_snapshot',
  'rankings_refresh_after_promotions',
  'class_strength_snapshot',
  'hybrid_standings_recompute',
  'c2c_pipeline_recalculation',
]

export async function POST(req: NextRequest) {
  if (!requireCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const results: { job: string; ok: boolean; jobId?: string; error?: string }[] = []

  if (body.all === true) {
    const seasonYear = body.seasonYear ?? new Date().getFullYear()
    const sport = body.sport ?? 'NFL'

    await enqueueDevy({ type: 'ncaa_player_sync', sport })
    await enqueueDevy({ type: 'declare_status_refresh' })
    await enqueueDevy({ type: 'class_strength_snapshot', sport, seasonYear })

    const devyLeagueIds = await prisma.league.findMany({
      where: { devyConfig: { isNot: null } },
      select: { id: true },
    }).then((rows) => rows.map((r) => r.id))

    for (const leagueId of devyLeagueIds) {
      const r1 = await enqueueDevy({ type: 'auto_graduation_after_draft', leagueId, seasonYear })
      results.push({ job: 'auto_graduation_after_draft', ok: r1.ok, jobId: r1.ok ? r1.jobId : undefined, error: r1.ok ? undefined : r1.error })
      const r2 = await enqueueDevy({ type: 'rookie_pool_generation', leagueId })
      results.push({ job: 'rookie_pool_generation', ok: r2.ok, jobId: r2.ok ? r2.jobId : undefined, error: r2.ok ? undefined : r2.error })
      const r3 = await enqueueDevy({ type: 'devy_pool_generation', leagueId })
      results.push({ job: 'devy_pool_generation', ok: r3.ok, jobId: r3.ok ? r3.jobId : undefined, error: r3.ok ? undefined : r3.error })
      const r4 = await enqueueDevy({ type: 'promotion_window_sync', leagueId })
      results.push({ job: 'promotion_window_sync', ok: r4.ok, jobId: r4.ok ? r4.jobId : undefined, error: r4.ok ? undefined : r4.error })
      const r5 = await enqueueDevy({ type: 'rookie_draft_exclusion_list', leagueId })
      results.push({ job: 'rookie_draft_exclusion_list', ok: r5.ok, jobId: r5.ok ? r5.jobId : undefined, error: r5.ok ? undefined : r5.error })
      const r6 = await enqueueDevy({ type: 'rankings_refresh_after_promotions', leagueId })
      results.push({ job: 'rankings_refresh_after_promotions', ok: r6.ok, jobId: r6.ok ? r6.jobId : undefined, error: r6.ok ? undefined : r6.error })
    }

    const c2cLeagueIds = await prisma.league.findMany({
      where: { c2cConfig: { isNot: null } },
      select: { id: true },
    }).then((rows) => rows.map((r) => r.id))

    for (const leagueId of c2cLeagueIds) {
      const r7 = await enqueueDevy({ type: 'hybrid_standings_recompute', leagueId })
      results.push({ job: 'hybrid_standings_recompute', ok: r7.ok, jobId: r7.ok ? r7.jobId : undefined, error: r7.ok ? undefined : r7.error })
      const r8 = await enqueueDevy({ type: 'c2c_pipeline_recalculation', leagueId })
      results.push({ job: 'c2c_pipeline_recalculation', ok: r8.ok, jobId: r8.ok ? r8.jobId : undefined, error: r8.ok ? undefined : r8.error })
    }

    return NextResponse.json({ ok: true, enqueued: results.length, results })
  }

  const job = body.job as DevyJobType | undefined
  if (!job || !DEVY_JOB_TYPES.includes(job)) {
    return NextResponse.json(
      { error: 'Missing or invalid job. Use { job: "<type>" } or { all: true }.', allowed: DEVY_JOB_TYPES },
      { status: 400 }
    )
  }

  const payload = {
    type: job,
    leagueId: body.leagueId,
    sport: body.sport,
    seasonYear: body.seasonYear,
    rosterId: body.rosterId,
    periodKey: body.periodKey,
  }
  const result = await enqueueDevy(payload)
  if (result.ok) {
    return NextResponse.json({ ok: true, job, jobId: result.jobId })
  }
  return NextResponse.json({ ok: false, job, error: result.error }, { status: 500 })
}
