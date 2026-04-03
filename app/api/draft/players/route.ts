import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sport = req.nextUrl.searchParams.get('sport')?.trim() || 'NFL'
  const take = Math.min(600, Number(req.nextUrl.searchParams.get('limit')) || 400)

  const rows = await prisma.sportsPlayer.findMany({
    where: { sport },
    select: {
      externalId: true,
      name: true,
      position: true,
      team: true,
      imageUrl: true,
    },
    take,
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({
    players: rows.map((r, i) => ({
      id: r.externalId,
      name: r.name,
      position: r.position ?? '',
      team: r.team ?? '',
      imageUrl: r.imageUrl,
      adp: i + 1,
      proj: 0,
      bye: null,
      keyStat: '',
    })),
  })
}
