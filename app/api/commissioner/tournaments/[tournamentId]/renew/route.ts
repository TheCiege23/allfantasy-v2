/**
 * Commissioner-only: advance a legacy tournament to the next season and restore
 * participants to their qualification (feeder) leagues for the next cycle.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getLegacyTournamentAccess, canEditHubSettings } from '@/lib/tournament/legacyTournamentAccess'
import { restoreParticipantsToQualificationLeagues } from '@/lib/tournament/renewLegacyTournamentSeason'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { tournamentId } = await params

  const t = await prisma.legacyTournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, season: true, status: true, name: true, creatorId: true },
  })
  if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const access = await getLegacyTournamentAccess(session.user.id, tournamentId)
  const isHubCommissioner = canEditHubSettings(access)

  const currentSeason = t.season ?? new Date().getFullYear()
  const nextSeason = currentSeason + 1
  const status = (t.status ?? '').toLowerCase()
  const seasonComplete =
    status === 'complete' || status === 'completed' || status === 'offseason' || status === 'finished'

  return NextResponse.json({
    isCommissioner: isHubCommissioner,
    tournamentName: t.name,
    currentSeason,
    nextSeason,
    seasonComplete,
  })
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { tournamentId } = await params

  const access = await getLegacyTournamentAccess(session.user.id, tournamentId)
  if (!canEditHubSettings(access)) {
    return NextResponse.json({ error: 'Commissioner or hub settings access required' }, { status: 403 })
  }

  const t = await prisma.legacyTournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, season: true },
  })
  if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const currentSeason = t.season ?? new Date().getFullYear()
  const nextSeason = currentSeason + 1

  const { updated } = await restoreParticipantsToQualificationLeagues(tournamentId)

  await prisma.legacyTournament.update({
    where: { id: tournamentId },
    data: {
      season: nextSeason,
      status: 'setup',
    },
  })

  return NextResponse.json({
    ok: true,
    nextSeason,
    participantsRestored: updated,
  })
}
