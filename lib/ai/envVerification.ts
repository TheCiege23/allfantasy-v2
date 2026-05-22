/**
 * Server-only: verify which AI provider env vars are present.
 * Returns booleans only — never exposes raw keys or partial values.
 */
import 'server-only'

import {
  isOpenAIAvailable,
  isXaiAvailable,
  isDeepSeekAvailable,
} from '@/lib/provider-config'

export interface ProviderEnvStatus {
  openaiConfigured: boolean
  anthropicConfigured: boolean
  /** xAI / Grok — accepts XAI_API_KEY or GROK_API_KEY */
  xaiConfigured: boolean
  deepseekConfigured: boolean
}

export function verifyProviderEnv(): ProviderEnvStatus {
  return {
    openaiConfigured: isOpenAIAvailable(),
    anthropicConfigured: Boolean(process.env.ANTHROPIC_API_KEY?.trim()),
    xaiConfigured: isXaiAvailable(),
    deepseekConfigured: isDeepSeekAvailable(),
  }
}

/** Returns true if at least one provider is configured. */
export function hasAnyProviderConfigured(): boolean {
  const s = verifyProviderEnv()
  return s.openaiConfigured || s.anthropicConfigured || s.xaiConfigured || s.deepseekConfigured
}
