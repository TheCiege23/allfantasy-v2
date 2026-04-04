import { prisma } from '@/lib/prisma'

export async function assertTournamentCommissioner(
  tournamentId: string,
  userId: string,
): Promise<void> {
  const shell = await prisma.tournamentShell.findUnique({
    where: { id: tournamentId },
    select: { commissionerId: true },
  })
  if (!shell || shell.commissionerId !== userId) {
    throw new Error('FORBIDDEN')
  }
}

export async function canViewStandings(
  tournamentId: string,
  userId: string | null,
  visibility: string,
): Promise<boolean> {
  if (visibility === 'all') return true
  const shell = await prisma.tournamentShell.findUnique({
    where: { id: tournamentId },
    select: { commissionerId: true },
  })
  if (!shell) return false
  if (visibility === 'commissioner_only') return userId === shell.commissionerId
  if (visibility === 'league_only') return Boolean(userId)
  return Boolean(userId)
}
