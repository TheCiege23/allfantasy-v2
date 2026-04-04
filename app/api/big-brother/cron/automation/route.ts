import { NextRequest, NextResponse } from 'next/server'
import { requireCronAuth } from '@/app/api/cron/_auth'
import { runBigBrotherAutomationTick } from '@/lib/big-brother/automation/tick'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function parseTickInput(req: NextRequest) {
  const dryRun =
    req.nextUrl.searchParams.get('dryRun') === '1' || req.nextUrl.searchParams.get('dryRun') === 'true'
  const forceLeagueId = req.nextUrl.searchParams.get('leagueId')?.trim() || undefined
  return { dryRun, forceLeagueId }
}

async function run(req: NextRequest) {
  const { dryRun, forceLeagueId } = parseTickInput(req)
  const result = await runBigBrotherAutomationTick({ dryRun, forceLeagueId })
  return NextResponse.json(result)
}

/** Vercel Cron uses GET; POST supported for manual jobs with the same auth. */
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
