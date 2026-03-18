import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/** GET: list tournaments created by the current user. */
export async function GET() {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tournaments = await prisma.tournament.findMany({
    where: { creatorId: userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      sport: true,
      season: true,
      status: true,
      createdAt: true,
      _count: { select: { leagues: true } },
    },
  })

  return NextResponse.json({
    tournaments: tournaments.map((t) => ({
      id: t.id,
      name: t.name,
      sport: t.sport,
      season: t.season,
      status: t.status,
      createdAt: t.createdAt,
      leagueCount: t._count.leagues,
    })),
  })
}
