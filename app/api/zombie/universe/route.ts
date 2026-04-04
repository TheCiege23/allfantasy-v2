import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createZombieUniverse } from '@/lib/zombie/setupEngine'
import { normalizeToSupportedSport } from '@/lib/sport-scope'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const name = typeof body.name === 'string' ? body.name : undefined
  const sport = normalizeToSupportedSport(typeof body.sport === 'string' ? body.sport : 'NFL')

  const universe = await createZombieUniverse(userId, {
    name,
    sport,
    tiersEnabled: Boolean(body.tiersEnabled ?? true),
    tierCount: typeof body.tierCount === 'number' ? body.tierCount : 3,
    namingMode: typeof body.namingMode === 'string' ? body.namingMode : 'hybrid',
    isPaid: Boolean(body.isPaid),
    defaultBuyIn: typeof body.defaultBuyIn === 'number' ? body.defaultBuyIn : null,
    promotionEnabled: body.promotionEnabled !== false,
    relegationEnabled: body.relegationEnabled !== false,
    promotionCount: typeof body.promotionCount === 'number' ? body.promotionCount : 2,
    relegationCount: typeof body.relegationCount === 'number' ? body.relegationCount : 2,
    promotionMode: typeof body.promotionMode === 'string' ? body.promotionMode : 'auto',
  })

  return NextResponse.json({ universe })
}

export async function GET(req: Request) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const universeId = searchParams.get('universeId')
  if (!universeId) return NextResponse.json({ error: 'universeId required' }, { status: 400 })

  const u = await prisma.zombieUniverse.findUnique({
    where: { id: universeId },
    include: {
      levels: { orderBy: { rankOrder: 'desc' } },
      leagues: { include: { league: { select: { id: true, name: true } } } },
      universeStat: { take: 50, orderBy: { currentSeasonPPW: 'desc' } },
    },
  })
  if (!u) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    universe: u,
    topRanked: u.universeStat.slice(0, 10),
  })
}
