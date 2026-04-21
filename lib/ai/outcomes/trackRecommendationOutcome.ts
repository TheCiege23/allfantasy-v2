/**
 * Recommendation outcome logging for offline evaluation / future learning loops.
 */

import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'

export type TrackOutcomeInput = {
  recommendationId: string
  type: string
  userId?: string | null
  leagueId?: string | null
  recommendationPayload?: Record<string, unknown>
  followed?: boolean | null
  outcomeScore?: number | null
  resolvedAt?: Date | null
}

export async function trackRecommendationOutcome(input: TrackOutcomeInput): Promise<string | null> {
  try {
    const row = await prisma.aiRecommendationOutcome.create({
      data: {
        id: randomUUID(),
        recommendationId: input.recommendationId,
        type: input.type,
        userId: input.userId ?? undefined,
        leagueId: input.leagueId ?? undefined,
        recommendationPayload: (input.recommendationPayload ?? {}) as object,
        followed: input.followed ?? undefined,
        outcomeScore: input.outcomeScore ?? undefined,
        resolvedAt: input.resolvedAt ?? undefined,
      },
    })
    return row.id
  } catch (e) {
    console.warn('[trackRecommendationOutcome]', e instanceof Error ? e.message : e)
    return null
  }
}

export async function resolveRecommendationOutcome(
  recommendationId: string,
  patch: { followed?: boolean; outcomeScore?: number | null },
): Promise<void> {
  try {
    await prisma.aiRecommendationOutcome.updateMany({
      where: { recommendationId },
      data: {
        followed: patch.followed,
        outcomeScore: patch.outcomeScore ?? undefined,
        resolvedAt: new Date(),
      },
    })
  } catch {
    /* noop */
  }
}
