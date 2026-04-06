import OpenAI from 'openai'
import { PHASE_PRODUCTION_BUILD } from 'next/constants'

const DEFAULT_BASE =
  process.env.AI_INTEGRATIONS_OPENAI_BASE_URL?.trim() ||
  process.env.OPENAI_BASE_URL?.trim() ||
  'https://api.openai.com/v1'

function resolveApiKey(): string {
  const k =
    process.env.AI_INTEGRATIONS_OPENAI_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim()
  if (k) return k
  // `next build` collects page data without full Vercel env; avoid throwing at module init.
  if (process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD) {
    return 'build-only-placeholder-openai-key-32chars-min!!'
  }
  throw new Error(
    'Missing credentials. Please pass an `apiKey`, or set the `OPENAI_API_KEY` environment variable.'
  )
}

let _client: OpenAI | null = null

/**
 * Lazy singleton for API routes that used to do `new OpenAI({ apiKey: process.env... })` at import time.
 * Runtime must set OPENAI_API_KEY (or AI_INTEGRATIONS_OPENAI_API_KEY); build uses a placeholder only during PHASE_PRODUCTION_BUILD.
 */
export function getOpenAIRouteClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({ apiKey: resolveApiKey(), baseURL: DEFAULT_BASE })
  }
  return _client
}
