/**
 * In-memory TTL cache for discovery league results (PROMPT 226).
 * Reduces DB load and speeds up pagination by reusing cached bracket/creator lists.
 */

import type { DiscoveryCard } from "./types"

const TTL_MS = 60 * 1000 // 60 seconds

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const bracketCache = new Map<string, CacheEntry<DiscoveryCard[]>>()
const creatorCache = new Map<string, CacheEntry<DiscoveryCard[]>>()

function now() {
  return Date.now()
}

function getCached<T>(map: Map<string, CacheEntry<T>>, key: string): T | null {
  const entry = map.get(key)
  if (!entry || entry.expiresAt <= now()) {
    if (entry) map.delete(key)
    return null
  }
  return entry.data
}

function setCached<T>(map: Map<string, CacheEntry<T>>, key: string, data: T): void {
  map.set(key, { data, expiresAt: now() + TTL_MS })
}

/** Cache key for bracket leagues: baseUrl + sport + query (query changes DB filter). */
export function getBracketCacheKey(baseUrl: string, sport: string | null, query: string | null): string {
  return `bracket:${baseUrl}:${sport ?? "all"}:${(query ?? "").slice(0, 80)}`
}

/** Cache key for creator leagues: baseUrl + sport (query is applied in-memory after). */
export function getCreatorCacheKey(baseUrl: string, sport: string | null): string {
  return `creator:${baseUrl}:${sport ?? "all"}`
}

export function getCachedBracketCards(
  baseUrl: string,
  sport: string | null,
  query: string | null
): DiscoveryCard[] | null {
  return getCached(bracketCache, getBracketCacheKey(baseUrl, sport, query))
}

export function setCachedBracketCards(
  baseUrl: string,
  sport: string | null,
  query: string | null,
  cards: DiscoveryCard[]
): void {
  bracketCache.set(getBracketCacheKey(baseUrl, sport, query), {
    data: cards,
    expiresAt: now() + TTL_MS,
  })
}

export function getCachedCreatorCards(baseUrl: string, sport: string | null): DiscoveryCard[] | null {
  return getCached(creatorCache, getCreatorCacheKey(baseUrl, sport))
}

export function setCachedCreatorCards(
  baseUrl: string,
  sport: string | null,
  cards: DiscoveryCard[]
): void {
  creatorCache.set(getCreatorCacheKey(baseUrl, sport), {
    data: cards,
    expiresAt: now() + TTL_MS,
  })
}

/** Optional: clear caches (e.g. after league create/update in admin). */
export function clearDiscoveryCache(): void {
  bracketCache.clear()
  creatorCache.clear()
}
