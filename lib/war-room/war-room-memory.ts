import { getAiMemory, upsertAiMemory, type AiMemoryScope } from '@/lib/ai-memory/ai-memory-store'

const SCOPE: AiMemoryScope = 'war_room_draft'

/**
 * Merge draft behavior signals for Chimmy / Waiver / Trade Finder personalization.
 */
export async function rememberWarRoomDraftBehavior(input: {
  userId: string
  leagueId: string | null | undefined
  event: 'recommendation_followed' | 'recommendation_ignored' | 'compare_used' | 'outlook_viewed'
  meta: Record<string, unknown>
}): Promise<void> {
  if (!input.leagueId) return

  const existing = (await getAiMemory(input.userId, SCOPE, {
    leagueId: input.leagueId,
    key: 'behavior',
  })) as Record<string, unknown> | null

  const events = Array.isArray(existing?.recentEvents) ? [...(existing.recentEvents as unknown[])] : []
  events.push({
    t: new Date().toISOString(),
    type: input.event,
    ...input.meta,
  })

  await upsertAiMemory({
    userId: input.userId,
    leagueId: input.leagueId,
    scope: SCOPE,
    key: 'behavior',
    value: {
      recentEvents: events.slice(-40),
      lastEventAt: new Date().toISOString(),
      lastEvent: input.event,
    },
  })
}

/**
 * Post-draft handoff blob — surfaced in Chimmy memory list + follow-up tools.
 */
export async function rememberPostDraftHandoff(input: {
  userId: string
  leagueId: string
  sport: string
  draftSessionId?: string | null
  summary: {
    headline: string
    grade: string
    bullets: string[]
    waiverWatchlist?: string[]
    tradeTargets?: string[]
  }
  links: {
    tradeFinder: string
    waiverAi: string
    chimmy: string
  }
}): Promise<void> {
  await upsertAiMemory({
    userId: input.userId,
    leagueId: input.leagueId,
    scope: SCOPE,
    key: 'post_draft',
    value: {
      updatedAt: new Date().toISOString(),
      sport: input.sport,
      draftSessionId: input.draftSessionId ?? null,
      summary: input.summary,
      links: input.links,
    },
  })
}
