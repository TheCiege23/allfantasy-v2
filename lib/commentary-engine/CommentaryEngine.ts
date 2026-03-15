/**
 * CommentaryEngine — orchestrates AI commentary for matchups, trades, waivers, playoff drama.
 */

import { prisma } from '@/lib/prisma'
import { normalizeToSupportedSport } from '@/lib/sport-scope'
import { getStatisticalContext, generateCommentaryText } from './NarrativeGenerator'
import type { CommentaryContext, CommentaryEventType } from './types'

export interface GenerateCommentaryOptions {
  skipStatisticalContext?: boolean
  persist?: boolean
}

/**
 * Generate commentary for an event: optional DeepSeek stats, then OpenAI headline + body.
 * Optionally persist to CommentaryEntry.
 */
export async function generateCommentary(
  context: CommentaryContext,
  options?: GenerateCommentaryOptions
): Promise<{ headline: string; body: string } | null> {
  const skipStats = options?.skipStatisticalContext ?? false
  const persist = options?.persist ?? false

  const sport = normalizeToSupportedSport(context.sport)
  const leagueId = context.leagueId

  const statisticalContext = skipStats ? '' : await getStatisticalContext(context)
  const { headline, body } = await generateCommentaryText(context, statisticalContext || undefined)

  if (persist) {
    try {
      await prisma.commentaryEntry.create({
        data: {
          leagueId,
          sport,
          eventType: context.eventType,
          headline,
          body,
          contextSnap: context as unknown as object,
        },
      })
    } catch (e) {
      console.warn('[CommentaryEngine] Failed to persist:', e)
    }
  }

  return { headline, body }
}

export interface ListCommentaryOptions {
  leagueId: string
  eventType?: CommentaryEventType | null
  limit?: number
  cursor?: string
}

/**
 * List recent commentary entries for a league.
 */
export async function listCommentary(options: ListCommentaryOptions) {
  const { leagueId, eventType, limit = 20, cursor } = options
  const where: { leagueId: string; eventType?: string } = { leagueId }
  if (eventType) where.eventType = eventType

  const entries = await prisma.commentaryEntry.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  })

  const hasMore = entries.length > limit
  const list = hasMore ? entries.slice(0, limit) : entries

  return {
    entries: list.map((e) => ({
      id: e.id,
      leagueId: e.leagueId,
      sport: e.sport,
      eventType: e.eventType,
      headline: e.headline,
      body: e.body,
      createdAt: e.createdAt,
    })),
    nextCursor: hasMore ? list[list.length - 1]?.id : undefined,
  }
}
