/**
 * Provider registry — resolve provider clients by role, availability checks, no duplicate logic.
 * All providers use same interface; keys remain server-side.
 */

import type { AIModelRole } from '@/lib/unified-ai/types'
import type { IProviderClient } from './provider-interface'
import { createOpenAIProvider } from './providers/openai-provider'
import { createDeepSeekProvider } from './providers/deepseek-provider'
import { createGrokProvider } from './providers/grok-provider'

const ROLES: AIModelRole[] = ['openai', 'deepseek', 'grok']

let _openai: IProviderClient | null = null
let _deepseek: IProviderClient | null = null
let _grok: IProviderClient | null = null

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
