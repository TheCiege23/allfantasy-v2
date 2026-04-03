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

  const rosterId = req.nextUrl.searchParams.get('rosterId')?.trim()
  const week = Number(req.nextUrl.searchParams.get('week') ?? '1')
  if (!rosterId) return NextResponse.json({ error: 'rosterId required' }, { status: 400 })

  const roster = await prisma.redraftRoster.findFirst({
    where: { id: rosterId },
    include: { players: true, season: true },
  })
  if (!roster) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const gate = await assertLeagueMember(roster.leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })

  return NextResponse.json({ roster, week })
}

export async function PATCH(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { rosterId?: string; week?: number; moves?: { playerId: string; fromSlot: string; toSlot: string }[] }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const rosterId = body.rosterId?.trim()
  if (!rosterId || !body.moves?.length) {
    return NextResponse.json({ error: 'rosterId and moves required' }, { status: 400 })
  }

  const roster = await prisma.redraftRoster.findFirst({ where: { id: rosterId } })
  if (!roster) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (roster.ownerId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  for (const m of body.moves) {
    await prisma.redraftRosterPlayer.updateMany({
      where: { rosterId, playerId: m.playerId, droppedAt: null },
      data: { slotType: m.toSlot },
    })
  }

  const updated = await prisma.redraftRoster.findFirst({
    where: { id: rosterId },
    include: { players: true },
  })

  return NextResponse.json({ roster: updated })
}
