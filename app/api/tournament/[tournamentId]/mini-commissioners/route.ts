import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * List or assign mini-commissioners (one user per league in this tournament hub).
 * Only the tournament creator (main commissioner) may assign or remove.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ tournamentId: string }> }) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tournamentId } = await params
  const t = await prisma.legacyTournament.findUnique({
    where: { id: tournamentId },
    select: { creatorId: true },
  })
  if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (t.creatorId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const rows = await prisma.legacyTournamentMiniCommissioner.findMany({
    where: { tournamentId },
    include: {
      league: { select: { id: true, name: true } },
      user: { select: { id: true, username: true, displayName: true } },
    },
  })
  return NextResponse.json({ assignments: rows })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ tournamentId: string }> }) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tournamentId } = await params
  const t = await prisma.legacyTournament.findUnique({
    where: { id: tournamentId },
    select: { creatorId: true },
  })
  if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (t.creatorId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { leagueId?: string; assigneeUserId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const leagueId = body.leagueId?.trim()
  const assigneeUserId = body.assigneeUserId?.trim()
  if (!leagueId || !assigneeUserId) {
    return NextResponse.json({ error: 'leagueId and assigneeUserId required' }, { status: 400 })
  }

  const link = await prisma.legacyTournamentLeague.findFirst({
    where: { tournamentId, leagueId },
    select: { id: true },
  })
  if (!link) {
    return NextResponse.json({ error: 'League is not part of this tournament' }, { status: 400 })
  }

  const assignee = await prisma.appUser.findUnique({ where: { id: assigneeUserId }, select: { id: true } })
  if (!assignee) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const row = await prisma.legacyTournamentMiniCommissioner.upsert({
    where: { tournamentId_leagueId: { tournamentId, leagueId } },
    create: { tournamentId, leagueId, userId: assigneeUserId },
    update: { userId: assigneeUserId },
    include: {
      league: { select: { id: true, name: true } },
      user: { select: { id: true, username: true, displayName: true } },
    },
  })

  return NextResponse.json({ assignment: row })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ tournamentId: string }> }) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tournamentId } = await params
  const t = await prisma.legacyTournament.findUnique({
    where: { id: tournamentId },
    select: { creatorId: true },
  })
  if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (t.creatorId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const leagueId = req.nextUrl.searchParams.get('leagueId')?.trim()
  if (!leagueId) return NextResponse.json({ error: 'leagueId query required' }, { status: 400 })

  await prisma.legacyTournamentMiniCommissioner.deleteMany({
    where: { tournamentId, leagueId },
  })
  return NextResponse.json({ ok: true })
}
