import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCronAuth } from '../_auth'
import { scheduleWeeklyUpdate } from '@/lib/zombie/weeklyUpdateEngine'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * Walks every active zombie league and pokes scheduleWeeklyUpdate(leagueId).
 * The engine itself gates on each league's configured weeklyUpdateDay /
 * weeklyUpdateHour and on the resolution being complete, so this cron is
 * safe to fire hourly — only leagues whose window is open right now do
 * meaningful work, the rest no-op.
 *
 * Without this cron, weekly updates only fired on manual trigger or
 * onWeekFinalized; leagues with weeklyUpdateAutoPost + a configured day/hour
 * never auto-posted because nothing was checking the clock.
 */
export async function GET(req: NextRequest) {
  if (!requireCronAuth(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  return runScan()
}

export async function POST(req: NextRequest) {
  if (!requireCronAuth(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  return runScan()
}

async function runScan() {
  const startedAt = new Date()
  const leagues = await prisma.zombieLeague.findMany({
    where: { status: { in: ['active', 'live'] } },
    select: { leagueId: true, weeklyUpdateAutoPost: true, weeklyUpdateDay: true, weeklyUpdateHour: true },
  }).catch(() => [])

  const candidates = leagues.filter((l) =>
    l.weeklyUpdateAutoPost && l.weeklyUpdateDay != null && l.weeklyUpdateHour != null,
  )

  const results: Array<{ leagueId: string; ok: boolean; error?: string }> = []
  for (const { leagueId } of candidates) {
    try {
      await scheduleWeeklyUpdate(leagueId)
      results.push({ leagueId, ok: true })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'weekly update failed'
      results.push({ leagueId, ok: false, error: msg.slice(0, 300) })
    }
  }

  return NextResponse.json({
    ok: true,
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    scanned: leagues.length,
    candidates: candidates.length,
    posted: results.filter((r) => r.ok).length,
    results: results.slice(0, 100),
  })
}
