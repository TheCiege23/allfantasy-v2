/**
 * PROMPT 152 — OpenAI adapter: final synthesis, Chimmy, action plans, polished output.
 * Wraps openai-client; keys server-side only. Uses provider-config for availability.
 */

import type { IProviderClient } from '../provider-interface'
import type { ProviderChatRequest, ProviderChatResult } from '../types'
import { getOpenAIConfig } from '@/lib/openai-client'
import { openaiChatText } from '@/lib/openai-client'
import { isOpenAIAvailable } from '@/lib/provider-config'
import { sanitizeProviderError, isMeaningfulText } from '../provider-utils'

const ROLE = 'openai' as const

export function createOpenAIProvider(): IProviderClient {
  return {
    role: ROLE,
    isAvailable(): boolean {
      return isOpenAIAvailable()
    },
    async healthCheck(): Promise<boolean> {
      return isOpenAIAvailable()
    },
    async chat(request: ProviderChatRequest): Promise<ProviderChatResult> {
      const timeoutMs = request.timeoutMs ?? 25_000
      const controller = new AbortController()
      const t = setTimeout(() => controller.abort(), timeoutMs)
      try {
        const result = await openaiChatText({
          messages: request.messages,
          temperature: request.temperature ?? 0.5,
          maxTokens: request.maxTokens ?? 1500,
        })
        clearTimeout(t)
        if (result.ok) {
          const text = result.text ?? ''
          const valid = isMeaningfulText(text)
          return {
            text: valid ? text : '',
            model: result.model,
            provider: ROLE,
            status: valid ? 'ok' : 'invalid_response',
            ...(valid ? {} : { error: sanitizeProviderError('Empty or invalid response') }),
          }
        }
        const isTimeout = result.details?.toLowerCase().includes('timeout') || result.details?.toLowerCase().includes('abort')
        return {
          text: '',
          model: result.model,
          provider: ROLE,
          error: sanitizeProviderError(result.details),
          status: result.status === 429 ? 'failed' : isTimeout ? 'timeout' : 'failed',
        }
      } catch (e: unknown) {
        clearTimeout(t)
        const msg = e instanceof Error ? e.message : String(e)
        const isTimeout = msg.toLowerCase().includes('timeout') || msg.toLowerCase().includes('abort')
        return {
          text: '',
          model: '',
          provider: ROLE,
          error: sanitizeProviderError(msg),
          timedOut: isTimeout,
          status: isTimeout ? 'timeout' : 'failed',
        }
      }
    },
  }
}

/** Alias for PROMPT 152 adapter naming. */
export const createOpenAIAdapter = createOpenAIProvider
