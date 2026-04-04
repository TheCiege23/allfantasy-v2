import { NextRequest, NextResponse } from 'next/server'
import { requireCronAuth } from '@/app/api/cron/_auth'
import { handleBbStatCorrectionSignal } from '@/lib/big-brother/automation/statCorrection'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

async function run(req: NextRequest) {
  const leagueId = req.nextUrl.searchParams.get('leagueId')?.trim() || undefined
  const redraftSeasonId = req.nextUrl.searchParams.get('redraftSeasonId')?.trim() || undefined
  const weekRaw = req.nextUrl.searchParams.get('week')
  const week = weekRaw != null ? parseInt(weekRaw, 10) : undefined
  const dryRun =
    req.nextUrl.searchParams.get('dryRun') === '1' || req.nextUrl.searchParams.get('dryRun') === 'true'

  const result = await handleBbStatCorrectionSignal({
    leagueId,
    redraftSeasonId,
    week: Number.isFinite(week) ? week : undefined,
    dryRun,
  })
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
