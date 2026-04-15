/**
 * [UPDATED] POST: Create a missing child league for a tournament (recovery tool).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { runPostCreateInitialization } from '@/lib/league-defaults-orchestrator/LeagueDefaultsOrchestrator'
import { normalizeToSupportedSport } from '@/lib/sport-scope'
import { TOURNAMENT_LEAGUE_VARIANT } from '@/lib/tournament-mode/constants'
import { logTournamentAudit } from '@/lib/tournament-mode/TournamentAuditService'
import { applyTournamentFeederInviteAndDraftShell } from '@/lib/tournament-mode/TournamentCreationService'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest, { params }: { params: Promise<{ tournamentId: string }> }) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id ?? null
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tournamentId } = await params
  const tournament = await prisma.legacyTournament.findUnique({
    where: { id: tournamentId },
    include: { conferences: { orderBy: { orderIndex: 'asc' } } },
  })
  if (!tournament) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (tournament.creatorId !== userId) return NextResponse.json({ error: 'Commissioner only' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const conferenceId = body.conferenceId as string
  const roundIndex = typeof body.roundIndex === 'number' ? body.roundIndex : 0
  const leagueName = (body.leagueName as string) ?? `Recovery League ${Date.now()}`
  const leagueSize = typeof body.leagueSize === 'number' ? body.leagueSize : 12

  if (!conferenceId) return NextResponse.json({ error: 'conferenceId required' }, { status: 400 })

  const conf = tournament.conferences.find((c) => c.id === conferenceId)
  if (!conf) return NextResponse.json({ error: 'Conference not found in this tournament' }, { status: 400 })

  const sport = normalizeToSupportedSport(tournament.sport)
  const league = await prisma.league.create({
    data: {
      userId: tournament.creatorId,
      name: leagueName,
      platform: 'manual',
      platformLeagueId: `tournament-${tournamentId}-recovery-${conferenceId}-${Date.now()}`,
      leagueSize,
      scoring: 'PPR',
      isDynasty: false,
      sport,
      leagueVariant: TOURNAMENT_LEAGUE_VARIANT,
      settings: { league_type: 'tournament', tournamentId, conferenceName: conf.name, roundIndex, phase: 'qualification' },
      syncStatus: 'manual',
    },
  })

  try {
    await runPostCreateInitialization(league.id, sport, TOURNAMENT_LEAGUE_VARIANT)
  } catch { /* non-fatal */ }

  const orderInConference = await prisma.legacyTournamentLeague.count({ where: { tournamentId, conferenceId, roundIndex } })
  await prisma.legacyTournamentLeague.create({
    data: { tournamentId, conferenceId, leagueId: league.id, roundIndex, phase: 'qualification', orderInConference },
  })

  const { inviteCode, joinUrl } = await applyTournamentFeederInviteAndDraftShell(league.id)

  await logTournamentAudit(tournamentId, 'create_missing_league', {
    actorId: userId,
    metadata: { leagueId: league.id, conferenceId, roundIndex },
  })
  return NextResponse.json({ ok: true, leagueId: league.id, inviteCode, joinUrl })
}
