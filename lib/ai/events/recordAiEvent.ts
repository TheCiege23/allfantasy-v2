/**
 * Async, non-blocking ingestion for the AI intelligence layer.
 * Never throw to callers; log and swallow DB errors so gameplay never breaks.
 */

import { prisma } from '@/lib/prisma'
import type { AiEventInput } from '@/lib/ai/events/aiEventTypes'

function scheduleWork(fn: () => Promise<void>): void {
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(() => {
      void fn()
    })
    return
  }
  setTimeout(() => void fn(), 0)
}

/**
 * Persist a platform event. Safe to call from API routes after successful mutations.
 * Runs on the next microtask so the HTTP response is not blocked.
 */
export function recordAiEvent(input: AiEventInput): void {
  scheduleWork(async () => {
    try {
      await prisma.aiPlatformEvent.create({
        data: {
          eventType: input.eventType,
          userId: input.userId ?? undefined,
          leagueId: input.leagueId ?? undefined,
          season: input.season ?? undefined,
          sport: input.sport ?? undefined,
          leagueType: input.leagueType ?? undefined,
          draftType: input.draftType ?? undefined,
          scoringProfile: input.scoringProfile ?? undefined,
          payload: (input.payload ?? {}) as object,
          dedupeKey: input.dedupeKey ?? undefined,
        },
      })
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code
      if (code === 'P2002') return
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('does not exist') || msg.includes('Unknown table')) {
        return
      }
      console.warn('[recordAiEvent]', msg)
    }
  })
}
