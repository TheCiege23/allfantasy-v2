import 'server-only'

import { prisma } from '@/lib/prisma'
import {
  API_CHAIN_TTLS,
  isRollingInsightsEnabledForSport,
  ttlSecondsForDataType,
  toApiChainSport,
  type ApiChainSport,
  type ApiDataType,
  type ApiFetchParams,
  type ApiProvider,
  type ApiResult,
  type ChainFetchResult,
} from '@/lib/workers/api-config'
import { apiSportsProvider } from '@/lib/workers/providers/api-sports'
import { rollingInsightsProvider } from '@/lib/workers/providers/rolling-insights'
import { persistNormalizedSportsRows } from '@/lib/workers/sports-cache-persist'

function isPopulatedResult(value: unknown): boolean {
  if (value == null) return false
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0
  return true
}

function mergeQuery(params: ApiFetchParams): Record<string, unknown> {
  return { ...(params.query ?? {}), ...(params.options ?? {}) }
}

function toLatency(startedAt: number): number {
  return Math.max(0, Date.now() - startedAt)
}

function extractCachedPayload(raw: unknown): unknown {
  if (raw == null) return null
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'object') {
    const o = raw as Record<string, unknown>
    if (o.data != null && (Array.isArray(o.data) || typeof o.data === 'object')) return o.data
  }
  return raw
}

async function saveToNormalizedTables(sport: string, dataType: string, data: unknown): Promise<void> {
  const chain = toApiChainSport(sport)
  if (!chain) return
  if (dataType !== 'players' && dataType !== 'injuries' && dataType !== 'news') return
  await persistNormalizedSportsRows(chain, dataType as ApiDataType, data)
}

/**
 * DB-first sports fetch: SportsDataCache → Rolling Insights → api-sports fallback.
 * Cache key uses `sport`, `dataType`, and `JSON.stringify(options ?? {})` (query is not part of the key).
 */
export async function fetchWithChain(
  params: ApiFetchParams & { forceRefresh?: boolean }
): Promise<ChainFetchResult> {
  const chainSport = toApiChainSport(params.sport as string)
  if (!chainSport) {
    return { data: null, error: 'Unsupported sport', fromCache: false }
  }

  const { dataType, forceRefresh } = params
  const dt = String(dataType)
  const ttl =
    dt in API_CHAIN_TTLS
      ? API_CHAIN_TTLS[dt as ApiDataType]
      : ttlSecondsForDataType(dt)
  const cacheKey = `${chainSport}:${dt}:${JSON.stringify(params.options ?? {})}`
  const merged = mergeQuery(params)

  // 1. CHECK DB CACHE FIRST (skip if forceRefresh)
  if (!forceRefresh) {
    try {
      const cached = await prisma.sportsDataCache.findFirst({
        where: {
          sport: chainSport,
          dataType: dt,
          cacheKey,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      })
      if (cached?.data != null) {
        const inner = extractCachedPayload(cached.data)
        if (isPopulatedResult(inner)) {
          return {
            data: inner as ChainFetchResult['data'],
            fromCache: true,
            cacheAge: Math.floor((Date.now() - cached.createdAt.getTime()) / 1000),
            source: 'cache',
          }
        }
      }
    } catch (e) {
      console.warn('[api-chain] cache lookup failed:', e)
    }
  }

  // 2. CACHE MISS — Rolling Insights (primary for all 7 sports)
  let result: ChainFetchResult | null = null

  const skipApiSportsFallback = dt === 'scores' || dt === 'live_game' || dt === 'games'

  if (isRollingInsightsEnabledForSport(chainSport)) {
    try {
      const startedRi = Date.now()
      const ri = await rollingInsightsProvider({
        ...params,
        sport: chainSport,
        dataType: dt,
        query: merged,
      })
      if (isPopulatedResult(ri.data)) {
        result = {
          data: ri.data,
          fromCache: false,
          source: 'rolling_insights',
          latency: ri.latency ?? toLatency(startedRi),
          error: ri.error,
        }
      }
    } catch (e) {
      console.warn(`[api-chain] Rolling Insights failed ${chainSport}/${dt}:`, e)
    }
  }

  // 3. FALLBACK to api-sports if RI failed (not for live scores / games)
  if (!isPopulatedResult(result?.data) && !skipApiSportsFallback) {
    try {
      const normalized: ApiFetchParams = { ...params, sport: chainSport, dataType: dt, query: merged }
      const startedAt = Date.now()
      if (apiSportsProvider.supports(normalized)) {
        const data = await apiSportsProvider.fetch(normalized)
        if (isPopulatedResult(data)) {
          result = { data, fromCache: false, source: 'api_sports', latency: toLatency(startedAt) }
        }
      }
    } catch (e) {
      console.warn('[api-chain] api-sports fallback failed:', e)
    }
  }

  if (!result || !isPopulatedResult(result.data)) {
    return { data: null, error: result?.error ?? 'All providers failed', fromCache: false }
  }

  const ok = result

  // 4. SAVE TO SportsDataCache
  const expiresAt = new Date(Date.now() + ttl * 1000)
  try {
    await prisma.sportsDataCache.upsert({
      where: { cacheKey },
      update: { data: ok.data as object, expiresAt, updatedAt: new Date() },
      create: {
        sport: chainSport,
        dataType: dt,
        cacheKey,
        data: ok.data as object,
        expiresAt,
      },
    })
  } catch (e) {
    console.error('[api-chain] cache save failed:', e)
  }

  // 5. ALSO SAVE to normalized tables (SportsPlayer, SportsInjury, SportsNews)
  await saveToNormalizedTables(chainSport, dt, ok.data).catch(() => {})

  return {
    data: ok.data,
    fromCache: false,
    error: ok.error,
    cacheAge: ok.cacheAge,
    source: ok.source,
    latency: ok.latency,
  }
}

export class ApiChain {
  async fetch<T = unknown>(params: {
    sport: ApiFetchParams['sport']
    dataType: ApiDataType | string
    query?: Record<string, unknown>
    options?: Record<string, unknown>
    forceRefresh?: boolean
  }): Promise<ApiResult<T>> {
    const startedAt = Date.now()
    const attemptedSources: ApiProvider['name'][] = []

    const chain = await fetchWithChain({
      sport: params.sport as string,
      dataType: params.dataType,
      query: params.query,
      options: params.options,
      forceRefresh: params.forceRefresh,
    })

    if (chain.fromCache && chain.source === 'cache') {
      return {
        data: chain.data as T,
        source: 'cache',
        latency: 0,
        cached: true,
        attemptedSources,
      }
    }

    if (chain.error && !chain.data) {
      return {
        data: null,
        source: 'cache',
        latency: toLatency(startedAt),
        cached: false,
        attemptedSources,
        error: chain.error,
      }
    }

    const src =
      chain.source === 'rolling_insights'
        ? 'rolling_insights'
        : chain.source === 'api_sports'
          ? 'api_sports'
          : 'cache'

    if (chain.source === 'rolling_insights') attemptedSources.push('rolling_insights')
    if (chain.source === 'api_sports') attemptedSources.push('api_sports')

    return {
      data: chain.data as T,
      source: src as ApiResult<T>['source'],
      latency: chain.latency ?? toLatency(startedAt),
      cached: false,
      attemptedSources,
    }
  }
}

export const apiChain = new ApiChain()
