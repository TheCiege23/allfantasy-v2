/**
 * PROMPT 3: Bracket/progression view — rounds, cut line, bubble explanation, active/eliminated, league assignments.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUniversalStandings } from '@/lib/tournament-mode/TournamentStandingsService'
import {
  getAdvancementSlotsPerConference,
  getBubbleSlotsPerConference,
} from '@/lib/tournament-mode/advancement-rules'

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
    select: { id: true, creatorId: true, hubSettings: true, settings: true, name: true },
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

  const settings = (tournament.settings as Record<string, unknown>) ?? {}
  const poolSize = Number(settings.participantPoolSize) || 120
  const qualificationWeeks = Number(settings.qualificationWeeks) ?? 9
  const bubbleEnabled = Boolean(settings.bubbleWeekEnabled)
  const advancementPerConf = getAdvancementSlotsPerConference(poolSize)
  const bubbleSlots = getBubbleSlotsPerConference(advancementPerConf, bubbleEnabled)

  const rounds = await prisma.legacyTournamentRound.findMany({
    where: { tournamentId },
    orderBy: { roundIndex: 'asc' },
  })

  const leagues = await prisma.legacyTournamentLeague.findMany({
    where: { tournamentId },
    include: {
      league: { select: { id: true, name: true, settings: true } },
      conference: { select: { id: true, name: true } },
    },
    orderBy: [{ roundIndex: 'asc' }, { conferenceId: 'asc' }, { orderInConference: 'asc' }],
  })

  const [standings, participants] = await Promise.all([
    getUniversalStandings(tournamentId),
    prisma.legacyTournamentParticipant.findMany({
      where: { tournamentId },
      select: { userId: true, status: true, eliminatedAtRoundIndex: true, currentLeagueId: true, bracketLabel: true },
    }),
  ])

  const activeCount = participants.filter((p) => p.status === 'active').length
  const eliminatedCount = participants.filter((p) => p.status === 'eliminated').length

  const cutLineDescription = `Top ${advancementPerConf} per conference advance (${poolSize} participants).`
  const bubbleDescription = bubbleEnabled
    ? `Bubble week: up to ${bubbleSlots} additional teams per conference (ranks ${advancementPerConf + 1}–${advancementPerConf + bubbleSlots}) can fill remaining advancement slots. Deterministic: same tiebreakers (W-L, then Points For).`
    : 'Bubble week is disabled. Only the direct cut line advances.'

  return NextResponse.json({
    tournamentId,
    tournamentName: tournament.name,
    qualificationWeeks,
    currentRound: rounds.find((r) => r.status === 'active')?.roundIndex ?? 0,
    rounds: rounds.map((r) => ({
      roundIndex: r.roundIndex,
      phase: r.phase,
      name: r.name,
      startWeek: r.startWeek,
      endWeek: r.endWeek,
      status: r.status,
    })),
    cutLine: {
      advancementPerConference: advancementPerConf,
      description: cutLineDescription,
    },
    bubble: {
      enabled: bubbleEnabled,
      slotsPerConference: bubbleSlots,
      description: bubbleDescription,
    },
    tiebreakers: ['Win/Loss Record', 'Points For'],
    activeCount,
    eliminatedCount,
    standingsCount: standings.length,
    leaguesByRound: leagues.reduce(
      (acc, tl) => {
        const r = tl.roundIndex
        if (!acc[r]) acc[r] = []
        acc[r].push({
          leagueId: tl.leagueId,
          leagueName: tl.league.name,
          conferenceName: tl.conference.name,
          phase: tl.phase,
          bracketLabel: ((tl.league.settings as Record<string, unknown>)?.bracketLabel as string) ?? null,
        })
        return acc
      },
      {} as Record<number, Array<{ leagueId: string; leagueName: string | null; conferenceName: string; phase: string; bracketLabel: string | null }>>
    ),
  })
}
