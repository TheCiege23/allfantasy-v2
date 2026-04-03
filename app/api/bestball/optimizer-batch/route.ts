import { NextRequest, NextResponse } from 'next/server'
import { requireCronAuth } from '@/app/api/cron/_auth'
import {
  runBestBallOptimizerBatch,
  runBestBallOptimizerCronSweep,
} from '@/lib/bestball/optimizer'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  if (!requireCronAuth(req, 'CRON_SECRET')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const week = Number(req.nextUrl.searchParams.get('week'))
  const w = Number.isFinite(week) ? week : 1
  const out = await runBestBallOptimizerCronSweep(w)
  return NextResponse.json(out)
}

export async function POST(req: NextRequest) {
  if (!requireCronAuth(req, 'CRON_SECRET')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { seasonId?: string; contestId?: string; week?: number }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (body.week == null || !Number.isFinite(body.week)) {
    return NextResponse.json({ error: 'week required' }, { status: 400 })
  }
  const out = await runBestBallOptimizerBatch({
    seasonId: body.seasonId,
    contestId: body.contestId,
    week: body.week,
  })
  return NextResponse.json(out)
}
