/**
 * Zombie replacement owner service: inactivity workflow (PROMPT 353).
 */

import { prisma } from '@/lib/prisma'
import { appendZombieAudit } from './ZombieAuditLog'

export async function flagInactiveRoster(
  leagueId: string,
  rosterId: string,
  reason: string
): Promise<void> {
  await appendZombieAudit({
    leagueId,
    eventType: 'owner_replacement',
    metadata: { rosterId, reason, action: 'flagged' },
  })
}

export async function assignReplacementOwner(
  leagueId: string,
  previousRosterId: string,
  newUserId: string
): Promise<void> {
  const roster = await prisma.roster.findFirst({
    where: { leagueId, id: previousRosterId },
  })
  if (!roster) return
  await prisma.roster.update({
    where: { id: previousRosterId },
    data: { platformUserId: newUserId },
  })
  await appendZombieAudit({
    leagueId,
    eventType: 'owner_replacement',
    metadata: { previousRosterId, newUserId, action: 'assigned' },
  })
}
