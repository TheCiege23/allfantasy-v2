import 'server-only'

import { prisma } from '@/lib/prisma'
import {
  API_CHAIN_TTLS,
  apiChainSportToDbSport,
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

function toPositiveInt(value: unknown, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

function toIsoString(value: unknown): string | undefined {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string' && value.trim()) return value
  return undefined
}

type FindManyModel = {
  findMany: (args: Record<string, unknown>) => Promise<Array<Record<string, unknown>>>
}

function getFindManyModel(name: string): FindManyModel | null {
  const container = prisma as unknown as Record<string, unknown>
  const candidate = container[name] as Record<string, unknown> | undefined
  if (!candidate || typeof candidate.findMany !== 'function') return null
  return candidate as unknown as FindManyModel
}

async function readFromNormalizedTables(
  chainSport: ApiChainSport,
  dataType: string,
  mergedQuery: Record<string, unknown>
): Promise<ChainFetchResult | null> {
  const dbSport = apiChainSportToDbSport(chainSport)
  const limit = toPositiveInt(mergedQuery.limit, 200)

  if (dataType === 'players') {
    const model = getFindManyModel('sportsPlayer')
    if (!model) return null

    const nameQ = typeof mergedQuery.playerName === 'string' ? mergedQuery.playerName.trim() : ''
    const teamQ =
      typeof mergedQuery.team === 'string'
        ? mergedQuery.team.trim()
        : typeof mergedQuery.teamAbbr === 'string'
          ? mergedQuery.teamAbbr.trim()
          : ''

    const rows = await model.findMany({
      where: {
        sport: dbSport,
        ...(nameQ ? { name: { contains: nameQ, mode: 'insensitive' } } : {}),
        ...(teamQ ? { team: { equals: teamQ, mode: 'insensitive' } } : {}),
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: limit,
      select: {
        externalId: true,
        name: true,
        position: true,
        team: true,
        teamId: true,
        status: true,
        imageUrl: true,
      },
    })

    if (rows.length > 0) {
      return {
        data: rows.map((r) => ({
          id: r.externalId,
          name: r.name,
          position: r.position,
          team: r.team,
          teamId: r.teamId,
          status: r.status,
          imageUrl: r.imageUrl,
        })),
        fromCache: true,
        source: 'cache',
      }
    }
    return null
  }

  if (dataType === 'teams') {
    const model = getFindManyModel('sportsTeam')
    if (!model) return null

    const rows = await model.findMany({
      where: { sport: dbSport },
      orderBy: [{ updatedAt: 'desc' }],
      take: limit,
      select: {
        externalId: true,
        name: true,
        shortName: true,
        city: true,
        logo: true,
      },
    })

    if (rows.length > 0) {
      return {
        data: rows.map((r) => ({
          id: r.externalId,
          name: r.name,
          abbrv: r.shortName,
          city: r.city,
          logo: r.logo,
        })),
        fromCache: true,
        source: 'cache',
      }
    }
    return null
  }

  if (dataType === 'injuries') {
    const model = getFindManyModel('sportsInjury')
    if (!model) return null

    const rows = await model.findMany({
      where: { sport: dbSport },
      orderBy: [{ date: 'desc' }],
      take: limit,
      select: {
        externalId: true,
        playerId: true,
        playerName: true,
        team: true,
        status: true,
        description: true,
        date: true,
      },
    })

    if (rows.length > 0) {
      return {
        data: rows.map((r) => ({
          externalId: r.externalId,
          playerId: r.playerId,
          playerName: r.playerName,
          team: r.team,
          status: r.status,
          notes: r.description,
          reportDate: toIsoString(r.date),
        })),
        fromCache: true,
        source: 'cache',
      }
    }
    return null
  }

  if (dataType === 'news') {
    const model = getFindManyModel('sportsNews')
    if (!model) return null

    const rows = await model.findMany({
      where: { sport: dbSport },
      orderBy: [{ publishedAt: 'desc' }],
      take: limit,
      select: {
        externalId: true,
        title: true,
        description: true,
        content: true,
        publishedAt: true,
      },
    })

    if (rows.length > 0) {
      return {
        data: rows.map((r) => ({
          id: r.externalId,
          title: r.title,
          description: r.description,
          content: r.content,
          publishedAt: toIsoString(r.publishedAt),
        })),
        fromCache: true,
        source: 'cache',
      }
    }
    return null
  }

  if (
    dataType === 'schedule' ||
    dataType === 'scores' ||
    dataType === 'games' ||
    dataType === 'live_game'
  ) {
    const model = getFindManyModel('sportsGame')
    if (!model) return null

    const seasonNum = Number(mergedQuery.season)
    const rows = await model.findMany({
      where: {
        sport: dbSport,
        ...(Number.isFinite(seasonNum) ? { season: seasonNum } : {}),
      },
      orderBy: [{ startTime: 'desc' }],
      take: limit,
      select: {
        externalId: true,
        homeTeam: true,
        awayTeam: true,
        status: true,
        startTime: true,
        venue: true,
        season: true,
      },
    })

    if (rows.length > 0) {
      return {
        data: rows.map((r) => ({
          id: r.externalId,
          gameId: r.externalId,
          homeTeam: r.homeTeam,
          awayTeam: r.awayTeam,
          status: r.status,
          date: toIsoString(r.startTime),
          venue: r.venue,
          season: r.season,
        })),
        fromCache: true,
        source: 'cache',
      }
    }
    return null
  }

  return null
}

async function saveToNormalizedTables(
  sport: string,
  dataType: string,
  data: unknown,
  source?: string
): Promise<void> {
  const chain = toApiChainSport(sport)
  if (!chain) return
  const persistable = new Set(['players', 'injuries', 'news', 'teams', 'schedule', 'scores'])
  if (!persistable.has(dataType)) return
  await persistNormalizedSportsRows(chain, dataType as ApiDataType, data, source)
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
      const cached = await prisma.sportsDataCache.findUnique({
        where: { cacheKey },
      })
      if (cached?.data != null) {
        if (cached.expiresAt > new Date()) {
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
      }
    } catch (e) {
      console.warn('[api-chain] cache lookup failed:', e)
    }

    try {
      const normalized = await readFromNormalizedTables(chainSport, dt, merged)
      if (normalized && isPopulatedResult(normalized.data)) {
        return {
          ...normalized,
          cacheAge: 0,
        }
      }
    } catch (e) {
      console.warn('[api-chain] normalized lookup failed:', e)
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
      update: { data: ok.data as object, expiresAt },
      create: {
        cacheKey,
        data: ok.data as object,
        expiresAt,
      },
    })
  } catch (e) {
    console.error('[api-chain] cache save failed:', e)
  }

  // 5. ALSO SAVE to normalized tables (SportsPlayer, SportsInjury, SportsNews)
  await saveToNormalizedTables(chainSport, dt, ok.data, ok.source).catch(() => {})

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
