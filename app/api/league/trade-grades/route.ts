import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTradeGrades } from '@/lib/trade-intel/sleeperTradeGradeService'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // first build walks every season's transactions

/**
 * Graded trade ledger for the Legacy tab: every completed trade since the
 * league was created, graded on realized outcomes and re-graded each season.
 * Access rules mirror /api/league/history; Sleeper-only for now.
 */
export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const leagueId = req.nextUrl.searchParams?.get('leagueId')?.trim()
  if (!leagueId) {
    return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })
  }

  const league = await prisma.league.findFirst({
    where: {
      id: leagueId,
      OR: [{ userId: userId }, { teams: { some: { claimedByUserId: userId } } }],
    },
    select: { id: true, platform: true, platformLeagueId: true },
  })
  if (!league) {
    return NextResponse.json({ error: 'League not found' }, { status: 404 })
  }
  if (league.platform !== 'sleeper' || !league.platformLeagueId) {
    return NextResponse.json({ supported: false as const, platform: league.platform })
  }

  const profile = await prisma.userProfile
    .findUnique({ where: { userId }, select: { sleeperUserId: true } })
    .catch(() => null)

  const grades = await getTradeGrades(league.platformLeagueId)
  if (!grades) {
    return NextResponse.json(
      { supported: true as const, grades: null, error: 'Trade grading temporarily unavailable' },
      { status: 502 },
    )
  }

  return NextResponse.json({
    supported: true as const,
    viewerSleeperUserId: profile?.sleeperUserId ?? null,
    grades,
  })
}
