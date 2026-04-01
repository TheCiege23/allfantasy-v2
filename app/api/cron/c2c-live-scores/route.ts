import { NextRequest, NextResponse } from 'next/server'

import { requireCronAuth } from '@/app/api/cron/_auth'
import { prisma } from '@/lib/prisma'
import { calculateC2CPointsForLeague } from '@/lib/workers/devy-data-worker'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(req: NextRequest) {
  if (!requireCronAuth(req, 'CRON_SECRET')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const week = Number(req.nextUrl.searchParams.get('week') ?? 1)
  const season = Number(req.nextUrl.searchParams.get('season') ?? new Date().getFullYear())

  try {
    const leagues = await prisma.league.findMany({
      where: { c2cConfig: { isNot: null } },
      select: { id: true },
    })
    const results = await Promise.all(
      leagues.map((league) => calculateC2CPointsForLeague({ leagueId: league.id, week, season }))
    )
    return NextResponse.json({
      ok: true,
      leaguesProcessed: leagues.length,
      logsWritten: results.reduce((sum, result) => sum + (result.logsWritten ?? 0), 0),
      results,
    })
  } catch (error) {
    console.error('[cron/c2c-live-scores]', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'C2C live scoring failed' }, { status: 500 })
  }
}
