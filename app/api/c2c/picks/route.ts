import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertLeagueMember } from '@/lib/league/league-access'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const leagueId = req.nextUrl.searchParams.get('leagueId')?.trim()
  const rosterId = req.nextUrl.searchParams.get('rosterId')?.trim()
  if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })

  const gate = await assertLeagueMember(leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })

  const where: { leagueId: string; currentOwnerId?: string } = { leagueId }
  if (rosterId) where.currentOwnerId = rosterId

  const picks = await prisma.c2CDraftPick.findMany({
    where,
    orderBy: [{ season: 'desc' }, { round: 'asc' }],
    take: 200,
  })
  return NextResponse.json({ picks })
}

export async function PATCH(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const leagueId = typeof body?.leagueId === 'string' ? body.leagueId : ''
  const pickId = typeof body?.pickId === 'string' ? body.pickId : ''
  const toRosterId = typeof body?.toRosterId === 'string' ? body.toRosterId : ''
  if (!leagueId || !pickId || !toRosterId) {
    return NextResponse.json({ error: 'leagueId, pickId, toRosterId required' }, { status: 400 })
  }

  const gate = await assertLeagueMember(leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })

  const pick = await prisma.c2CDraftPick.update({
    where: { id: pickId },
    data: { currentOwnerId: toRosterId },
  })
  return NextResponse.json({ pick })
}
