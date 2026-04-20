/**
 * Next.js cache helpers for read-heavy league surfaces. Safe defaults: short revalidate + tag invalidation by league.
 * Only import from Server Components, route handlers, or server-only modules.
 */

import 'server-only'

import { unstable_cache } from 'next/cache'

export function leagueCacheTag(leagueId: string): string {
  return `league:${leagueId}`
}

export function standingsCacheTag(leagueId: string, season: number): string {
  return `standings:${leagueId}:${season}`
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
