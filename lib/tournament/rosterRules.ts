import { prisma } from '@/lib/prisma'

export async function applyRoundRosterRules(tournamentId: string, roundNumber: number): Promise<void> {
  const shell = await prisma.tournamentShell.findUnique({ where: { id: tournamentId } })
  if (!shell) throw new Error('Tournament not found')

  const round = await prisma.tournamentRound.findFirst({ where: { tournamentId, roundNumber } })
  if (!round) throw new Error('Round not found')

  let size = shell.tournamentRosterSize
  if (roundNumber === 1) size = shell.openingRosterSize
  if (round.roundType === 'elite' || round.roundType === 'final') size = shell.eliteRosterSize
  if (round.rosterSizeOverride != null) size = round.rosterSizeOverride

  const leagues = await prisma.tournamentLeague.findMany({
    where: { tournamentId, roundId: round.id },
  })
  for (const tl of leagues) {
    if (!tl.leagueId) continue
    await prisma.league.update({
      where: { id: tl.leagueId },
      data: { rosterSize: size },
    })
  }

  if (shell.faabResetOnRedraft) {
    const tlIds = leagues.map((l) => l.id)
    await prisma.tournamentLeagueParticipant.updateMany({
      where: { tournamentLeagueId: { in: tlIds } },
      data: { faabBalance: 100 },
    })
  }
}
