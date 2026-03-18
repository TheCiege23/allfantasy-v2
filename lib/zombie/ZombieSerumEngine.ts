/**
 * Zombie serum engine: award, use, revive (PROMPT 353). Deterministic.
 */

import { prisma } from '@/lib/prisma'
import { getZombieLeagueConfig } from './ZombieLeagueConfig'
import { getStatus, setRevived } from './ZombieOwnerStatusService'
import { appendZombieAudit } from './ZombieAuditLog'

export async function getSerumBalance(leagueId: string, rosterId: string): Promise<number> {
  const row = await prisma.zombieResourceLedger.findFirst({
    where: { leagueId, rosterId, resourceType: 'serum' },
    select: { balance: true },
  })
  return row?.balance ?? 0
}

/** Award serum (e.g. high score of week, or bash/maul). */
export async function awardSerum(
  leagueId: string,
  rosterId: string,
  reason: string,
  week?: number,
  zombieLeagueId?: string | null
): Promise<void> {
  const existing = await prisma.zombieResourceLedger.findFirst({
    where: { leagueId, rosterId, resourceType: 'serum' },
  })
  if (existing) {
    await prisma.zombieResourceLedger.update({
      where: { id: existing.id },
      data: {
        balance: existing.balance + 1,
        awardedInWeek: week ?? undefined,
        updatedAt: new Date(),
      },
    })
  } else {
    await prisma.zombieResourceLedger.create({
      data: {
        leagueId,
        zombieLeagueId: zombieLeagueId ?? null,
        rosterId,
        resourceType: 'serum',
        balance: 1,
        awardedInWeek: week ?? null,
      },
    })
  }
  await prisma.zombieResourceLedgerEntry.create({
    data: {
      leagueId,
      rosterId,
      resourceType: 'serum',
      delta: 1,
      reason,
      week: week ?? null,
    },
  })
  await appendZombieAudit({
    leagueId,
    zombieLeagueId: zombieLeagueId ?? null,
    eventType: 'serum_award',
    metadata: { rosterId, reason, week },
  })
}

/** Use serums to revive (Zombie -> Survivor). Requires serumReviveCount. Returns true if revived. */
export async function useSerumToRevive(
  leagueId: string,
  rosterId: string,
  zombieLeagueId?: string | null
): Promise<boolean> {
  const config = await getZombieLeagueConfig(leagueId)
  if (!config) return false
  const status = await getStatus(leagueId, rosterId)
  if (status !== 'Zombie') return false

  const balance = await getSerumBalance(leagueId, rosterId)
  if (balance < config.serumReviveCount) return false

  const row = await prisma.zombieResourceLedger.findFirst({
    where: { leagueId, rosterId, resourceType: 'serum' },
  })
  if (!row) return false
  const newBalance = row.balance - config.serumReviveCount
  await prisma.zombieResourceLedger.update({
    where: { id: row.id },
    data: { balance: newBalance, spentAt: new Date(), updatedAt: new Date() },
  })
  await prisma.zombieResourceLedgerEntry.create({
    data: {
      leagueId,
      rosterId,
      resourceType: 'serum',
      delta: -config.serumReviveCount,
      reason: 'revive',
      targetRosterId: rosterId,
    },
  })
  await setRevived(leagueId, rosterId)
  await appendZombieAudit({
    leagueId,
    zombieLeagueId: zombieLeagueId ?? null,
    eventType: 'revive',
    metadata: { rosterId, serumCount: config.serumReviveCount },
  })
  return true
}
