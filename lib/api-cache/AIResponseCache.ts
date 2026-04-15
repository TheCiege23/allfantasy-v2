/**
 * AI Response Cache Layer
 *
 * Caches AI-generated responses to avoid redundant LLM calls.
 * Identical prompts with the same context produce the same response
 * from cache instead of hitting OpenAI/Anthropic/Grok again.
 *
 * Cache strategy:
 * - Hash the prompt + context → cache key
 * - Check DB for existing response within TTL
 * - If fresh, return cached response (zero API cost)
 * - If stale, call LLM and cache the result
 * - Deduplicate concurrent identical requests
 *
 * TTLs by type:
 * - Player analysis: 6 hours (changes rarely)
 * - Trade evaluation: 1 hour (depends on roster state)
 * - Power rankings: 4 hours (weekly refresh)
 * - Draft recommendations: 30 min (changes during draft)
 * - Weekly recap: 24 hours (once per week)
 * - General chat: 15 min (conversational)
 * - Lineup advice: 2 hours (changes near game time)
 */

import { prisma } from '@/lib/prisma'
import { createHash } from 'crypto'

type AIProvider = 'openai' | 'anthropic' | 'grok' | 'deepseek'

type AICacheConfig = {
  ttlMs: number
  maxTokensSaved: number
  provider: AIProvider
}

const TTL_BY_TYPE: Record<string, number> = {
  player_analysis: 6 * 60 * 60 * 1000,
  trade_evaluation: 60 * 60 * 1000,
  power_rankings: 4 * 60 * 60 * 1000,
  draft_recommendation: 30 * 60 * 1000,
  weekly_recap: 24 * 60 * 60 * 1000,
  lineup_advice: 2 * 60 * 60 * 1000,
  waiver_advice: 2 * 60 * 60 * 1000,
  general_chat: 15 * 60 * 1000,
  matchup_preview: 4 * 60 * 60 * 1000,
  dynasty_outlook: 12 * 60 * 60 * 1000,
  rules_explanation: 24 * 60 * 60 * 1000,
  commissioner_summary: 4 * 60 * 60 * 1000,
}

// In-memory hot cache
const memCache = new Map<string, { response: string; cachedAt: number; ttlMs: number }>()
const MAX_MEM_ENTRIES = 200

// Inflight dedup
const inflight = new Map<string, Promise<string>>()

/**
 * Generate a deterministic cache key from prompt + context.
 */
function generateCacheKey(
  prompt: string,
  context: Record<string, unknown>,
  responseType: string,
): string {
  const payload = JSON.stringify({ prompt: prompt.trim(), context, responseType })
  const hash = createHash('sha256').update(payload).digest('hex').slice(0, 32)
  return `ai:${responseType}:${hash}`
}

/**
 * Get a cached AI response, or execute the generation function and cache the result.
 *
 * @param prompt - The user prompt
 * @param context - Deterministic context (league settings, roster state, etc.)
 * @param responseType - Type of response (determines TTL)
 * @param generateFn - Function that calls the LLM (only called if cache miss)
 * @returns The AI response string
 */
export async function getCachedAIResponse(
  prompt: string,
  context: Record<string, unknown>,
  responseType: string,
  generateFn: () => Promise<string>,
): Promise<{ response: string; fromCache: boolean; cacheKey: string }> {
  const cacheKey = generateCacheKey(prompt, context, responseType)
  const ttlMs = TTL_BY_TYPE[responseType] ?? TTL_BY_TYPE.general_chat

  // 1. Check memory cache
  const memEntry = memCache.get(cacheKey)
  if (memEntry && Date.now() - memEntry.cachedAt < memEntry.ttlMs) {
    return { response: memEntry.response, fromCache: true, cacheKey }
  }

  // 2. Check DB cache
  const dbEntry = await prisma.aIInsight?.findFirst?.({
    where: { id: cacheKey },
    select: { data: true, createdAt: true },
  }).catch(() => null)

  if (dbEntry?.createdAt && Date.now() - dbEntry.createdAt.getTime() < ttlMs) {
    const content = dbEntry.data as { response?: string } | null
    if (content?.response) {
      setMemCache(cacheKey, content.response, ttlMs)
      return { response: content.response, fromCache: true, cacheKey }
    }
  }

  // 3. Deduplicate concurrent identical requests
  const existing = inflight.get(cacheKey)
  if (existing) {
    const response = await existing
    return { response, fromCache: false, cacheKey }
  }

  // 4. Call LLM
  const promise = generateFn().then(async (response) => {
    // Persist to DB
    await prisma.aIInsight?.create?.({
      data: {
        id: cacheKey,
        userId: (context.userId as string) ?? 'system',
        leagueId: (context.leagueId as string) ?? null,
        insightType: responseType,
        category: 'ai_cache',
        title: responseType,
        body: prompt.slice(0, 200),
        data: { response, prompt: prompt.slice(0, 200), generatedAt: new Date().toISOString() },
      },
    }).catch(() => {})

    setMemCache(cacheKey, response, ttlMs)
    inflight.delete(cacheKey)
    return response
  }).catch((err) => {
    inflight.delete(cacheKey)
    // Return stale cache on failure
    if (memEntry) return memEntry.response
    throw err
  })

  inflight.set(cacheKey, promise)
  const response = await promise
  return { response, fromCache: false, cacheKey }
}

function setMemCache(key: string, response: string, ttlMs: number): void {
  if (memCache.size > MAX_MEM_ENTRIES) {
    const oldest = [...memCache.entries()]
      .sort((a, b) => a[1].cachedAt - b[1].cachedAt)
      .slice(0, 30)
    for (const [k] of oldest) memCache.delete(k)
  }
  memCache.set(key, { response, cachedAt: Date.now(), ttlMs })
}

/**
 * Invalidate cached AI responses for a specific context.
 */
export async function invalidateAICache(responseType: string, leagueId?: string): Promise<void> {
  // Clear memory cache for this type
  for (const [key] of memCache) {
    if (key.startsWith(`ai:${responseType}:`)) memCache.delete(key)
  }

  // Clear DB cache
  if (leagueId) {
    await prisma.aIInsight?.deleteMany?.({
      where: { insightType: responseType, leagueId },
    }).catch(() => {})
  }
}

/**
 * Get cache hit/miss stats for monitoring.
 */
export function getAICacheStats(): {
  memoryCacheSize: number
  inflightCount: number
} {
  return {
    memoryCacheSize: memCache.size,
    inflightCount: inflight.size,
  }
}
