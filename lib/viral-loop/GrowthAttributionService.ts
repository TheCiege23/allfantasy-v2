/**
 * GrowthAttributionService — record and query how users entered (PROMPT 291).
 * First-touch: one attribution per user (source of signup / first conversion).
 */

import { prisma } from '@/lib/prisma'
import type { GrowthAttributionSource } from './types'

const VALID_SOURCES: GrowthAttributionSource[] = [
  'referral',
  'league_invite',
  'draft_share',
  'ai_share',
  'competition_invite',
  'organic',
]

function isValidSource(s: string): s is GrowthAttributionSource {
  return VALID_SOURCES.includes(s as GrowthAttributionSource)
}

/**
 * Record growth attribution for a user (first-touch only).
 * Idempotent: if user already has an attribution, does not overwrite.
 */
export async function recordAttribution(
  userId: string,
  source: GrowthAttributionSource,
  options?: { sourceId?: string | null; metadata?: Record<string, unknown> }
): Promise<{ recorded: boolean }> {
  if (!userId || !isValidSource(source)) return { recorded: false }

  const existing = await prisma.growthAttribution.findUnique({
    where: { userId },
    select: { id: true },
  })
  if (existing) return { recorded: false }

  await prisma.growthAttribution.create({
    data: {
      userId,
      source,
      sourceId: options?.sourceId ?? null,
      metadata: (options?.metadata ?? {}) as object,
    },
  })
  return { recorded: true }
}

/**
 * Get attribution for a user (if any).
 */
export async function getAttribution(userId: string): Promise<{
  source: GrowthAttributionSource
  sourceId: string | null
  metadata: Record<string, unknown> | null
  createdAt: Date
} | null> {
  const row = await prisma.growthAttribution.findUnique({
    where: { userId },
    select: { source: true, sourceId: true, metadata: true, createdAt: true },
  })
  if (!row) return null
  return {
    source: row.source as GrowthAttributionSource,
    sourceId: row.sourceId,
    metadata: row.metadata as Record<string, unknown> | null,
    createdAt: row.createdAt,
  }
}

/**
 * Count signups by source (for growth dashboard).
 */
export async function getAttributionCountsBySource(): Promise<Record<GrowthAttributionSource, number>> {
  const rows = await prisma.growthAttribution.groupBy({
    by: ['source'],
    _count: { userId: true },
  })
  const out = {} as Record<GrowthAttributionSource, number>
  for (const s of VALID_SOURCES) out[s] = 0
  for (const r of rows) {
    if (isValidSource(r.source)) out[r.source] = r._count.userId
  }
  return out
}
