import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ leagueId: string }> },
) {
  try {
    const session = (await getServerSession(authOptions as never)) as {
      user?: { id?: string }
    } | null
    const userId = session?.user?.id?.trim()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { leagueId } = await params
    const id = leagueId?.trim()
    if (!id) {
      return NextResponse.json({ error: 'leagueId required' }, { status: 400 })
    }

    const url = new URL(req.url)
    const seasonParam = url.searchParams.get('season')
    const season = seasonParam ? Number.parseInt(seasonParam, 10) : NaN
    if (!Number.isFinite(season)) {
      return NextResponse.json({ error: 'season (YYYY) required' }, { status: 400 })
    }

    const [leagueSeason, weeklyMatchups, draft, transactions] = await Promise.all([
      prisma.leagueSeason.findFirst({
        where: { leagueId: id, season },
        select: {
          season: true,
          platformLeagueId: true,
          championName: true,
          championAvatar: true,
          runnerUpName: true,
          regularSeasonWinnerName: true,
          teamRecords: true,
          teamCount: true,
          scoringFormat: true,
          isDynasty: true,
          status: true,
        },
      }),
      prisma.matchupFact.findMany({
        where: { leagueId: id, season },
        orderBy: [{ weekOrPeriod: 'asc' }],
        select: {
          matchupId: true,
          weekOrPeriod: true,
          teamA: true,
          teamB: true,
          scoreA: true,
          scoreB: true,
          winnerTeamId: true,
        },
      }),
      prisma.draftFact.findMany({
        where: { leagueId: id, season },
        orderBy: [{ round: 'asc' }, { pickNumber: 'asc' }],
        select: {
          draftId: true,
          round: true,
          pickNumber: true,
          playerId: true,
          managerId: true,
        },
      }),
      prisma.transactionFact.findMany({
        where: { leagueId: id, season },
        orderBy: [{ createdAt: 'desc' }],
        take: 500,
        select: {
          transactionId: true,
          type: true,
          playerId: true,
          managerId: true,
          rosterId: true,
          payload: true,
          weekOrPeriod: true,
          createdAt: true,
        },
      }),
    ])

    const standings = (leagueSeason?.teamRecords as unknown) ?? []
    const scoringSettings = {
      scoringFormat: leagueSeason?.scoringFormat ?? null,
      isDynasty: leagueSeason?.isDynasty ?? false,
      teamCount: leagueSeason?.teamCount ?? null,
    }

    return NextResponse.json({
      season,
      standings,
      weeklyMatchups,
      draft,
      transactions,
      scoringSettings,
      meta: leagueSeason
        ? {
            championName: leagueSeason.championName,
            championAvatar: leagueSeason.championAvatar,
            runnerUpName: leagueSeason.runnerUpName,
            regularSeasonWinnerName: leagueSeason.regularSeasonWinnerName,
            status: leagueSeason.status,
          }
        : null,
    })
  } catch (e) {
    console.error('[api/league/[leagueId]/season-history GET]', e)
    return NextResponse.json({ error: 'Failed to load season history' }, { status: 500 })
  }
}
