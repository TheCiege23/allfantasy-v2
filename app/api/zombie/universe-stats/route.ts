import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireCommissionerOnly } from '@/lib/league/permissions'
import { executePromotionRelegation } from '@/lib/zombie/universeStatEngine'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const universeId = searchParams.get('universeId')
  const filterUserId = searchParams.get('userId')
  if (!universeId) return NextResponse.json({ error: 'universeId required' }, { status: 400 })

  if (filterUserId) {
    const rows = await prisma.zombieUniverseStat.findMany({
      where: { universeId, userId: filterUserId },
      orderBy: { season: 'desc' },
    })
    return NextResponse.json({ history: rows })
  }

  const stats = await prisma.zombieUniverseStat.findMany({
    where: { universeId },
    orderBy: [{ universeRank: 'asc' }],
  })

  return NextResponse.json({ stats })
}

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const universeId = typeof body.universeId === 'string' ? body.universeId : null
  const action = typeof body.action === 'string' ? body.action : ''
  const season = typeof body.season === 'number' ? body.season : new Date().getFullYear()

  if (action !== 'execute_movement' || !universeId)
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const u = await prisma.zombieUniverse.findUnique({
    where: { id: universeId },
    include: { leagues: { take: 1 } },
  })
  if (!u?.leagues[0]) return NextResponse.json({ error: 'Universe has no leagues' }, { status: 400 })

  await requireCommissionerOnly(u.leagues[0].leagueId, userId)

  await executePromotionRelegation(universeId, season)
  return NextResponse.json({ ok: true })
}
