/**
 * Append-only Survivor audit log (PROMPT 346). Deterministic.
 */

import { prisma } from '@/lib/prisma'
import type { SurvivorAuditEventType } from './types'

export async function appendSurvivorAudit(
  leagueId: string,
  configId: string,
  eventType: SurvivorAuditEventType,
  metadata?: Record<string, unknown>
): Promise<void> {
  await prisma.survivorAuditLog.create({
    data: {
      leagueId,
      configId,
      eventType,
      metadata: (metadata ?? {}) as object,
    },
  })
}

export async function getSurvivorAuditLog(
  leagueId: string,
  options?: { limit?: number; since?: Date; eventTypes?: SurvivorAuditEventType[] }
): Promise<{ eventType: string; metadata: unknown; createdAt: Date }[]> {
  const limit = options?.limit ?? 100
  const where: { leagueId: string; createdAt?: { gte: Date }; eventType?: { in: string[] } } = { leagueId }
  if (options?.since) where.createdAt = { gte: options.since }
  if (options?.eventTypes?.length) where.eventType = { in: options.eventTypes }
  const rows = await prisma.survivorAuditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: { eventType: true, metadata: true, createdAt: true },
  })
  return rows
}
