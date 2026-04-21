import { NextRequest, NextResponse } from 'next/server'
import { requireCronAuth } from '../_auth'
import { prisma } from '@/lib/prisma'
import { processReturnFromExile } from '@/lib/survivor/exileEngine'
import { resolveSurvivorCurrentWeek } from '@/lib/survivor/SurvivorTimelineResolver'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * Survivor exile-return automation: promotes the top-token exile player back to
 * the main island when a league's configured return week arrives. No-op for
 * leagues whose trigger is 'manual' or whose return week hasn't been reached.
 */
export async function GET(req: NextRequest) {
  if (!requireCronAuth(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  return run()
}

export async function POST(req: NextRequest) {
  if (!requireCronAuth(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  return run()
}

async function run() {
  const startedAt = new Date()
  const results: Array<{ leagueId: string; returnedUserId: string | null; reason?: string }> = []

  const leagues = await prisma.league.findMany({
    where: {
      survivorMode: true,
      survivorExileReturnTrigger: 'token_leader',
      survivorExileReturnWeek: { not: null },
    },
    select: { id: true, survivorExileReturnWeek: true },
  })

  for (const league of leagues) {
    try {
      const currentWeek = await resolveSurvivorCurrentWeek(league.id)
      if (typeof currentWeek !== 'number' || currentWeek < (league.survivorExileReturnWeek ?? Number.POSITIVE_INFINITY)) {
        results.push({ leagueId: league.id, returnedUserId: null, reason: 'not_yet' })
        continue
      }
      const returnedUserId = await processReturnFromExile(league.id, { week: currentWeek })
      results.push({ leagueId: league.id, returnedUserId })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown'
      results.push({ leagueId: league.id, returnedUserId: null, reason: `error:${msg}` })
    }
  }

  return NextResponse.json({
    ok: true,
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    totalLeagues: leagues.length,
    returned: results.filter((r) => r.returnedUserId).length,
    results,
  })
}
