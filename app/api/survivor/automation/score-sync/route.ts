import { NextRequest, NextResponse } from 'next/server'
import { requireCronAuth } from '@/app/api/cron/_auth'
import { prisma } from '@/lib/prisma'
import { getOrCreateSurvivorGameState, syncWeeklyScores } from '@/lib/survivor/gameStateMachine'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SCORE_PHASES = ['pre_merge', 'post_swap', 'merge', 'post_merge', 'jury', 'finale']

async function runScoreSync(req: NextRequest) {
  if (!requireCronAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { leagueId?: string; all?: boolean } = {}
  if (req.method === 'GET') {
    const q = req.nextUrl.searchParams
    const lid = q.get('leagueId')?.trim()
    if (lid) body = { leagueId: lid }
    else body = { all: true }
  } else {
    try {
      body = (await req.json()) as { leagueId?: string; all?: boolean }
    } catch {
      /* optional */
    }
  }

  const runOne = async (leagueId: string) => {
    const gs = await getOrCreateSurvivorGameState(leagueId)
    const season = await prisma.redraftSeason.findFirst({
      where: { leagueId },
      orderBy: { createdAt: 'desc' },
    })
    const week = Math.max(1, gs.currentWeek || season?.currentWeek || 1)
    await syncWeeklyScores(leagueId, week)
  }

  if (body.leagueId) {
    await runOne(body.leagueId)
    return NextResponse.json({ ok: true, leagueId: body.leagueId })
  }

  if (body.all) {
    const leagues = await prisma.league.findMany({
      where: {
        survivorMode: true,
        survivorPhase: { in: SCORE_PHASES },
      },
      select: { id: true },
    })
    const results = await Promise.allSettled(leagues.map((L) => runOne(L.id)))
    const failed = results.filter((r) => r.status === 'rejected').length
    return NextResponse.json({ ok: true, synced: leagues.length - failed, failed })
  }

  return NextResponse.json({ error: 'Provide leagueId or all: true' }, { status: 400 })
}

export async function GET(req: NextRequest) {
  return runScoreSync(req)
}

export async function POST(req: NextRequest) {
  return runScoreSync(req)
}
