import 'server-only'

import { prisma } from '@/lib/prisma'
import { normalizeToSupportedSport } from '@/lib/sport-scope'
import {
  API_CHAIN_TTLS,
  isImageDataType,
  isRollingInsightsEnabledForSport,
  type ApiDataType,
  type ApiFetchParams,
  type ApiProvider,
  type ApiResult,
  type ApiChainSport,
} from '@/lib/workers/api-config'
import { rateLimitManager } from '@/lib/workers/rate-limit-manager'
import { apiSportsProvider } from '@/lib/workers/providers/api-sports'
import { cfbdProvider } from '@/lib/workers/providers/cfbd'
import { clearSportsProvider } from '@/lib/workers/providers/clearsports'
import { rollingInsightsProvider } from '@/lib/workers/providers/rolling-insights'
import { theSportsDbProvider } from '@/lib/workers/providers/thesportsdb'

const CACHE_PREFIX = 'api-chain'

function stableStringify(value: unknown): string {
  if (value == null) return 'null'
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`
  if (typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${key}:${stableStringify(entry)}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

function isPopulatedResult(value: unknown): boolean {
  if (value == null) return false
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0
  return true
}

function cacheKey(params: ApiFetchParams): string {
  return `${CACHE_PREFIX}:${params.sport}:${params.dataType}:${stableStringify(params.query ?? {})}`
}

function toLatency(startedAt: number): number {
  return Math.max(0, Date.now() - startedAt)
}

export class ApiChain {
  async fetch<T = unknown>(params: {
    sport: ApiChainSport
    dataType: ApiDataType
    query?: Record<string, unknown>
  }): Promise<ApiResult<T>> {
    const normalized: ApiFetchParams = {
      sport: normalizeToSupportedSport(params.sport),
      dataType: params.dataType,
      query: params.query ?? {},
    }

    const chain = this.buildChain(normalized.sport, normalized.dataType)
    const attemptedSources: ApiProvider['name'][] = []

    for (const provider of chain) {
      if (!provider.supports(normalized)) continue
      attemptedSources.push(provider.name)

      const canCall = await rateLimitManager.canCall(provider.name, normalized.dataType)
      if (!canCall) {
        console.log(`[ApiChain] Rate limit hit for ${provider.name}, trying next provider`)
        continue
      }

      const startedAt = Date.now()
      try {
        const result = await provider.fetch(normalized)
        const latency = toLatency(startedAt)

        if (!isPopulatedResult(result)) {
          await this.logCall(provider.name, normalized.dataType, 204, latency)
          continue
        }

        await this.logCall(provider.name, normalized.dataType, 200, latency)
        await this.cacheResult(provider.name, normalized, result)

        return {
          data: result as T,
          source: provider.name,
          latency,
          attemptedSources,
          cached: false,
        }
      } catch (error) {
        await this.logCall(
          provider.name,
          normalized.dataType,
          500,
          toLatency(startedAt),
          error instanceof Error ? error.message : String(error)
        )
        console.warn(`[ApiChain] ${provider.name} failed for ${normalized.dataType}`, {
          sport: normalized.sport,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    const cached = await this.getCachedResult<T>(normalized)
    if (cached) {
      return {
        ...cached,
        attemptedSources,
      }
    }

    return {
      data: null,
      source: 'cache',
      latency: 0,
      attemptedSources,
      cached: true,
    }
  }

  buildChain(sport: ApiChainSport, dataType: ApiDataType): ApiProvider[] {
    const chain: ApiProvider[] = []

    if (isRollingInsightsEnabledForSport(sport)) {
      chain.push(rollingInsightsProvider)
    }

    if (isImageDataType(dataType)) {
      chain.push(theSportsDbProvider, clearSportsProvider, apiSportsProvider)
    } else {
      chain.push(clearSportsProvider, apiSportsProvider, theSportsDbProvider)
    }

    if (sport === 'NCAAF') {
      chain.push(cfbdProvider)
    }

    return chain
  }

  private async logCall(
    provider: ApiProvider['name'],
    endpoint: ApiDataType,
    status: number,
    latencyMs: number,
    error?: string
  ): Promise<void> {
    await rateLimitManager.recordCall(provider, endpoint, status, latencyMs, {
      error,
      cached: false,
    })
  }

  private async cacheResult(
    provider: ApiProvider['name'],
    params: ApiFetchParams,
    result: unknown
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + API_CHAIN_TTLS[params.dataType])
    const key = cacheKey(params)

    await prisma.sportsDataCache.upsert({
      where: { key },
      update: {
        data: {
          provider,
          data: result,
          sport: params.sport,
          dataType: params.dataType,
          query: params.query ?? {},
          cachedAt: new Date().toISOString(),
        },
        expiresAt,
      },
      create: {
        key,
        data: {
          provider,
          data: result,
          sport: params.sport,
          dataType: params.dataType,
          query: params.query ?? {},
          cachedAt: new Date().toISOString(),
        },
        expiresAt,
      },
    }).catch(() => {})
  }

  private async getCachedResult<T>(params: ApiFetchParams): Promise<ApiResult<T> | null> {
    const cached = await prisma.sportsDataCache.findUnique({
      where: { key: cacheKey(params) },
    }).catch(() => null)

    if (!cached) return null

    const payload = (cached.data ?? {}) as Record<string, unknown>
    const data = (payload.data ?? cached.data) as T | null
    if (!isPopulatedResult(data)) return null

    return {
      data,
      source:
        typeof payload.provider === 'string'
          ? (payload.provider as ApiProvider['name'])
          : 'cache',
      latency: 0,
      cached: true,
    }
  }
}

export const apiChain = new ApiChain()
