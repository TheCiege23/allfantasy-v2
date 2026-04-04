import { NextRequest, NextResponse } from 'next/server'
import { requireCronAuth } from '@/app/api/cron/_auth'
import { runZombieAutomationTick } from '@/lib/zombie/zombieAutomation'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

async function run(req: NextRequest) {
  const force =
    req.nextUrl.searchParams.get('force') === '1' ||
    req.nextUrl.searchParams.get('force') === 'true'
  const result = await runZombieAutomationTick({ force })
  return NextResponse.json({
    processed: result.leaguesProcessed,
    errors: result.errors,
    skippedIdempotent: result.skippedIdempotent,
    skippedIncomplete: result.skippedIncomplete,
    announcementsPosted: result.announcementsPosted,
  })
}

/** Vercel Cron uses GET; internal jobs may POST with optional `?force=1`. */
export async function GET(req: NextRequest) {
  if (!requireCronAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return run(req)
}

export async function POST(req: NextRequest) {
  if (!requireCronAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return run(req)
}
