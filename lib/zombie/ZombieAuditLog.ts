/**
 * Append-only Zombie audit log (PROMPT 353). Deterministic.
 */

import { prisma } from '@/lib/prisma'
import type { ZombieAuditEventType } from './types'

export async function appendZombieAudit(
  payload: {
    leagueId: string
    universeId?: string | null
    zombieLeagueId?: string | null
    eventType: ZombieAuditEventType
    metadata?: Record<string, unknown>
  }
): Promise<void> {
  await prisma.zombieAuditLog.create({
    data: {
      leagueId: payload.leagueId,
      universeId: payload.universeId ?? null,
      zombieLeagueId: payload.zombieLeagueId ?? null,
      eventType: payload.eventType,
      metadata: (payload.metadata ?? {}) as object,
    },
  })
}

export async function getZombieAuditLog(
  leagueId: string,
  options?: { limit?: number; since?: Date; eventTypes?: ZombieAuditEventType[] }
): Promise<{ eventType: string; metadata: unknown; createdAt: Date }[]> {
  const limit = options?.limit ?? 100
  const where: { leagueId: string; createdAt?: { gte: Date }; eventType?: { in: string[] } } = { leagueId }
  if (options?.since) where.createdAt = { gte: options.since }
  if (options?.eventTypes?.length) where.eventType = { in: options.eventTypes }
  const rows = await prisma.zombieAuditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: { eventType: true, metadata: true, createdAt: true },
  })
  return rows
}
