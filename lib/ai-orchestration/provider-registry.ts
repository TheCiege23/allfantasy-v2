/**
 * Provider registry — resolve provider clients by role, availability checks, no duplicate logic.
 * All providers use same interface; keys remain server-side.
 */

import type { AIModelRole } from '@/lib/unified-ai/types'
import type { IProviderClient } from './provider-interface'
import type { ProviderHealthEntry } from './types'
import { createOpenAIProvider } from './providers/openai-provider'
import { createDeepSeekProvider } from './providers/deepseek-provider'
import { createGrokProvider } from './providers/grok-provider'

const ROLES: AIModelRole[] = ['openai', 'deepseek', 'grok']

let _openai: IProviderClient | null = null
let _deepseek: IProviderClient | null = null
let _grok: IProviderClient | null = null

function getHealthCheckTimeoutMs(): number {
  const raw = process.env.AI_PROVIDER_HEALTHCHECK_TIMEOUT_MS
  if (raw == null || raw === '') return 2_500
  const parsed = parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 2_500
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Health check timeout after ${timeoutMs}ms`)), timeoutMs)
    promise
      .then((value) => {
        clearTimeout(timer)
        resolve(value)
      })
      .catch((error) => {
        clearTimeout(timer)
        reject(error)
      })
  })
}

function getOpenAI(): IProviderClient {
  if (!_openai) _openai = createOpenAIProvider()
  return _openai
}

function getDeepSeek(): IProviderClient {
  if (!_deepseek) _deepseek = createDeepSeekProvider()
  return _deepseek
}

function getGrok(): IProviderClient {
  if (!_grok) _grok = createGrokProvider()
  return _grok
}

/**
 * Get provider client for a given role. Returns client even if not configured (isAvailable may be false).
 */
export function getProvider(role: AIModelRole): IProviderClient {
  switch (role) {
    case 'openai':
      return getOpenAI()
    case 'deepseek':
      return getDeepSeek()
    case 'grok':
      return getGrok()
    default:
      return getOpenAI()
  }
}

/**
 * Get all providers that are configured (have keys). Used to decide which models to call and for fallback.
 */
export function getAvailableProviders(): AIModelRole[] {
  return ROLES.filter((r) => getProvider(r).isAvailable())
}

/**
 * Get providers that are both requested (in roles) and available. No dead provider states.
 */
export function getAvailableFromRequested(roles: AIModelRole[]): AIModelRole[] {
  const available = new Set(getAvailableProviders())
  return roles.filter((r) => available.has(r))
}

/**
 * Provider availability check for health/status. Returns map of role -> available.
 */
export function checkProviderAvailability(): Record<AIModelRole, boolean> {
  return {
    openai: getOpenAI().isAvailable(),
    deepseek: getDeepSeek().isAvailable(),
    grok: getGrok().isAvailable(),
  }
}

async function checkOneProviderHealth(role: AIModelRole): Promise<ProviderHealthEntry> {
  const provider = getProvider(role)
  const configured = provider.isAvailable()
  const checkedAt = new Date().toISOString()
  if (!configured) {
    return {
      provider: role,
      configured: false,
      healthy: false,
      checkedAt,
      error: 'Provider is not configured.',
    }
  }

  const start = Date.now()
  try {
    const timeoutMs = getHealthCheckTimeoutMs()
    const healthy = provider.healthCheck
      ? await withTimeout(provider.healthCheck(), timeoutMs)
      : true
    return {
      provider: role,
      configured: true,
      healthy: Boolean(healthy),
      checkedAt,
      latencyMs: Date.now() - start,
      ...(healthy ? {} : { error: 'Provider health check returned unhealthy.' }),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      provider: role,
      configured: true,
      healthy: false,
      checkedAt,
      latencyMs: Date.now() - start,
      error: message.slice(0, 240),
    }
  }
}

/**
 * Active provider health checks (config + lightweight health probe where available).
 */
export async function checkProviderHealth(): Promise<Record<AIModelRole, ProviderHealthEntry>> {
  const [openai, deepseek, grok] = await Promise.all([
    checkOneProviderHealth('openai'),
    checkOneProviderHealth('deepseek'),
    checkOneProviderHealth('grok'),
  ])
  return { openai, deepseek, grok }
}
