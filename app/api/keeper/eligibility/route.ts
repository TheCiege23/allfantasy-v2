import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertLeagueMember } from '@/lib/league/league-access'
import { computeKeeperEligibility } from '@/lib/keeper/eligibilityEngine'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const leagueId = req.nextUrl.searchParams.get('leagueId')?.trim()
  const seasonId = req.nextUrl.searchParams.get('seasonId')?.trim()
  const rosterId = req.nextUrl.searchParams.get('rosterId')?.trim()
  if (!leagueId || !seasonId) {
    return NextResponse.json({ error: 'leagueId and seasonId required' }, { status: 400 })
  }

  const gate = await assertLeagueMember(leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })

  let rows = await prisma.keeperEligibility.findMany({
    where: { leagueId, seasonId, ...(rosterId ? { rosterId } : {}) },
  })

  if (rows.length === 0) {
    await computeKeeperEligibility(leagueId, seasonId)
    rows = await prisma.keeperEligibility.findMany({
      where: { leagueId, seasonId, ...(rosterId ? { rosterId } : {}) },
    })
  }

  const eligible = rows
    .filter((r) => r.isEligible)
    .map((r) => ({
      playerId: r.playerId,
      costLabel: r.projectedCost,
      yearsKept: r.yearsKept,
      costRound: r.projectedCostRound,
    }))
  const ineligible = rows
    .filter((r) => !r.isEligible)
    .map((r) => ({ playerId: r.playerId, reason: r.ineligibleReason }))

  return NextResponse.json({ eligible, ineligible, raw: rows })
}
