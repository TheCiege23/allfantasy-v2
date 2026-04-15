import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getLegacyTournamentAccess, canViewCommissionerDashboard } from '@/lib/tournament/legacyTournamentAccess'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** GET: Ordered waitlist (commissioner / dashboard staff). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ tournamentId: string }> }) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id ?? null
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tournamentId } = await params
  const access = await getLegacyTournamentAccess(userId, tournamentId)
  if (!canViewCommissionerDashboard(access)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const rows = await prisma.legacyTournamentWaitlistEntry.findMany({
    where: { tournamentId },
    orderBy: { createdAt: 'asc' },
    include: {
      user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  })

  return NextResponse.json({
    entries: rows.map((r, i) => ({
      order: i + 1,
      id: r.id,
      userId: r.userId,
      createdAt: r.createdAt.toISOString(),
      displayName: r.user.displayName?.trim() || r.user.username || r.userId,
      username: r.user.username,
      avatarUrl: r.user.avatarUrl,
    })),
  })
}

/** POST: Join waitlist (self) when enabled and under cap. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ tournamentId: string }> }) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id ?? null
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tournamentId } = await params
  const t = await prisma.legacyTournament.findUnique({
    where: { id: tournamentId },
    select: { hubSettings: true },
  })
  if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const hub = (t.hubSettings as Record<string, unknown>) ?? {}
  if (hub.waitlistEnabled !== true) {
    return NextResponse.json({ error: 'Waitlist is not enabled for this tournament' }, { status: 400 })
  }

  const max =
    typeof hub.maxWaitlist === 'number' && Number.isFinite(hub.maxWaitlist) && hub.maxWaitlist > 0
      ? Math.floor(hub.maxWaitlist)
      : 500

  const existingParticipant = await prisma.legacyTournamentParticipant.findUnique({
    where: { tournamentId_userId: { tournamentId, userId } },
  })
  if (existingParticipant) {
    return NextResponse.json({ error: 'You are already a tournament participant' }, { status: 400 })
  }

  const dup = await prisma.legacyTournamentWaitlistEntry.findUnique({
    where: { tournamentId_userId: { tournamentId, userId } },
  })
  if (dup) {
    return NextResponse.json({ ok: true, already: true, entryId: dup.id })
  }

  const count = await prisma.legacyTournamentWaitlistEntry.count({ where: { tournamentId } })
  if (count >= max) {
    return NextResponse.json({ error: 'Waitlist is full' }, { status: 400 })
  }

  const created = await prisma.legacyTournamentWaitlistEntry.create({
    data: { tournamentId, userId },
  })

  return NextResponse.json({ ok: true, entryId: created.id, createdAt: created.createdAt.toISOString() })
}

/** DELETE: Remove from waitlist — commissioner (`targetUserId`) or self. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ tournamentId: string }> }) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id ?? null
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tournamentId } = await params
  const targetUserId = req.nextUrl.searchParams.get('userId')?.trim() || userId

  const access = await getLegacyTournamentAccess(userId, tournamentId)
  const isSelf = targetUserId === userId
  if (!isSelf && !canViewCommissionerDashboard(access)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.legacyTournamentWaitlistEntry.deleteMany({
    where: { tournamentId, userId: targetUserId },
  })

  return NextResponse.json({ ok: true })
}
