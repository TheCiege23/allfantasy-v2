/**
 * AllFantasy real-time event helpers — builds on `leagueRealtimeStore` + `publishLeagueFanoutEvent`.
 * Does not duplicate notification storage; uses existing PlatformNotification + LeagueEvent flows.
 */

import 'server-only'

import { leagueRealtimeStore } from '@/lib/league-events/realtime-store'
import type { NotificationCategoryId } from '@/lib/notification-settings/types'
import type { LeagueEventVisibility } from '@/lib/league-events/types'

const matchupDebouncers = new Map<string, ReturnType<typeof setTimeout>>()

/**
 * Coalesce high-frequency matchup/score hints into one SSE message per league+week (default 2.5s).
 * Skips DB league_event rows — clients refresh matchup/score UIs via SSE only.
 */
export function publishMatchupLiveTickDebounced(
  leagueId: string,
  week: number,
  meta: Record<string, unknown> = {},
  debounceMs = 2500,
): void {
  const key = `${leagueId}:matchup:${week}`
  const prev = matchupDebouncers.get(key)
  if (prev) clearTimeout(prev)
  matchupDebouncers.set(
    key,
    setTimeout(() => {
      matchupDebouncers.delete(key)
      leagueRealtimeStore.publish(leagueId, {
        eventType: 'matchup_live_tick',
        message: 'Matchup update',
        meta: { ...meta, week },
      })
    }, debounceMs),
  )
}

/** Re-export canonical publisher for call sites that should use one import path. */
export { publishLeagueFanoutEvent, type PublishLeagueFanoutInput } from '@/lib/league-events/publisher'

export async function emitPlayerInjuryOrNewsFanout(params: {
  leagueId: string
  eventType: 'player_injury_update' | 'player_news_update'
  title: string
  message: string
  category?: NotificationCategoryId
  visibility?: LeagueEventVisibility
  meta?: Record<string, unknown>
  dedupeKey?: string
  /** When true, only realtime + activity row — no inbox spam (e.g. noisy news). */
  skipNotifications?: boolean
}): Promise<void> {
  const { publishLeagueFanoutEvent } = await import('@/lib/league-events/publisher')
  await publishLeagueFanoutEvent({
    leagueId: params.leagueId,
    eventType: params.eventType,
    title: params.title,
    message: params.message,
    category: params.category ?? 'injury_alerts',
    visibility: params.visibility ?? 'all_members',
    meta: params.meta,
    dedupeKey: params.dedupeKey,
    skipNotifications: params.skipNotifications,
  })
}

export async function emitPlayoffAdvancementFanout(params: {
  leagueId: string
  title: string
  message: string
  meta?: Record<string, unknown>
  dedupeKey?: string
}): Promise<void> {
  const { publishLeagueFanoutEvent } = await import('@/lib/league-events/publisher')
  await publishLeagueFanoutEvent({
    leagueId: params.leagueId,
    eventType: 'playoff_advancement',
    title: params.title,
    message: params.message,
    category: 'matchup_results',
    visibility: 'all_members',
    meta: params.meta,
    dedupeKey: params.dedupeKey,
  })
}
