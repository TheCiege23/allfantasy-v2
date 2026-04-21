import { NextRequest, NextResponse } from 'next/server'
import { requireCronAuth } from '@/app/api/cron/_auth'
import { runWeeklyRosterLegalityReminders } from '@/lib/roster-legality/runWeeklyRosterLegalityReminders'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(req: NextRequest) {
  if (!requireCronAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const stats = await runWeeklyRosterLegalityReminders({ maxRosters: 400 })
  return NextResponse.json({ ok: true, stats })
}
