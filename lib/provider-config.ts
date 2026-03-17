/**
 * PROMPT 151 — Centralized API key and provider config.
 * Server-side only. Never log or expose secret values.
 * Canonical env: OPENAI_API_KEY, DEEPSEEK_API_KEY, XAI_API_KEY, CLEARSPORTS_API_KEY.
 */

function trim(s: string | undefined): string {
  return (s ?? '').trim()
}

function mask(value: string): string {
  if (!value) return 'unset'
  return 'set'
}

// ----- OpenAI -----
export interface OpenAIProviderConfig {
  apiKey: string
  baseUrl: string
  model: string
}

export function getOpenAIConfigFromEnv(): OpenAIProviderConfig | null {
  const apiKey = trim(process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY || '')
  if (!apiKey) return null
  const baseUrl = (process.env.OPENAI_BASE_URL || process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '')
  const model = trim(process.env.OPENAI_MODEL || 'gpt-4o') || 'gpt-4o'
  return { apiKey, baseUrl, model }
}

export function isOpenAIAvailable(): boolean {
  return !!getOpenAIConfigFromEnv()
}

// ----- DeepSeek -----
export interface DeepSeekProviderConfig {
  apiKey: string
}

export function getDeepSeekConfigFromEnv(): DeepSeekProviderConfig | null {
  const apiKey = trim(process.env.DEEPSEEK_API_KEY || '')
  if (!apiKey) return null
  return { apiKey }
}

export function isDeepSeekAvailable(): boolean {
  return !!getDeepSeekConfigFromEnv()
}

// ----- xAI / Grok -----
export interface XaiProviderConfig {
  apiKey: string
  baseUrl: string
  model: string
}

export function getXaiConfigFromEnv(): XaiProviderConfig | null {
  const apiKey = trim(process.env.XAI_API_KEY || process.env.GROK_API_KEY || '')
  if (!apiKey) return null
  const baseUrl = (process.env.GROK_BASE_URL || process.env.XAI_BASE_URL || 'https://api.x.ai/v1').replace(/\/+$/, '')
  const model = trim(process.env.XAI_MODEL || process.env.GROK_MODEL || 'grok-2-latest') || 'grok-2-latest'
  return { apiKey, baseUrl, model }
}

export function isXaiAvailable(): boolean {
  return !!getXaiConfigFromEnv()
}

// ----- ClearSports -----
export interface ClearSportsProviderConfig {
  apiKey: string
  baseUrl: string
}

export function getClearSportsConfigFromEnv(): ClearSportsProviderConfig | null {
  const apiKey = trim(process.env.CLEARSPORTS_API_KEY || process.env.CLEAR_SPORTS_API_KEY || '')
  const baseUrl = trim(process.env.CLEARSPORTS_API_BASE || process.env.CLEAR_SPORTS_API_BASE || '').replace(/\/+$/, '')
  if (!apiKey || !baseUrl) return null
  return { apiKey, baseUrl }
}

export function isClearSportsAvailable(): boolean {
  return !!getClearSportsConfigFromEnv()
}

// ----- Frontend-safe status (no secrets) -----
export interface ProviderStatus {
  openai: boolean
  deepseek: boolean
  xai: boolean
  clearsports: boolean
  anyAi: boolean
}

export function getProviderStatus(): ProviderStatus {
  const openai = isOpenAIAvailable()
  const deepseek = isDeepSeekAvailable()
  const xai = isXaiAvailable()
  const clearsports = isClearSportsAvailable()
  return {
    openai,
    deepseek,
    xai,
    clearsports,
    anyAi: openai || deepseek || xai,
  }
}

// ----- Safe logging (never print secret values) -----
export function logProviderStatus(): void {
  if (typeof process === 'undefined') return
  const o = getOpenAIConfigFromEnv()
  const d = getDeepSeekConfigFromEnv()
  const x = getXaiConfigFromEnv()
  const c = getClearSportsConfigFromEnv()
  const parts = [
    `openai: ${mask(o?.apiKey ?? '')}`,
    `deepseek: ${mask(d?.apiKey ?? '')}`,
    `xai: ${mask(x?.apiKey ?? '')}`,
    `clearsports: ${mask(c?.apiKey ?? '')}`,
  ]
  console.info('[ProviderConfig]', parts.join(', '))
}
