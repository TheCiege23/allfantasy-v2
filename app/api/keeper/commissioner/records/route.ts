import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertLeagueMember } from '@/lib/league/league-access'
import { requireCommissionerRole } from '@/lib/league/permissions'

export const dynamic = 'force-dynamic'

/**
 * Commissioner: all keeper declaration records for a league season (approvals UI).
 */
export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const leagueId = req.nextUrl.searchParams?.get('leagueId')?.trim()
  const seasonId = req.nextUrl.searchParams?.get('seasonId')?.trim()
  if (!leagueId || !seasonId) {
    return NextResponse.json({ error: 'leagueId and seasonId required' }, { status: 400 })
  }

  const gate = await assertLeagueMember(leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })

  try {
    await requireCommissionerRole(leagueId, userId)
  } catch (err) {
    if (err instanceof Response) return err
    throw err
  }

  const records = await prisma.keeperRecord.findMany({
    where: { leagueId, seasonId },
    orderBy: [{ rosterId: 'asc' }, { playerName: 'asc' }],
    include: {
      roster: { select: { teamName: true, ownerName: true } },
    },
  })

  return NextResponse.json({
    records: records.map((r) => ({
      id: r.id,
      rosterId: r.rosterId,
      teamName: r.roster.teamName ?? r.roster.ownerName ?? 'Team',
      ownerLabel: r.roster.ownerName,
      playerId: r.playerId,
      playerName: r.playerName,
      position: r.position,
      status: r.status,
      costRound: r.costRound,
      costLabel: r.costLabel,
      costAuctionValue: r.costAuctionValue,
      yearsKept: r.yearsKept,
      submittedAt: r.submittedAt?.toISOString() ?? null,
    })),
  })
}
