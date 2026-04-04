import { NextRequest, NextResponse } from 'next/server'
import { requireCronAuth } from '@/app/api/cron/_auth'
import { runBbReminderSweep } from '@/lib/big-brother/automation/reminders'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

async function run(req: NextRequest) {
  const dryRun =
    req.nextUrl.searchParams.get('dryRun') === '1' || req.nextUrl.searchParams.get('dryRun') === 'true'
  const result = await runBbReminderSweep({ dryRun })
  return NextResponse.json(result)
}

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
