import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createAnnouncementSchema = z.object({
  title: z.string().max(200).optional(),
  body: z.string().min(1),
  type: z.enum(['general', 'round_start', 'round_end', 'redraft', 'league_disband', 'champion_story']).optional(),
  metadata: z.record(z.unknown()).optional(),
  pinned: z.boolean().optional(),
})

/** GET: list announcements. POST: create (commissioner only). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { tournamentId } = await params
  const tournament = await prisma.legacyTournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, creatorId: true, hubSettings: true },
  })
  if (!tournament) {
    return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
  }

  const hubSettings = (tournament.hubSettings as Record<string, unknown>) ?? {}
  const visibility = (hubSettings.visibility as string) ?? 'unlisted'
  const isCreator = tournament.creatorId === userId
  if (visibility === 'private' && !isCreator) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const announcements = await prisma.legacyTournamentAnnouncement.findMany({
    where: { tournamentId },
    orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    take: 100,
  })

  return NextResponse.json({ announcements })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { tournamentId } = await params
  const tournament = await prisma.legacyTournament.findUnique({
    where: { id: tournamentId },
    select: { creatorId: true },
  })
  if (!tournament || tournament.creatorId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const parsed = createAnnouncementSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    )
  }

  const created = await prisma.legacyTournamentAnnouncement.create({
    data: {
      tournamentId,
      authorId: userId,
      title: parsed.data.title ?? null,
      body: parsed.data.body,
      type: parsed.data.type ?? 'general',
      metadata: (parsed.data.metadata as Record<string, unknown>) ?? undefined,
      pinned: parsed.data.pinned ?? false,
    },
  })

  return NextResponse.json({ announcement: created })
}
