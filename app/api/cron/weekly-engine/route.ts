import { NextRequest, NextResponse } from 'next/server'
import { requireCronAuth } from '@/app/api/cron/_auth'
import { runWeeklyLeagueAutomation } from '@/lib/workers/scoring-worker'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 180

function readNumber(value: string | null): number | null {
  if (!value) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export async function GET(req: NextRequest) {
  if (!requireCronAuth(req, 'CRON_SECRET')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const season = readNumber(req.nextUrl.searchParams.get('season'))
    const weekOrRound = readNumber(req.nextUrl.searchParams.get('week'))
    const result = await runWeeklyLeagueAutomation({ season, weekOrRound })
    return NextResponse.json({ ok: true, result })
  } catch (error) {
    console.error('[cron/weekly-engine]', error)
    return NextResponse.json({ error: 'Weekly engine failed' }, { status: 500 })
  }
}
