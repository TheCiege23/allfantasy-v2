/**
 * PROMPT 152 — Shared provider adapter utilities.
 * Sanitize errors (no secrets in logs or responses); normalize malformed output.
 */

import type { AIModelRole } from '@/lib/unified-ai/types'
import type { ProviderChatResult } from './types'

/** Redact potential secret patterns from error messages. Never log or return raw API keys. */
export function sanitizeProviderError(message: string | undefined): string {
  if (message == null || typeof message !== 'string') return 'Provider error'
  const s = message.slice(0, 500).trim()
  if (!s) return 'Provider error'
  // Redact patterns that might look like keys/tokens
  const redacted = s
    .replace(/\b(sk-[a-zA-Z0-9-_]{20,})/gi, '[REDACTED]')
    .replace(/\b(api[_-]?key|apikey)\s*[:=]\s*["']?[^"'\s]+/gi, 'api_key=[REDACTED]')
  return redacted || 'Provider error'
}

/** Treat empty or whitespace-only text as invalid for synthesis. */
export function isMeaningfulText(text: string | undefined): boolean {
  return typeof text === 'string' && text.trim().length > 0
}

/** Normalize provider failure into status enum used by orchestration metadata. */
export function normalizeProviderFailureStatus(input: {
  statusCode?: number
  message?: string
}): ProviderChatResult['status'] {
  const statusCode = input.statusCode ?? 0
  const message = String(input.message ?? '').toLowerCase()
  if (statusCode === 408 || statusCode === 504) return 'timeout'
  if (statusCode === 429) return 'failed'
  if (message.includes('timeout') || message.includes('timed out') || message.includes('abort')) {
    return 'timeout'
  }
  return 'failed'
}

/** Parse string as JSON if possible; returns null for invalid JSON. */
export function tryParseJson(text: string | undefined): unknown | null {
  if (!isMeaningfulText(text)) return null
  try {
    return JSON.parse(String(text))
  } catch {
    return null
  }
}

/** Shared success shape helper for provider adapters. */
export function buildProviderSuccess(params: {
  provider: AIModelRole
  model: string
  text: string
  json?: unknown
  tokensPrompt?: number
  tokensCompletion?: number
}): ProviderChatResult {
  return {
    provider: params.provider,
    model: params.model,
    text: params.text,
    json: params.json,
    tokensPrompt: params.tokensPrompt,
    tokensCompletion: params.tokensCompletion,
    status: 'ok',
  }
}

/** Shared invalid-response shape helper for provider adapters. */
export function buildProviderInvalidResponse(params: {
  provider: AIModelRole
  model: string
  error?: string
}): ProviderChatResult {
  return {
    provider: params.provider,
    model: params.model,
    text: '',
    status: 'invalid_response',
    error: sanitizeProviderError(params.error ?? 'Empty or invalid response'),
  }
}

/** Shared failure shape helper for provider adapters. */
export function buildProviderFailure(params: {
  provider: AIModelRole
  model: string
  error?: string
  statusCode?: number
  timedOut?: boolean
  tokensPrompt?: number
  tokensCompletion?: number
}): ProviderChatResult {
  const normalizedStatus = params.timedOut
    ? 'timeout'
    : normalizeProviderFailureStatus({
        statusCode: params.statusCode,
        message: params.error,
      })
  return {
    provider: params.provider,
    model: params.model,
    text: '',
    error: sanitizeProviderError(params.error),
    status: normalizedStatus,
    timedOut: normalizedStatus === 'timeout' || params.timedOut === true,
    tokensPrompt: params.tokensPrompt,
    tokensCompletion: params.tokensCompletion,
  }
}
