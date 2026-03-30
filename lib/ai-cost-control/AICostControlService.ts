import { openaiChatText } from '@/lib/openai-client'
import { createHash } from 'crypto'

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

type CachedTextEntry = {
  text: string
  model: string
  baseUrl: string
  expiresAt: number
}

const RESPONSE_CACHE = new Map<string, CachedTextEntry>()
const IN_FLIGHT = new Map<string, Promise<CostControlledTextResult>>()
const LAST_CALL_AT = new Map<string, number>()

const MAX_CACHE_ENTRIES = 1000
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000
const DEFAULT_REPEAT_COOLDOWN_MS = 12 * 1000

export interface CostControlledOpenAITextInput {
  feature: string
  messages: ChatMessage[]
  model?: string
  temperature?: number
  maxTokens?: number
  enableAI?: boolean
  fallbackText?: string | null
  cacheTtlMs?: number
  repeatCooldownMs?: number
  cacheContext?: unknown
}

export interface CostControlledTextResult {
  ok: boolean
  text: string | null
  model: string
  baseUrl: string
  source: 'ai' | 'cache' | 'deterministic'
  reason:
    | 'ai_success'
    | 'cache_hit'
    | 'cooldown_active'
    | 'ai_disabled_deterministic'
    | 'ai_provider_error'
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map((item) => stableSerialize(item)).join(',')}]`
  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj).sort()
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableSerialize(obj[key])}`).join(',')}}`
}

function pruneCache(now: number) {
  for (const [key, entry] of RESPONSE_CACHE.entries()) {
    if (entry.expiresAt <= now) RESPONSE_CACHE.delete(key)
  }
  if (RESPONSE_CACHE.size <= MAX_CACHE_ENTRIES) return
  const entries = [...RESPONSE_CACHE.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt)
  for (const [key] of entries.slice(0, RESPONSE_CACHE.size - MAX_CACHE_ENTRIES)) {
    RESPONSE_CACHE.delete(key)
  }
}

function buildKey(input: CostControlledOpenAITextInput): string {
  const payload = {
    feature: input.feature,
    model: input.model ?? '',
    temperature: input.temperature ?? null,
    maxTokens: input.maxTokens ?? null,
    messages: input.messages,
    cacheContext: input.cacheContext ?? null,
  }
  const digest = createHash('sha256').update(stableSerialize(payload)).digest('hex').slice(0, 32)
  return `ai-cost:${input.feature}:${digest}`
}

/**
 * PROMPT 247 — AI Cost Control
 * - deterministic-first gate
 * - cache repeated responses
 * - throttle duplicate calls over short windows
 */
export async function runCostControlledOpenAIText(
  input: CostControlledOpenAITextInput
): Promise<CostControlledTextResult> {
  const fallbackText = input.fallbackText ?? null
  if (!input.enableAI) {
    return {
      ok: false,
      text: fallbackText,
      model: 'deterministic',
      baseUrl: '',
      source: 'deterministic',
      reason: 'ai_disabled_deterministic',
    }
  }

  const now = Date.now()
  pruneCache(now)
  const key = buildKey(input)
  const ttlMs = Math.max(5_000, input.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS)
  const cooldownMs = Math.max(0, input.repeatCooldownMs ?? DEFAULT_REPEAT_COOLDOWN_MS)

  const cached = RESPONSE_CACHE.get(key)
  if (cached && cached.expiresAt > now) {
    return {
      ok: true,
      text: cached.text,
      model: cached.model,
      baseUrl: cached.baseUrl,
      source: 'cache',
      reason: 'cache_hit',
    }
  }

  const lastCallAt = LAST_CALL_AT.get(key) ?? 0
  if (cooldownMs > 0 && now - lastCallAt < cooldownMs) {
    return {
      ok: false,
      text: fallbackText,
      model: 'deterministic',
      baseUrl: '',
      source: 'deterministic',
      reason: 'cooldown_active',
    }
  }

  const existingInFlight = IN_FLIGHT.get(key)
  if (existingInFlight) return existingInFlight

  LAST_CALL_AT.set(key, now)
  const requestPromise = (async (): Promise<CostControlledTextResult> => {
    const ai = await openaiChatText({
      messages: input.messages,
      model: input.model,
      temperature: input.temperature,
      maxTokens: input.maxTokens,
    })

    if (!ai.ok || !ai.text.trim()) {
      return {
        ok: false,
        text: fallbackText,
        model: ai.model,
        baseUrl: ai.baseUrl,
        source: 'deterministic',
        reason: 'ai_provider_error',
      }
    }

    const text = ai.text.trim()
    RESPONSE_CACHE.set(key, {
      text,
      model: ai.model,
      baseUrl: ai.baseUrl,
      expiresAt: Date.now() + ttlMs,
    })
    return {
      ok: true,
      text,
      model: ai.model,
      baseUrl: ai.baseUrl,
      source: 'ai',
      reason: 'ai_success',
    }
  })()

  IN_FLIGHT.set(key, requestPromise)
  try {
    return await requestPromise
  } finally {
    IN_FLIGHT.delete(key)
  }
}

export function clearAICostControlStateForTests() {
  RESPONSE_CACHE.clear()
  IN_FLIGHT.clear()
  LAST_CALL_AT.clear()
}
