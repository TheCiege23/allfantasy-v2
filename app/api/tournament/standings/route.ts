import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { computeWeeklyPointsByTlpId } from '@/lib/tournament/computeTournamentWeeklyPoints'
import { canViewStandings } from '@/lib/tournament/shellAccess'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id ?? null

  const tournamentId = req.nextUrl.searchParams.get('tournamentId')?.trim()
  if (!tournamentId) return NextResponse.json({ error: 'tournamentId required' }, { status: 400 })

  const roundNumber = req.nextUrl.searchParams.get('roundNumber')
  const conferenceId = req.nextUrl.searchParams.get('conferenceId')?.trim()
  const participantId = req.nextUrl.searchParams.get('participantId')?.trim()

  const shell = await prisma.tournamentShell.findUnique({ where: { id: tournamentId } })
  if (!shell) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const allowed = await canViewStandings(tournamentId, userId, shell.standingsVisibility)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (participantId) {
    const p = await prisma.tournamentParticipant.findFirst({
      where: { id: participantId, tournamentId },
    })
    if (!p) return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
    if (userId !== p.userId && userId !== shell.commissionerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const parts = await prisma.tournamentLeagueParticipant.findMany({
      where: { participantId: p.id },
      include: { league: true },
    })
    return NextResponse.json({ participant: p, leagueParticipations: parts })
  }

  if (conferenceId) {
    const conf = await prisma.tournamentConference.findFirst({
      where: { id: conferenceId, tournamentId },
    })
    if (!conf) return NextResponse.json({ error: 'Conference not found' }, { status: 404 })
    return NextResponse.json({ conference: conf, standingsCache: conf.standingsCache })
  }

  const rn = roundNumber ? parseInt(roundNumber, 10) : null
  const round =
    rn != null && Number.isFinite(rn)
      ? await prisma.tournamentRound.findFirst({ where: { tournamentId, roundNumber: rn } })
      : await prisma.tournamentRound.findFirst({
          where: { tournamentId, roundNumber: shell.currentRoundNumber || 1 },
        })

  if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 })

  const leagues = await prisma.tournamentLeague.findMany({
    where: { tournamentId, roundId: round.id },
    include: {
      participants: { include: { participant: { select: { displayName: true, userId: true } } } },
    },
  })

  const weekRaw = req.nextUrl.searchParams.get('week')?.trim()
  if (weekRaw != null && weekRaw !== '') {
    const w = parseInt(weekRaw, 10)
    if (!Number.isFinite(w)) {
      return NextResponse.json({ error: 'Invalid week' }, { status: 400 })
    }
    if (w < round.weekStart || w > round.weekEnd) {
      return NextResponse.json(
        { error: `week must be between ${round.weekStart} and ${round.weekEnd} for this round` },
        { status: 400 },
      )
    }
    const weekPts = await computeWeeklyPointsByTlpId(
      leagues.map((l) => ({
        leagueId: l.leagueId,
        participants: l.participants.map((p) => ({ id: p.id, redraftRosterId: p.redraftRosterId })),
      })),
      w,
    )
    const leaguesWithWeek = leagues.map((l) => ({
      ...l,
      participants: l.participants.map((p) => ({
        ...p,
        weekPoints: weekPts.get(p.id) ?? 0,
      })),
    }))
    return NextResponse.json({ round, leagues: leaguesWithWeek, weeklyWeek: w })
  }

  return NextResponse.json({ round, leagues })
}
