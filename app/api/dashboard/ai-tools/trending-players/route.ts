import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSupportedSport, SUPPORTED_SPORTS } from '@/lib/sport-scope'

export const dynamic = 'force-dynamic'

function sportToDb(s: string): string {
  return s.trim().toLowerCase()
}

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const raw = req.nextUrl.searchParams.get('sport') ?? 'ALL'
  const sportParam = raw === 'ALL' || raw === '' ? null : raw.toUpperCase()

  if (sportParam && !isSupportedSport(sportParam)) {
    return NextResponse.json({ error: 'Invalid sport' }, { status: 400 })
  }

  try {
    const sportList = SUPPORTED_SPORTS.map((x) => sportToDb(x))
    const where =
      sportParam != null ? { sport: sportToDb(sportParam) } : { sport: { in: sportList } }

    const rows = await prisma.trendingPlayer.findMany({
      where,
      orderBy: [{ crowdScore: 'desc' }, { netTrend: 'desc' }],
      take: sportParam ? 20 : 40,
    })

    const merged = sportParam
      ? rows.slice(0, 20)
      : [...rows]
          .sort((a, b) => b.crowdScore - a.crowdScore || b.netTrend - a.netTrend)
          .slice(0, 20)

    return NextResponse.json({
      players: merged.map((r) => ({
        id: r.id,
        sport: r.sport,
        playerName: r.playerName,
        position: r.position,
        team: r.team,
        addCount: r.addCount,
        dropCount: r.dropCount,
        netTrend: r.netTrend,
        crowdSignal: r.crowdSignal,
        crowdScore: r.crowdScore,
      })),
    })
  } catch (e) {
    console.error('[dashboard/ai-tools/trending-players]', e)
    return NextResponse.json({ error: 'Failed to load trending players' }, { status: 500 })
  }
}
