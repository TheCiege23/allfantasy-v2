/**
 * PROMPT 152 — xAI (Grok) adapter: trend framing, narrative/social framing, engagement-style summaries.
 * Wraps xai-client; keys server-side only. Uses provider-config for availability. Role = grok for registry.
 */

import type { IProviderClient } from '../provider-interface'
import type { ProviderChatRequest, ProviderChatResult } from '../types'
import { xaiChatJson, parseTextFromXaiChatCompletion, parseUsage } from '@/lib/xai-client'
import { getXaiConfigFromEnv } from '@/lib/provider-config'
import { isXaiAvailable } from '@/lib/provider-config'
import { sanitizeProviderError, isMeaningfulText } from '../provider-utils'

const ROLE = 'grok' as const

const DEFAULT_XAI_MODEL = 'grok-2-latest'

function getModelName(): string {
  const cfg = getXaiConfigFromEnv()
  return cfg?.model ?? DEFAULT_XAI_MODEL
}

export function createGrokProvider(): IProviderClient {
  return {
    role: ROLE,
    isAvailable(): boolean {
      return isXaiAvailable()
    },
    async healthCheck(): Promise<boolean> {
      return isXaiAvailable()
    },
    async chat(request: ProviderChatRequest): Promise<ProviderChatResult> {
      const timeoutMs = request.timeoutMs ?? 25_000
      const controller = new AbortController()
      const t = setTimeout(() => controller.abort(), timeoutMs)
      try {
        const result = await xaiChatJson({
          messages: request.messages,
          temperature: request.temperature ?? 0.4,
          maxTokens: request.maxTokens ?? 1000,
        })
        clearTimeout(t)
        if (!result.ok) {
          const isTimeout = result.details?.toLowerCase().includes('timeout') || result.details?.toLowerCase().includes('abort')
          return {
            text: '',
            model: getModelName(),
            provider: ROLE,
            error: sanitizeProviderError(result.details),
            timedOut: isTimeout,
            status: result.status === 429 ? 'failed' : isTimeout ? 'timeout' : 'failed',
          }
        }
        const text = parseTextFromXaiChatCompletion(result.json) ?? ''
        const usage = parseUsage(result.json)
        const valid = isMeaningfulText(text)
        return {
          text: valid ? text : '',
          model: (result.json as { model?: string })?.model ?? getModelName(),
          provider: ROLE,
          tokensPrompt: usage?.prompt_tokens,
          tokensCompletion: usage?.completion_tokens,
          status: valid ? 'ok' : 'invalid_response',
          ...(valid ? {} : { error: sanitizeProviderError('Empty or invalid response') }),
        }
      } catch (e: unknown) {
        clearTimeout(t)
        const msg = e instanceof Error ? e.message : String(e)
        const isTimeout = msg.toLowerCase().includes('timeout') || msg.toLowerCase().includes('abort')
        return {
          text: '',
          model: getModelName(),
          provider: ROLE,
          error: sanitizeProviderError(msg),
          timedOut: isTimeout,
          status: isTimeout ? 'timeout' : 'failed',
        }
      }
    },
  }
}

/** Alias for PROMPT 152 adapter naming (xAI = Grok). */
export const createXAIAdapter = createGrokProvider
