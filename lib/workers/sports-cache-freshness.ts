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

/**
 * Proactively refresh cache entries that expire within the next `withinMinutes`.
 */
export async function runSportsDataFreshnessSweep(options?: { withinMinutes?: number }): Promise<{
  refreshed: number
  errors: string[]
}> {
  const withinMinutes = options?.withinMinutes ?? 5
  const horizon = new Date(Date.now() + withinMinutes * 60 * 1000)
  const errors: string[] = []
  let refreshed = 0

  for (const sport of [...SUPPORTED_SPORTS] as ApiChainSport[]) {
    for (const dataType of SWEEP_TYPES) {
      try {
        const stale = await prisma.sportsDataCache.findFirst({
          where: {
            sport,
            dataType,
            expiresAt: { lt: horizon },
          },
          orderBy: { expiresAt: 'asc' },
        })
        if (!stale) continue

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
