/**
 * [UPDATED] app/api/tournament/[tournamentId]/bracket/route.ts
 * GET: Bracket data — rounds, leagues-by-round, cut line info, participant counts.
 * Supports Legacy tournaments.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  getAdvancementSlotsPerConference,
  getBubbleSlotsPerConference,
} from '@/lib/tournament-mode/advancement-rules'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  const { tournamentId } = await params
  if (!tournamentId) return NextResponse.json({ error: 'tournamentId required' }, { status: 400 })

  const tournament = await prisma.legacyTournament.findUnique({
    where: { id: tournamentId },
    include: {
      rounds: { orderBy: { roundIndex: 'asc' } },
    },
  })
  if (!tournament) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const settings = (tournament.settings as Record<string, unknown>) ?? {}
  const poolSize = Number(settings.participantPoolSize) || 120
  const bubbleEnabled = Boolean(settings.bubbleWeekEnabled)
  const qualificationWeeks = Number(settings.qualificationWeeks) || 9
  const tiebreakers = (settings.qualificationTiebreakers as string[]) ?? ['wins', 'points_for']
  const advancementPerConf = getAdvancementSlotsPerConference(poolSize)
  const bubbleSlots = getBubbleSlotsPerConference(advancementPerConf, bubbleEnabled)

  // Get all leagues grouped by round
  const allTournamentLeagues = await prisma.legacyTournamentLeague.findMany({
    where: { tournamentId },
    include: {
      league: { select: { id: true, name: true, leagueSize: true } },
      conference: { select: { name: true } },
    },
    orderBy: [{ roundIndex: 'asc' }, { conferenceId: 'asc' }, { orderInConference: 'asc' }],
  })

  const leaguesByRound: Record<number, Array<{
    leagueId: string
    leagueName: string | null
    conferenceName: string
    phase: string
    bracketLabel: string | null
  }>> = {}

  for (const tl of allTournamentLeagues) {
    const round = tl.roundIndex
    if (!leaguesByRound[round]) leaguesByRound[round] = []
    const leagueSettings = (tl.league as { settings?: Record<string, unknown> })?.settings as Record<string, unknown> | undefined
    leaguesByRound[round].push({
      leagueId: tl.leagueId,
      leagueName: tl.league.name,
      conferenceName: tl.conference.name,
      phase: tl.phase,
      bracketLabel: (leagueSettings?.bracketLabel as string) ?? null,
    })
  }

  const activeCount = await prisma.legacyTournamentParticipant.count({
    where: { tournamentId, status: 'active' },
  })
  const eliminatedCount = await prisma.legacyTournamentParticipant.count({
    where: { tournamentId, status: 'eliminated' },
  })

  // Current active round
  const activeRound = tournament.rounds.find((r) => r.status === 'active')
  const currentRound = activeRound?.roundIndex ?? 0

  return NextResponse.json({
    tournamentName: tournament.name,
    qualificationWeeks,
    currentRound,
    rounds: tournament.rounds.map((r) => ({
      roundIndex: r.roundIndex,
      phase: r.phase,
      name: r.name,
      startWeek: r.startWeek,
      endWeek: r.endWeek,
      status: r.status,
    })),
    cutLine: {
      advancementPerConference: advancementPerConf,
      description: `Top ${advancementPerConf} per conference advance (pool size: ${poolSize})`,
    },
    bubble: {
      enabled: bubbleEnabled,
      slotsPerConference: bubbleSlots,
      description: bubbleEnabled
        ? `${bubbleSlots} bubble slot(s) per conference may advance after Week ${qualificationWeeks}`
        : 'Bubble week is disabled',
    },
    tiebreakers,
    activeCount,
    eliminatedCount,
    leaguesByRound,
  })
}
