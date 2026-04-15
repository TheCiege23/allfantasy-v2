/**
 * [UPDATED] app/api/tournament/[tournamentId]/announcements/route.ts
 * GET: List tournament announcements.
 * POST: Create a new announcement (commissioner only).
 * Supports Legacy tournaments.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logTournamentAudit } from '@/lib/tournament-mode/TournamentAuditService'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  const { tournamentId } = await params
  if (!tournamentId) return NextResponse.json({ error: 'tournamentId required' }, { status: 400 })

  const announcements = await prisma.legacyTournamentAnnouncement.findMany({
    where: { tournamentId },
    orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    take: 100,
  })

  return NextResponse.json({
    announcements: announcements.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      type: a.type,
      pinned: a.pinned,
      createdAt: a.createdAt.toISOString(),
    })),
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id ?? null
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tournamentId } = await params

  const tournament = await prisma.legacyTournament.findUnique({
    where: { id: tournamentId },
    select: { creatorId: true },
  })
  if (!tournament) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (tournament.creatorId !== userId) {
    return NextResponse.json({ error: 'Commissioner access required' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const title = (body.title as string) ?? null
  const announcementBody = body.body as string
  const type = (body.type as string) ?? 'general'
  const pinned = body.pinned === true

  if (!announcementBody || typeof announcementBody !== 'string' || announcementBody.trim().length === 0) {
    return NextResponse.json({ error: 'Announcement body is required' }, { status: 400 })
  }

  const announcement = await prisma.legacyTournamentAnnouncement.create({
    data: {
      tournamentId,
      title: title?.trim() || null,
      body: announcementBody.trim(),
      type,
      pinned,
    },
  })

  await logTournamentAudit(tournamentId, 'post_announcement', {
    actorId: userId,
    metadata: { announcementId: announcement.id, type },
  })

  return NextResponse.json({
    id: announcement.id,
    title: announcement.title,
    body: announcement.body,
    type: announcement.type,
    pinned: announcement.pinned,
    createdAt: announcement.createdAt.toISOString(),
  })
}
