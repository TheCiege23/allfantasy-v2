import { prisma } from '@/lib/prisma'
import { refreshUserRankingsContext } from '@/lib/rankings/refreshUserContext'
import { syncLegacyLeagueFromSleeper } from '@/lib/legacy-import'
import { computeAndSaveRank } from '@/lib/ranking/computeAndSaveRank'
import { runWithConcurrency } from '@/lib/async-utils'
import { copyLegacyStatsToImportedLeague } from '@/lib/leagues/copyLegacyStatsToImportedLeague'
import type { SleeperLeague as SleeperLeagueApi } from '@/lib/sleeper-client'

export type LeagueImportKey = { platformLeagueId: string; season: number }

function abortAfter(ms: number): AbortSignal {
  if (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms)
  }
  const c = new AbortController()
  setTimeout(() => c.abort(), ms)
  return c.signal
}

/**
 * Phase 2: full Sleeper roster/bracket sync + legacy tables + rank cache + profile flags.
 * Intended for `/api/leagues/import/sync` (long maxDuration).
 */
export async function runLeagueImportDetailSync(params: {
  userId: string
  legacyUserId: string
  sleeperUserId: string
  leagueKeys: LeagueImportKey[]
}): Promise<void> {
  const { userId, legacyUserId, sleeperUserId, leagueKeys } = params

  await prisma.userProfile.update({
    where: { userId },
    data: { leagueImportDetailPending: true },
  })

  try {
    await runWithConcurrency(leagueKeys, 4, async (key) => {
      const owned = await prisma.league.findFirst({
        where: {
          userId,
          platform: 'sleeper',
          platformLeagueId: key.platformLeagueId,
          season: key.season,
        },
        select: { id: true },
      })
      if (!owned) {
        console.warn('[import/sync] skip league not owned by user', key)
        return
      }

      try {
        const res = await fetch(
          `https://api.sleeper.app/v1/league/${encodeURIComponent(key.platformLeagueId)}`,
          {
            signal: abortAfter(12000),
            headers: { 'User-Agent': 'AllFantasy/1.0', Accept: 'application/json' },
          },
        )
        if (!res.ok) {
          console.warn('[import/sync] league fetch failed', key.platformLeagueId, res.status)
          return
        }
        const raw = (await res.json()) as Record<string, unknown>
        const leagueDoc = {
          ...raw,
          season: key.season,
          league_id: raw.league_id ?? key.platformLeagueId,
        } as unknown as SleeperLeagueApi

        await syncLegacyLeagueFromSleeper(legacyUserId, sleeperUserId, leagueDoc, key.season)
        await copyLegacyStatsToImportedLeague(userId, legacyUserId, sleeperUserId, key.platformLeagueId, key.season)
      } catch (e: unknown) {
        console.warn('[import/sync] league sync failed', key, e)
      }
    })

    try {
      await computeAndSaveRank(userId)
    } catch (e: unknown) {
      console.warn('[import/sync] computeAndSaveRank failed:', e)
    }

    try {
      await refreshUserRankingsContext(userId)
    } catch (e: unknown) {
      console.warn('[import/sync] refreshUserRankingsContext failed:', e)
    }
  } finally {
    await prisma.userProfile.update({
      where: { userId },
      data: { leagueImportDetailPending: false },
    })
  }
}
