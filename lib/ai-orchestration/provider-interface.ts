/**
 * Provider abstraction — single interface for OpenAI, DeepSeek, Grok.
 * All keys and secrets are server-side; no provider credentials exposed to frontend.
 */

import type { AIModelRole } from '@/lib/unified-ai/types'
import type { ProviderChatRequest, ProviderChatResult } from './types'

export type { ProviderChatRequest, ProviderChatResult }

/** Implemented by each provider (OpenAI, DeepSeek, Grok). */
export interface IProviderClient {
  readonly role: AIModelRole
  /** Send chat request; returns result with status ok | failed | timeout | invalid_response. */
  chat(request: ProviderChatRequest): Promise<ProviderChatResult>
  /** Whether this provider is configured (has API key / base URL). */
  isAvailable(): boolean
  /** Optional health check (e.g. minimal request or config check). */
  healthCheck?(): Promise<boolean>
}

/** Default timeout when not specified (ms). */
export const DEFAULT_PROVIDER_TIMEOUT_MS = 25_000

/** Default max retries per provider call. */
export const DEFAULT_MAX_RETRIES = 1
