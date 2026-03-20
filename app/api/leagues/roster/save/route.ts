import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { handleInvalidationTrigger } from '@/lib/trade-engine/caching'
import { isRosterChopped } from '@/lib/guillotine/guillotineGuard'
import { getSpecialtySpecByVariant } from '@/lib/specialty-league/registry'
import { recordTrendSignalsAndUpdate } from '@/lib/player-trend'
import { resolveSportForTrend } from '@/lib/player-trend/SportTrendContextResolver'
import { prisma } from '@/lib/prisma'

// Placeholder save endpoint for homepage/app roster auto-save.
// In a future pass this should validate league membership and persist to a real model.
// Guillotine: chopped (eliminated) rosters cannot change lineup/roster.
// Salary cap: when persisting roster changes for a salary_cap league, call
// SalaryCapTradeValidator.validateTradeCap for trades and enforce cap legality
// (getOrCreateLedger / checkCapLegality) before saving adds/drops.
export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { leagueId, rosterId, roster } = body || {}

  if (typeof leagueId === 'string' && leagueId && typeof rosterId === 'string' && rosterId) {
    const chopped = await isRosterChopped(leagueId, rosterId)
    if (chopped) {
      return NextResponse.json(
        { error: 'This team has been eliminated and cannot make roster changes.' },
        { status: 403 }
      )
    }

    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: { leagueVariant: true, sport: true },
    })
    const specialtySpec = getSpecialtySpecByVariant(league?.leagueVariant ?? null)
    if (specialtySpec?.rosterGuard) {
      const canAct = await specialtySpec.rosterGuard(leagueId, rosterId).catch(() => true)
      if (!canAct) {
        return NextResponse.json(
          { error: 'This roster is not allowed to make lineup or roster changes right now.' },
          { status: 403 }
        )
      }
    }

    // Best-effort lineup_start signals for trend engine if starter IDs are provided.
    const startersRaw =
      (Array.isArray(body?.starters) ? body.starters : null) ??
      (Array.isArray(body?.lineup) ? body.lineup : null) ??
      (Array.isArray(body?.startingPlayerIds) ? body.startingPlayerIds : null) ??
      (Array.isArray(body?.roster?.starters) ? body.roster.starters : null)
    const starterIds = Array.isArray(startersRaw)
      ? [...new Set(startersRaw.map((v: unknown) => String(v || '').trim()).filter(Boolean))]
      : []
    if (starterIds.length > 0) {
      const sport = resolveSportForTrend(league?.sport)
      const players = await prisma.player.findMany({
        where: { id: { in: starterIds }, sport },
        select: { id: true },
      })
      if (players.length > 0) {
        void recordTrendSignalsAndUpdate(
          players.map((p) => ({
            playerId: p.id,
            sport,
            signalType: 'lineup_start',
            leagueId,
            value: 1,
          }))
        ).catch(() => {})
      }
    }
  }

  if (typeof leagueId === 'string' && leagueId) {
    handleInvalidationTrigger('roster_change', leagueId)
  }

  return NextResponse.json({ ok: true })
}

