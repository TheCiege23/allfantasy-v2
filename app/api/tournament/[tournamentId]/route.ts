import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
    include: {
      conferences: {
        orderBy: { orderIndex: 'asc' },
        include: {
          leagues: {
            include: {
              league: {
                select: { id: true, name: true, leagueSize: true, leagueVariant: true },
              },
            },
            orderBy: { orderInConference: 'asc' },
          },
        },
      },
      rounds: { orderBy: { roundIndex: 'asc' } },
    },
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

  const leagueCount = tournament.conferences.reduce((acc, c) => acc + c.leagues.length, 0)
  return NextResponse.json({
    id: tournament.id,
    name: tournament.name,
    sport: tournament.sport,
    season: tournament.season,
    variant: tournament.variant,
    status: tournament.status,
    creatorId: tournament.creatorId,
    isCommissioner: isCreator,
    settings: tournament.settings,
    hubSettings: tournament.hubSettings,
    conferences: tournament.conferences.map((c) => ({
      id: c.id,
      name: c.name,
      theme: c.theme,
      themePayload: c.themePayload,
      orderIndex: c.orderIndex,
      leagues: c.leagues.map((tl) => ({
        id: tl.id,
        leagueId: tl.leagueId,
        league: tl.league,
        roundIndex: tl.roundIndex,
        phase: tl.phase,
        orderInConference: tl.orderInConference,
      })),
    })),
    rounds: tournament.rounds,
    _leagueCount: leagueCount,
  })
}
