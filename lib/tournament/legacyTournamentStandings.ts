import 'server-only'

import { prisma } from '@/lib/prisma'
import { canViewLegacyTournamentStandings } from '@/lib/tournament/legacyTournamentAccess'

export async function getLegacyTournamentStandingsPayload(
  tournamentId: string,
  userId: string | null,
  roundNumber: number | null,
  week: number | null,
) {
  const t = await prisma.legacyTournament.findUnique({
    where: { id: tournamentId },
    include: {
      rounds: { orderBy: { roundIndex: 'asc' } },
      leagues: {
        include: {
          league: { include: { teams: { orderBy: { pointsFor: 'desc' } } } },
        },
      },
    },
  })

  if (!t) return { error: 'Not found' as const, status: 404 as const }

  const allowed = await canViewLegacyTournamentStandings(t, userId)
  if (!allowed) return { error: 'Forbidden' as const, status: 403 as const }

  const rn = roundNumber != null && Number.isFinite(roundNumber) ? roundNumber : 1
  const round = t.rounds.find((r) => r.roundIndex === rn - 1) ?? t.rounds[0]
  if (!round) return { error: 'Round not found' as const, status: 404 as const }

  const tls = t.leagues.filter((tl) => tl.roundIndex === round.roundIndex)

  const roundOut = {
    id: round.id,
    roundNumber: round.roundIndex + 1,
    roundType: round.phase,
    roundLabel: round.name ?? `Round ${round.roundIndex + 1}`,
    weekStart: round.startWeek ?? 1,
    weekEnd: round.endWeek ?? 18,
    status: round.status,
  }

  if (week != null && Number.isFinite(week)) {
    if (week < roundOut.weekStart || week > roundOut.weekEnd) {
      return {
        error: `week must be between ${roundOut.weekStart} and ${roundOut.weekEnd} for this round`,
        status: 400 as const,
      }
    }
  }

  const withWeek = week != null && Number.isFinite(week)

  const leaguesOut = tls.map((tl) => ({
    id: tl.id,
    name: tl.league.name ?? 'League',
    conferenceId: tl.conferenceId,
    roundId: round.id,
    leagueId: tl.leagueId,
    status: tl.phase,
    teamSlots: tl.league.leagueSize ?? 12,
    advancersCount: 0,
    participants: tl.league.teams.map((team, idx) => {
      const row = {
        id: `legacy-${tl.id}-${team.id}`,
        tournamentLeagueId: tl.id,
        participantId: `legacy-p-${team.id}`,
        userId: team.claimedByUserId ?? '',
        wins: team.wins,
        losses: team.losses,
        ties: team.ties,
        pointsFor: team.pointsFor,
        pointsAgainst: team.pointsAgainst,
        streak: null,
        leagueRank: idx + 1,
        conferenceRank: null,
        advancementStatus: 'active',
        draftSlot: null,
        participant: {
          displayName: team.ownerName || team.teamName,
          userId: team.claimedByUserId ?? '',
        },
      }
      return withWeek ? { ...row, weekPoints: 0 } : row
    }),
  }))

  if (week != null && Number.isFinite(week)) {
    return { round: roundOut, leagues: leaguesOut, weeklyWeek: week }
  }

  return { round: roundOut, leagues: leaguesOut }
}
