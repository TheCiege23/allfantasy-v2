import { NextRequest, NextResponse } from 'next/server'
import { requireCronAuth } from '@/app/api/cron/_auth'
import { prisma } from '@/lib/prisma'
import { processDevyToRookieTransition } from '@/lib/devy/rosterEngine'
import { enrichDevyIntelMetrics } from '@/lib/devy-classification'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Daily: taxi lock deadlines, placeholder NFL-entry sync (wire to player pool when available).
 */
async function run(_req: NextRequest) {
  const leagues = await prisma.devyLeague.findMany()
  let taxiLocked = 0
  const now = Date.now()

  for (const L of leagues) {
    if (L.taxiLockDeadline && L.taxiLockDeadline.getTime() < now) {
      const r = await prisma.devyTaxiSlot.updateMany({
        where: { leagueId: L.leagueId },
        data: { isLocked: true },
      })
      taxiLocked += r.count
    }
  }

  // When platform marks NCAA players as `graduatedToNFL`, promote devy rows (best-effort).
  let transitions = 0
  const candidates = await prisma.devyDevySlot.findMany({
    where: { hasEnteredNFL: false },
    take: 50,
  })
  for (const slot of candidates) {
    const p = await prisma.player.findFirst({
      where: { id: slot.playerId, graduatedToNFL: true },
    })
    if (!p) continue
    try {
      await processDevyToRookieTransition(slot.leagueId, slot.playerId, new Date().getFullYear(), 'nfl_draft')
      transitions++
    } catch {
      // Missing roster state or capacity edge cases — leave for commissioner tools.
    }
  }

  // Keep devy intel metrics fresh. Bounded so the 60s budget holds: this drains
  // oldest-enriched-first, working through the board across daily runs rather
  // than attempting all ~1,700 players in one request.
  //
  // Only safe to run at all because the intel model now returns null for
  // unevidenced fields; previously this would have written a manufactured
  // recruitingComposite to every player without recruiting data.
  let intelEnriched = 0
  let intelErrors = 0
  try {
    const intel = await enrichDevyIntelMetrics({ limit: 300 })
    intelEnriched = intel.updated
    intelErrors = intel.errors.length
  } catch {
    // Enrichment is maintenance, not the point of this job — never fail the
    // taxi-lock and transition work because a metrics pass had a bad day.
  }

  return NextResponse.json({
    ok: true,
    leaguesChecked: leagues.length,
    taxiLockedRows: taxiLocked,
    transitionsRun: transitions,
    intelEnriched,
    intelErrors,
  })
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
