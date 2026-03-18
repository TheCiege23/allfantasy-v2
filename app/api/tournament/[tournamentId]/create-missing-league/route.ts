/**
 * POST /api/tournament/[tournamentId]/create-missing-league — Create one missing child league (e.g. for a conference/round).
 * Body: { conferenceId: string, roundIndex?: number, orderInConference?: number, leagueName?: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { runPostCreateInitialization } from '@/lib/league-defaults-orchestrator/LeagueDefaultsOrchestrator'
import { buildLeagueInviteUrl } from '@/lib/viral-loop'
import { TOURNAMENT_LEAGUE_VARIANT } from '@/lib/tournament-mode/constants'
import { normalizeToSupportedSport } from '@/lib/sport-scope'
import crypto from 'crypto'
import { logTournamentAudit } from '@/lib/tournament-mode/TournamentAuditService'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tournamentId } = await params
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, creatorId: true, name: true, sport: true, settings: true },
  })
  if (!tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
  if (tournament.creatorId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { conferenceId?: string; roundIndex?: number; orderInConference?: number; leagueName?: string } = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }
  const conferenceId = body.conferenceId
  if (!conferenceId) return NextResponse.json({ error: 'conferenceId required' }, { status: 400 })

  const conference = await prisma.tournamentConference.findFirst({
    where: { tournamentId, id: conferenceId },
    select: { id: true, name: true },
  })
  if (!conference) return NextResponse.json({ error: 'Conference not found' }, { status: 404 })

  const roundIndex = Math.max(0, Number(body.roundIndex ?? 0))
  const orderInConference = Math.max(0, Number(body.orderInConference ?? 0))
  const leagueName = typeof body.leagueName === 'string' && body.leagueName.trim()
    ? body.leagueName.trim().slice(0, 120)
    : `${tournament.name} – ${conference.name} ${roundIndex === 0 ? `League ${orderInConference + 1}` : 'Extra'}`

  const sport = normalizeToSupportedSport(tournament.sport)
  const settings = (tournament.settings as Record<string, unknown>) ?? {}
  const leagueSize = Number(settings.initialLeagueSize) || 12

  const league = await prisma.league.create({
    data: {
      userId: tournament.creatorId,
      name: leagueName,
      platform: 'manual',
      platformLeagueId: `tournament-${tournamentId}-r${roundIndex}-${conferenceId}-${orderInConference}-${Date.now()}`,
      leagueSize,
      scoring: 'PPR',
      isDynasty: false,
      sport,
      leagueVariant: TOURNAMENT_LEAGUE_VARIANT,
      settings: {
        tournamentId,
        tournamentName: tournament.name,
        conferenceName: conference.name,
        roundIndex,
        phase: roundIndex === 0 ? 'qualification' : 'elimination',
      },
      syncStatus: 'manual',
    },
  })

  try {
    await runPostCreateInitialization(league.id, sport, TOURNAMENT_LEAGUE_VARIANT)
  } catch (err) {
    console.warn('[tournament] create-missing-league bootstrap non-fatal', err)
  }

  await prisma.tournamentLeague.create({
    data: {
      tournamentId,
      conferenceId: conference.id,
      leagueId: league.id,
      roundIndex,
      phase: roundIndex === 0 ? 'qualification' : 'elimination',
      orderInConference,
    },
  })

  const inviteCode = crypto.randomBytes(6).toString('base64url').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)
  const joinUrl = buildLeagueInviteUrl(inviteCode, { params: { utm_campaign: 'tournament_invite' } })
  const currentSettings = (league.settings as Record<string, unknown>) ?? {}
  await prisma.league.update({
    where: { id: league.id },
    data: { settings: { ...currentSettings, inviteCode, inviteLink: joinUrl } },
  })

  await logTournamentAudit(tournamentId, 'create_missing_league', {
    actorId: userId,
    targetType: 'league',
    targetId: league.id,
    metadata: { conferenceId, roundIndex, orderInConference },
  })

  return NextResponse.json({
    ok: true,
    leagueId: league.id,
    leagueName: league.name,
    inviteCode,
    joinUrl,
  })
}
