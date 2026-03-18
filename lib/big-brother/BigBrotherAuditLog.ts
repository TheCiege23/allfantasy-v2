/**
 * [NEW] lib/big-brother/BigBrotherAuditLog.ts
 * Append-only Big Brother audit log. PROMPT 2/6.
 */

import { prisma } from '@/lib/prisma'

export type BigBrotherAuditEventType =
  | 'hoh_assigned'
  | 'nomination'
  | 'veto_draw'
  | 'veto_winner'
  | 'veto_used'
  | 'replacement_nominee'
  | 'eviction_vote_submitted'
  | 'eviction'
  | 'jury_enrolled'
  | 'finale_vote'
  | 'phase_transition'
  | 'auto_nomination'
  | 'auto_replacement_nominee'

export async function appendBigBrotherAudit(
  leagueId: string,
  configId: string,
  eventType: BigBrotherAuditEventType,
  metadata?: Record<string, unknown>
): Promise<void> {
  await prisma.bigBrotherAuditLog.create({
    data: {
      leagueId,
      configId,
      eventType,
      metadata: (metadata ?? {}) as object,
    },
  })
}

export async function getBigBrotherAuditLog(
  leagueId: string,
  options?: { limit?: number; since?: Date; eventTypes?: BigBrotherAuditEventType[] }
): Promise<{ eventType: string; metadata: unknown; createdAt: Date }[]> {
  const limit = options?.limit ?? 100
  const where: { leagueId: string; createdAt?: { gte: Date }; eventType?: { in: string[] } } = { leagueId }
  if (options?.since) where.createdAt = { gte: options.since }
  if (options?.eventTypes?.length) where.eventType = { in: options.eventTypes }
  const rows = await prisma.bigBrotherAuditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: { eventType: true, metadata: true, createdAt: true },
  })
  return rows
}
