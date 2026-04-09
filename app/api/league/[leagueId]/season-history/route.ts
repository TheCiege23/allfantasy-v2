import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertLeagueMember } from '@/lib/league/league-access'

export const dynamic = 'force-dynamic'

/**
 * GET /api/league/[leagueId]/season-history?season=2023
 * Returns full season detail: standings, matchups, scoring settings.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ leagueId: string }> }) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await params
  const gate = await assertLeagueMember(leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })
  const { searchParams } = new URL(req.url)
  const season = Number(searchParams.get('season') ?? 0)

  if (!season) {
    // Return all seasons summary
    const seasons = await (prisma as any).leagueSeason.findMany({
      where: { leagueId },
      orderBy: { season: 'desc' },
      select: {
        season: true, platformLeagueId: true, championTeamId: true,
        runnerUpName: true, regularSeasonWinnerName: true,
        teamRecords: true, teamCount: true, scoringFormat: true,
        isDynasty: true, status: true,
      },
    })
    return NextResponse.json({ seasons })
  }

  // Full season detail
  const leagueSeason = await (prisma as any).leagueSeason.findFirst({
    where: { leagueId, season },
  })

  const matchups = await (prisma as any).matchupFact?.findMany?.({
    where: { leagueId, season },
    orderBy: { weekOrPeriod: 'asc' },
  }).catch(() => []) ?? []

  const standings = await (prisma as any).seasonStandingFact?.findMany?.({
    where: { leagueId, season },
    orderBy: { rank: 'asc' },
  }).catch(() => []) ?? []

  const draftPicks = await (prisma as any).draftFact?.findMany?.({
    where: { leagueId, season },
    orderBy: { pickNumber: 'asc' },
  }).catch(() => []) ?? []

  const transactions = await (prisma as any).transactionFact?.findMany?.({
    where: { leagueId, season },
    orderBy: { createdAt: 'desc' },
    take: 100,
  }).catch(() => []) ?? []

  return NextResponse.json({
    season: leagueSeason,
    matchups,
    standings,
    draftPicks,
    transactions,
  })
}
