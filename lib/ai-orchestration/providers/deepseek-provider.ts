/**
 * PROMPT 152 — DeepSeek adapter: structured analytical reasoning, deterministic interpretation, matrix/scoring review.
 * Wraps deepseek-client; keys server-side only. Uses provider-config for availability.
 */

import type { IProviderClient } from '../provider-interface'
import type { ProviderChatRequest, ProviderChatResult } from '../types'
import { deepseekChat } from '@/lib/deepseek-client'
import { isDeepSeekAvailable } from '@/lib/provider-config'
import { sanitizeProviderError, isMeaningfulText } from '../provider-utils'

const ROLE = 'deepseek' as const

export function createDeepSeekProvider(): IProviderClient {
  return {
    role: ROLE,
    isAvailable(): boolean {
      return isDeepSeekAvailable()
    },
    async healthCheck(): Promise<boolean> {
      return isDeepSeekAvailable()
    },
    async chat(request: ProviderChatRequest): Promise<ProviderChatResult> {
      const timeoutMs = request.timeoutMs ?? 25_000
      const controller = new AbortController()
      const t = setTimeout(() => controller.abort(), timeoutMs)
      try {
        const system = request.messages.find((m) => m.role === 'system')?.content ?? 'You are a quantitative fantasy sports analyst.'
        const user = (request.messages.filter((m) => m.role === 'user' || m.role === 'assistant').map((m) => `${m.role}: ${m.content}`).join('\n\n') || request.messages[request.messages.length - 1]?.content) ?? ''
        const result = await deepseekChat({
          prompt: user,
          systemPrompt: system,
          temperature: request.temperature ?? 0.2,
          maxTokens: request.maxTokens ?? 1000,
        })
        clearTimeout(t)
        if (result.error) {
          const isTimeout = result.error.toLowerCase().includes('timeout') || result.error.toLowerCase().includes('abort')
          return {
            text: '',
            model: 'deepseek-chat',
            provider: ROLE,
            error: sanitizeProviderError(result.error),
            timedOut: isTimeout,
            tokensPrompt: result.usage?.promptTokens,
            tokensCompletion: result.usage?.completionTokens,
            status: isTimeout ? 'timeout' : 'failed',
          }
        }
        const text = result.content ?? ''
        const valid = isMeaningfulText(text)
        return {
          text: valid ? text : '',
          model: 'deepseek-chat',
          provider: ROLE,
          tokensPrompt: result.usage?.promptTokens,
          tokensCompletion: result.usage?.completionTokens,
          status: valid ? 'ok' : 'invalid_response',
          ...(valid ? {} : { error: sanitizeProviderError('Empty or invalid response') }),
        }
      } catch (e: unknown) {
        clearTimeout(t)
        const msg = e instanceof Error ? e.message : String(e)
        const isTimeout = msg.toLowerCase().includes('timeout') || msg.toLowerCase().includes('abort')
        return {
          text: '',
          model: 'deepseek-chat',
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
export const createDeepSeekAdapter = createDeepSeekProvider
