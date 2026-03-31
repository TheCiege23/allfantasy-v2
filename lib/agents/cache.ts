import 'server-only'

import { createHash } from 'node:crypto'

import { getRedisClient } from '@/lib/queues/bullmq'
import type { SupportedSport } from '@/lib/sport-scope'

export type AgentCacheTier = '24h' | '1h' | '5m' | 'never'

export interface AgentCacheAddress {
  tier: AgentCacheTier
  sport: SupportedSport | 'GLOBAL'
  dataType: string
  identifier: string
}

export interface AgentCacheEntry<T> {
  value: T
  createdAt: string
  expiresAt: string
  source: 'redis' | 'memory'
}

const MAX_MEMORY_ENTRIES = 400
const memoryCache = new Map<string, AgentCacheEntry<unknown>>()

const TTL_MS: Record<Exclude<AgentCacheTier, 'never'>, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '5m': 5 * 60 * 1000,
}

const STATIC_TYPES = new Set([
  'adp',
  'season_stats',
  'draft_order',
  'pick_values',
  'historical_trade_values',
  'schedule',
])

const SEMI_STATIC_TYPES = new Set([
  'power_rankings',
  'waiver_availability',
  'injury',
  'depth_chart',
  'weather',
])

const DYNAMIC_TYPES = new Set([
  'live_scores',
  'injury_live',
  'breaking_news',
  'waiver_results',
  'provider_health',
  'system_health',
])

function normalizeSegment(value: string): string {
  return value.trim().replace(/[^A-Za-z0-9:_-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'unknown'
}

function createStableHash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16)
}

function getTtlMs(tier: AgentCacheTier): number {
  if (tier === 'never') return 0
  return TTL_MS[tier]
}

function pruneMemoryCache(now = Date.now()) {
  for (const [key, entry] of memoryCache.entries()) {
    if (new Date(entry.expiresAt).getTime() <= now) {
      memoryCache.delete(key)
    }
  }

  while (memoryCache.size > MAX_MEMORY_ENTRIES) {
    const firstKey = memoryCache.keys().next().value
    if (!firstKey) break
    memoryCache.delete(firstKey)
  }
}

export function buildAgentCacheKey(address: AgentCacheAddress): string {
  return [
    'af',
    'cache',
    normalizeSegment(address.tier),
    normalizeSegment(address.sport),
    normalizeSegment(address.dataType),
    normalizeSegment(address.identifier),
  ].join(':')
}

export function resolveAgentCacheTier(args: {
  dataType: string
  personalized?: boolean
  live?: boolean
  userScoped?: boolean
}): AgentCacheTier {
  if (args.personalized || args.live || args.userScoped) return 'never'

  const dataType = normalizeSegment(args.dataType).toLowerCase()
  if (STATIC_TYPES.has(dataType)) return '24h'
  if (SEMI_STATIC_TYPES.has(dataType)) return '1h'
  if (DYNAMIC_TYPES.has(dataType)) return '5m'
  return '1h'
}

export function buildHashedIdentifier(parts: Record<string, unknown>): string {
  return createStableHash(parts)
}

export async function readAgentCache<T>(address: AgentCacheAddress): Promise<AgentCacheEntry<T> | null> {
  if (address.tier === 'never') return null

  const key = buildAgentCacheKey(address)
  const redis = getRedisClient()
  if (redis) {
    try {
      const raw = await redis.get(key)
      if (!raw) return null
      const parsed = JSON.parse(raw) as AgentCacheEntry<T>
      if (new Date(parsed.expiresAt).getTime() <= Date.now()) {
        await redis.del(key).catch(() => {})
        return null
      }
      return { ...parsed, source: 'redis' }
    } catch {
      // Fall through to memory cache when Redis is unavailable.
    }
  }

  pruneMemoryCache()
  const entry = memoryCache.get(key) as AgentCacheEntry<T> | undefined
  if (!entry) return null
  if (new Date(entry.expiresAt).getTime() <= Date.now()) {
    memoryCache.delete(key)
    return null
  }
  return { ...entry, source: 'memory' }
}

export async function writeAgentCache<T>(
  address: AgentCacheAddress,
  value: T,
  opts?: { ttlMs?: number }
): Promise<AgentCacheEntry<T> | null> {
  if (address.tier === 'never') return null

  const ttlMs = opts?.ttlMs ?? getTtlMs(address.tier)
  if (ttlMs <= 0) return null

  const now = Date.now()
  const entry: AgentCacheEntry<T> = {
    value,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttlMs).toISOString(),
    source: 'memory',
  }

  const key = buildAgentCacheKey(address)
  const redis = getRedisClient()
  if (redis) {
    try {
      await redis.set(key, JSON.stringify(entry), 'PX', ttlMs)
      return { ...entry, source: 'redis' }
    } catch {
      // Fall through to in-memory cache when Redis write fails.
    }
  }

  pruneMemoryCache(now)
  memoryCache.set(key, entry)
  pruneMemoryCache(now)
  return entry
}

export async function withAgentCache<T>(
  address: AgentCacheAddress,
  loader: () => Promise<T>,
  opts?: { ttlMs?: number }
): Promise<{ value: T; cacheHit: boolean; cacheKey: string }> {
  const cacheKey = buildAgentCacheKey(address)
  const cached = await readAgentCache<T>(address)
  if (cached) {
    return { value: cached.value, cacheHit: true, cacheKey }
  }

  const value = await loader()
  await writeAgentCache(address, value, opts)
  return { value, cacheHit: false, cacheKey }
}

export async function extendAgentCacheTtl(address: AgentCacheAddress, ttlMs: number): Promise<void> {
  if (address.tier === 'never' || ttlMs <= 0) return

  const existing = await readAgentCache(address)
  if (!existing) return
  await writeAgentCache(address, existing.value, { ttlMs })
}
