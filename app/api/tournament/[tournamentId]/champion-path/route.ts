/**
 * [UPDATED] GET: Champion path history — shows the full journey of the champion (or all finalists).
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params

  const tournament = await prisma.legacyTournament.findUnique({
    where: { id: tournamentId },
    select: { name: true, status: true, settings: true },
  })
  if (!tournament) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const settings = (tournament.settings as Record<string, unknown>) ?? {}
  const championUserId = settings.championUserId as string | null

  // Get all rounds
  const rounds = await prisma.legacyTournamentRound.findMany({
    where: { tournamentId },
    orderBy: { roundIndex: 'asc' },
  })

  // Get champion's participant record
  let champion = null
  if (championUserId) {
    champion = await prisma.legacyTournamentParticipant.findUnique({
      where: { tournamentId_userId: { tournamentId, userId: championUserId } },
    })
  }

  // Build champion path: which leagues they were in per round
  const path: Array<{ roundIndex: number; roundName: string | null; leagueId: string | null; leagueName: string | null; phase: string }> = []
  if (championUserId) {
    for (const round of rounds) {
      const tl = await prisma.legacyTournamentLeague.findFirst({
        where: { tournamentId, roundIndex: round.roundIndex },
        include: { league: { select: { id: true, name: true } } },
      })
      // Check if champion had a roster in any league this round
      if (tl) {
        const roster = await prisma.roster.findFirst({
          where: { leagueId: tl.leagueId, platformUserId: championUserId },
          select: { id: true },
        })
        if (roster) {
          path.push({
            roundIndex: round.roundIndex,
            roundName: round.name,
            leagueId: tl.leagueId,
            leagueName: tl.league.name,
            phase: round.phase,
          })
        }
      }
    }
  }

  // Get all finalists (active in the last round)
  const lastRound = rounds[rounds.length - 1]
  let finalists: Array<{ userId: string; status: string; bracketLabel: string | null }> = []
  if (lastRound) {
    const participants = await prisma.legacyTournamentParticipant.findMany({
      where: { tournamentId, advancedAtRoundIndex: { gte: lastRound.roundIndex - 1 } },
      select: { userId: true, status: true, bracketLabel: true },
    })
    finalists = participants
  }

  return NextResponse.json({
    tournamentName: tournament.name,
    status: tournament.status,
    championUserId,
    championTeamName: settings.championTeamName ?? null,
    champion: champion ? { wins: champion.qualificationWins, losses: champion.qualificationLosses, pointsFor: champion.qualificationPointsFor } : null,
    path,
    finalists,
    rounds: rounds.map((r) => ({ roundIndex: r.roundIndex, name: r.name, phase: r.phase, status: r.status })),
  })
}
