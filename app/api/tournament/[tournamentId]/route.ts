/**
 * [UPDATED] app/api/tournament/[tournamentId]/route.ts
 * GET: Tournament overview (conferences, rounds, leagues, settings).
 * Supports both TournamentShell (new) and LegacyTournament models.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id ?? null

  const { tournamentId } = await params
  if (!tournamentId) return NextResponse.json({ error: 'tournamentId required' }, { status: 400 })

  // Try Shell model first
  const shell = await prisma.tournamentShell.findUnique({ where: { id: tournamentId } }).catch(() => null)
  if (shell) {
    // Delegate to Shell-based read
    const conferences = await prisma.tournamentConference.findMany({
      where: { tournamentId },
      orderBy: { conferenceNumber: 'asc' },
    })
    const rounds = await prisma.tournamentRound.findMany({
      where: { tournamentId },
      orderBy: { roundNumber: 'asc' },
    })
    return NextResponse.json({
      id: shell.id,
      name: shell.name,
      sport: shell.sport,
      season: shell.season,
      status: shell.status,
      isCommissioner: userId === shell.commissionerId,
      conferences,
      rounds,
      _leagueCount: 0,
    })
  }

  // Fallback to Legacy model
  const legacy = await prisma.legacyTournament.findUnique({
    where: { id: tournamentId },
    include: {
      conferences: {
        orderBy: { orderIndex: 'asc' },
        include: {
          leagues: {
            orderBy: [{ roundIndex: 'asc' }, { orderInConference: 'asc' }],
            include: { league: { select: { id: true, name: true, leagueSize: true } } },
          },
        },
      },
      rounds: { orderBy: { roundIndex: 'asc' } },
    },
  })
  if (!legacy) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const settings = (legacy.settings as Record<string, unknown>) ?? {}
  const leagueCount = legacy.conferences.reduce((acc, c) => acc + c.leagues.length, 0)

  return NextResponse.json({
    id: legacy.id,
    name: legacy.name,
    sport: legacy.sport,
    season: legacy.season,
    status: legacy.status,
    isCommissioner: userId === legacy.creatorId,
    conferences: legacy.conferences.map((c) => ({
      id: c.id,
      name: c.name,
      theme: c.theme,
      leagues: c.leagues.map((tl) => ({
        id: tl.id,
        leagueId: tl.leagueId,
        league: tl.league,
        roundIndex: tl.roundIndex,
        phase: tl.phase,
        orderInConference: tl.orderInConference,
      })),
    })),
    rounds: legacy.rounds.map((r) => ({
      id: r.id,
      roundIndex: r.roundIndex,
      phase: r.phase,
      name: r.name,
      startWeek: r.startWeek,
      endWeek: r.endWeek,
      status: r.status,
    })),
    _leagueCount: leagueCount,
    settings: {
      roundRedraftSchedule: settings.roundRedraftSchedule,
      qualificationWeeks: settings.qualificationWeeks,
    },
  })
}
