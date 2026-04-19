import { NextRequest, NextResponse } from 'next/server'

import { requireCronAuth } from '@/app/api/cron/_auth'
import { recomputeAfLearningSnapshots } from '@/lib/ai-learning-system/recomputeSnapshots'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * Scheduled recompute for 3-level AI learning snapshots (app / league / user).
 * Auth: same as other crons (`CRON_SECRET` / `LEAGUE_CRON_SECRET` / admin).
 */
export async function POST(req: NextRequest) {
  if (!requireCronAuth(req, 'CRON_SECRET')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const windowDaysRaw = req.nextUrl.searchParams.get('windowDays')
  const windowDays =
    windowDaysRaw != null && windowDaysRaw !== '' ? parseInt(windowDaysRaw, 10) : undefined

  try {
    const result = await recomputeAfLearningSnapshots(
      Number.isFinite(windowDays as number) ? { windowDays: windowDays as number } : undefined,
    )
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error('[cron/af-learning-recompute]', error)
    return NextResponse.json({ error: 'Af learning recompute failed' }, { status: 500 })
  }
}
