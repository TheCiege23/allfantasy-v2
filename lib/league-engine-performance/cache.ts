/**
 * Next.js cache helpers for read-heavy league surfaces. Safe defaults: short revalidate + tag invalidation by league.
 * Only import from Server Components, route handlers, or server-only modules.
 */

import 'server-only'

import { revalidateTag, unstable_cache } from 'next/cache'

export function leagueCacheTag(leagueId: string): string {
  return `league:${leagueId}`
}

export function standingsCacheTag(leagueId: string, season: number): string {
  return `standings:${leagueId}:${season}`
}

export function matchupCenterCacheTag(leagueId: string, season: number, week: number): string {
  return `matchup:${leagueId}:${season}:w${week}`
}

export function notificationInboxTag(userId: string): string {
  return `notifications:user:${userId}`
}

export function leagueSettingsSnapshotTag(leagueId: string, version?: number): string {
  return version != null ? `leagueSettings:${leagueId}:v${version}` : `leagueSettings:${leagueId}`
}

/**
 * Wrap a fetcher with `unstable_cache` keyed by fragment + league; tag for selective revalidation.
 */
export async function withLeagueUnstableCache<T>(
  leagueId: string,
  fragment: string,
  fetcher: () => Promise<T>,
  options?: { revalidateSeconds?: number; extraTags?: string[] },
): Promise<T> {
  const revalidate = options?.revalidateSeconds ?? 30
  const tags = [leagueCacheTag(leagueId), ...(options?.extraTags ?? [])]
  const cached = unstable_cache(
    fetcher,
    [fragment, leagueId],
    {
      revalidate,
      tags,
    },
  )
  return cached()
}

/**
 * Invalidate Next.js cache tags for league surfaces (call from server actions / route handlers after writes).
 * Safe to call from Route Handlers; may no-op outside a Next request context.
 */
export function revalidateLeagueEngineTags(tags: string[]): void {
  if (tags.length === 0) return
  try {
    for (const t of tags) {
      revalidateTag(t)
    }
  } catch {
    // next/cache unavailable outside App Router request — ignore
  }
}
