import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUniversalStandings } from '@/lib/tournament-mode/TournamentStandingsService'
import { getAdvancementSlotsPerConference } from '@/lib/tournament-mode/advancement-rules'

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
  const tournament = await prisma.tournament.findUnique({
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

  try {
    const [rows, tournamentWithSettings] = await Promise.all([
      getUniversalStandings(tournamentId),
      prisma.tournament.findUnique({
        where: { id: tournamentId },
        select: { settings: true },
      }),
    ])
    const settings = (tournamentWithSettings?.settings as Record<string, unknown>) ?? {}
    const poolSize = Number(settings.participantPoolSize) || 120
    const cutLine = getAdvancementSlotsPerConference(poolSize)
    return NextResponse.json({ standings: rows, cutLine })
  } catch (err) {
    console.error('[tournament/standings] Error:', err)
    return NextResponse.json(
      { error: 'Failed to load standings' },
      { status: 500 }
    )
  }
}
