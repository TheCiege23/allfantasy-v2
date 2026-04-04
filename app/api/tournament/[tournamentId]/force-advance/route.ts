/**
 * POST /api/tournament/[tournamentId]/force-advance — Commissioner force-advance one participant (override).
 * Requires tournament.settings.commissionerOverrideAllowed or hubSettings.allowForceAdvance.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logTournamentAudit } from '@/lib/tournament-mode/TournamentAuditService'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tournamentId } = await params
  const tournament = await prisma.legacyTournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, creatorId: true, settings: true, hubSettings: true, status: true },
  })
  if (!tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
  if (tournament.creatorId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const settings = (tournament.settings as Record<string, unknown>) ?? {}
  const hubSettings = (tournament.hubSettings as Record<string, unknown>) ?? {}
  const allowOverride = Boolean(settings.commissionerOverrideAllowed ?? hubSettings.allowForceAdvance)
  if (!allowOverride) {
    return NextResponse.json(
      { error: 'Force advance is not enabled for this tournament.' },
      { status: 403 }
    )
  }

  let body: { participantUserId?: string; reason?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  const participantUserId = body.participantUserId
  if (!participantUserId) {
    return NextResponse.json({ error: 'participantUserId required' }, { status: 400 })
  }

  const participant = await prisma.legacyTournamentParticipant.findUnique({
    where: { tournamentId_userId: { tournamentId, userId: participantUserId } },
    select: { id: true, status: true, currentLeagueId: true, conferenceId: true },
  })
  if (!participant) return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
  if (participant.status === 'eliminated') {
    return NextResponse.json({ error: 'Participant is already eliminated' }, { status: 400 })
  }

  // Advance: create roster in next-round league or attach to existing elimination league.
  // Simplified: we only support force-advance from qualification (round 0) into round 1.
  const round1Leagues = await prisma.legacyTournamentLeague.findMany({
    where: { tournamentId, roundIndex: 1 },
    include: {
      league: { include: { _count: { select: { rosters: true } } } },
    },
    orderBy: [{ conferenceId: 'asc' }, { orderInConference: 'asc' }],
  })
  if (round1Leagues.length === 0) {
    return NextResponse.json({ error: 'No elimination round leagues yet. Run advancement first.' }, { status: 400 })
  }

  const confLeagues = round1Leagues.filter((tl) => tl.conferenceId === participant.conferenceId)
  let targetLeague = confLeagues.find((tl) => {
    const count = (tl.league as { _count?: { rosters: number } })._count?.rosters ?? 0
    return count < 4
  })
  if (!targetLeague) targetLeague = confLeagues[0]
  if (!targetLeague) return NextResponse.json({ error: 'No target league for conference' }, { status: 500 })

  const existingRoster = await prisma.roster.findFirst({
    where: { leagueId: targetLeague.leagueId, platformUserId: participantUserId },
  })
  if (existingRoster) {
    return NextResponse.json({ error: 'Participant already in an elimination league' }, { status: 400 })
  }

  const roster = await prisma.roster.create({
    data: {
      leagueId: targetLeague.leagueId,
      platformUserId: participantUserId,
      playerData: {},
    },
  })

  const bracketLabel = (targetLeague.league.settings as Record<string, unknown>)?.bracketLabel as string ?? null
  await prisma.legacyTournamentParticipant.update({
    where: { tournamentId_userId: { tournamentId, userId: participantUserId } },
    data: {
      currentLeagueId: targetLeague.leagueId,
      currentRosterId: roster.id,
      advancedAtRoundIndex: 0,
      bubbleAdvanced: true,
      bracketLabel,
      status: 'active',
    },
  })

  await logTournamentAudit(tournamentId, 'force_advance', {
    actorId: userId,
    targetType: 'participant',
    targetId: participantUserId,
    metadata: { reason: body.reason ?? null, targetLeagueId: targetLeague.leagueId },
  })

  return NextResponse.json({
    ok: true,
    userId: participantUserId,
    leagueId: targetLeague.leagueId,
    rosterId: roster.id,
  })
}
