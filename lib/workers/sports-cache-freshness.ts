import 'server-only'

import { prisma } from '@/lib/prisma'
import { fetchWithChain } from '@/lib/workers/api-chain'
import { SUPPORTED_SPORTS, type ApiChainSport, type ApiDataType } from '@/lib/workers/api-config'

const SWEEP_TYPES: ApiDataType[] = [
  'players',
  'teams',
  'injuries',
  'news',
  'schedule',
  'standings',
]

/** Must match `fetchWithChain` (`options` only; default → `{}`). */
export function defaultSportsCacheKey(sport: ApiChainSport, dataType: ApiDataType): string {
  return `${sport}:${dataType}:${JSON.stringify({})}`
}

/**
 * Refresh default-query cache rows when missing or expired (stale).
 */
export async function runSportsDataFreshnessSweep(): Promise<{
  refreshed: number
  errors: string[]
}> {
  const errors: string[] = []
  let refreshed = 0

  for (const sport of [...SUPPORTED_SPORTS] as ApiChainSport[]) {
    for (const dataType of SWEEP_TYPES) {
      try {
        const cacheKey = defaultSportsCacheKey(sport, dataType)
        const fresh = await prisma.sportsDataCache.findFirst({
          where: {
            sport,
            dataType,
            cacheKey,
            expiresAt: { gt: new Date() },
          },
        })
        if (fresh) continue

        await fetchWithChain({ sport, dataType, query: {}, forceRefresh: true })
        refreshed += 1
        console.log(`[data-freshness] refreshed ${sport}/${dataType}`)
      } catch (e) {
        errors.push(`${sport}/${dataType}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
  }

  return { refreshed, errors }
}
