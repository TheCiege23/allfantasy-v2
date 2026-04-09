import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/league/[leagueId]/draft-history?season=2023
 * Returns draft picks for a specific season, formatted for the draft board UI.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ leagueId: string }> }) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await params
  const { searchParams } = new URL(req.url)
  const season = Number(searchParams.get('season') ?? 0)

  if (!season) {
    // Return list of seasons with draft data
    const drafts = await (prisma as any).draftFact?.groupBy?.({
      by: ['season'],
      where: { leagueId },
      _count: { id: true },
      orderBy: { season: 'desc' },
    }).catch(() => []) ?? []

    return NextResponse.json({
      seasons: drafts.map((d: any) => ({
        season: d.season,
        pickCount: d._count?.id ?? 0,
      })),
    })
  }

  // Get all picks for the season
  const picks = await (prisma as any).draftFact?.findMany?.({
    where: { leagueId, season },
    orderBy: { pickNumber: 'asc' },
  }).catch(() => []) ?? []

  // Get managers for that season
  const leagueSeason = await (prisma as any).leagueSeason.findFirst({
    where: { leagueId, season },
    select: { teamRecords: true, teamCount: true },
  })

  const managers = ((leagueSeason?.teamRecords ?? []) as Array<{
    rosterId?: string; ownerId?: string; managerName?: string; managerAvatar?: string
  }>).map((r) => ({
    id: String(r.ownerId ?? r.rosterId),
    name: r.managerName ?? 'Unknown',
    avatar: r.managerAvatar ?? null,
  }))

  // Organize into rounds
  const maxRound = picks.reduce((max: number, p: any) => Math.max(max, p.round ?? 1), 1)
  const rounds: Array<Array<{ pick: number; round: number; managerId: string; playerId: string }>> = []

  for (let r = 1; r <= maxRound; r++) {
    rounds.push(
      picks
        .filter((p: any) => p.round === r)
        .map((p: any) => ({
          pick: p.pickNumber,
          round: p.round,
          managerId: p.managerId,
          playerId: p.playerId,
        }))
    )
  }

  return NextResponse.json({
    season,
    totalPicks: picks.length,
    rounds: maxRound,
    teamCount: leagueSeason?.teamCount ?? managers.length,
    managers,
    picks,
    roundsData: rounds,
  })
}
