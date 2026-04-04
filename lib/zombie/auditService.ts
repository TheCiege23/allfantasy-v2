import { prisma } from '@/lib/prisma'
import type { Prisma, ZombieAuditEntry } from '@prisma/client'

export type ZombieAuditCreate = Omit<Prisma.ZombieAuditEntryUncheckedCreateInput, 'id' | 'zombieLeagueId'>

/**
 * Persist a universal audit row. Always await from resolution paths so logs are not lost.
 */
export async function logAuditEntry(zombieLeagueId: string, entry: ZombieAuditCreate): Promise<void> {
  await prisma.zombieAuditEntry.create({
    data: {
      zombieLeagueId,
      ...entry,
    },
  })
}

export async function getAuditTrailForTeam(
  zombieLeagueId: string,
  userId: string,
): Promise<ZombieAuditEntry[]> {
  return prisma.zombieAuditEntry.findMany({
    where: {
      zombieLeagueId,
      isVisibleToAffectedUser: true,
      OR: [{ targetUserId: userId }, { actorUserId: userId }],
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  })
}

export async function getFullAuditTrail(zombieLeagueId: string): Promise<ZombieAuditEntry[]> {
  return prisma.zombieAuditEntry.findMany({
    where: { zombieLeagueId },
    orderBy: { createdAt: 'desc' },
    take: 2000,
  })
}
