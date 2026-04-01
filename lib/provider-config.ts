/**
 * PROMPT 151 — Centralized API key and provider config.
 * Server-side only. Never log or expose secret values.
 *
 * Canonical env keys:
 * - OPENAI_API_KEY
 * - DEEPSEEK_API_KEY
 * - XAI_API_KEY
 * - CLEARSPORTS_API_KEY
 */

const OPENAI_KEY_KEYS = ['OPENAI_API_KEY', 'AI_INTEGRATIONS_OPENAI_API_KEY'] as const
const OPENAI_BASE_URL_KEYS = ['OPENAI_BASE_URL', 'AI_INTEGRATIONS_OPENAI_BASE_URL'] as const

const DEEPSEEK_KEY_KEYS = ['DEEPSEEK_API_KEY'] as const
const DEEPSEEK_BASE_URL_KEYS = ['DEEPSEEK_BASE_URL'] as const
const DEEPSEEK_MODEL_KEYS = ['DEEPSEEK_MODEL'] as const

const XAI_KEY_KEYS = ['XAI_API_KEY', 'GROK_API_KEY'] as const
const XAI_BASE_URL_KEYS = ['XAI_BASE_URL', 'GROK_BASE_URL'] as const
const XAI_MODEL_KEYS = ['XAI_MODEL', 'GROK_MODEL'] as const

const CLEARSPORTS_KEY_KEYS = ['CLEARSPORTS_API_KEY', 'CLEAR_SPORTS_API_KEY'] as const
const CLEARSPORTS_BASE_URL_KEYS = [
  'CLEARSPORTS_API_BASE',
  'CLEAR_SPORTS_API_BASE',
  'CLEARSPORTS_BASE_URL',
  'CLEAR_SPORTS_BASE_URL',
] as const
const DEFAULT_CLEARSPORTS_BASE_URL = 'https://api.clearsportsapi.com/v1'

interface ResolvedEnvValue {
  value: string
  keyUsed: string | null
}

function trim(value: string | undefined): string {
  return (value ?? '').trim()
}

function mask(value: string): string {
  return value ? 'set' : 'unset'
}

function resolveFirstEnv(keys: readonly string[]): ResolvedEnvValue {
  for (const key of keys) {
    const value = trim(process.env[key])
    if (value) return { value, keyUsed: key }
  }
  return { value: '', keyUsed: null }
}

function normalizeBaseUrl(value: string, fallback: string): string {
  const raw = trim(value) || fallback
  return raw.replace(/\/+$/, '')
}

function normalizeXaiBaseUrl(value: string): string {
  const normalized = normalizeBaseUrl(value, 'https://api.x.ai/v1')
  return normalized
    .replace(/\/chat\/completions$/i, '')
    .replace(/\/responses$/i, '')
}

// ----- OpenAI -----
export interface OpenAIProviderConfig {
  apiKey: string
  baseUrl: string
  model: string
  keySource: string
}

export function getOpenAIConfigFromEnv(): OpenAIProviderConfig | null {
  const apiKey = resolveFirstEnv(OPENAI_KEY_KEYS)
  if (!apiKey.value) return null
  const baseUrlRaw = resolveFirstEnv(OPENAI_BASE_URL_KEYS)
  const baseUrl = normalizeBaseUrl(baseUrlRaw.value, 'https://api.openai.com/v1')
  const model = resolveFirstEnv(['OPENAI_MODEL']).value || 'gpt-4o'
  return {
    apiKey: apiKey.value,
    baseUrl,
    model,
    keySource: apiKey.keyUsed ?? OPENAI_KEY_KEYS[0],
  }
}

export function isOpenAIAvailable(): boolean {
  return !!getOpenAIConfigFromEnv()
}

// ----- DeepSeek -----
export interface DeepSeekProviderConfig {
  apiKey: string
  baseUrl: string
  model: string
  keySource: string
}

export function getDeepSeekConfigFromEnv(): DeepSeekProviderConfig | null {
  const apiKey = resolveFirstEnv(DEEPSEEK_KEY_KEYS)
  if (!apiKey.value) return null
  const baseUrl = normalizeBaseUrl(resolveFirstEnv(DEEPSEEK_BASE_URL_KEYS).value, 'https://api.deepseek.com/v1')
  const model = resolveFirstEnv(DEEPSEEK_MODEL_KEYS).value || 'deepseek-chat'
  return {
    apiKey: apiKey.value,
    baseUrl,
    model,
    keySource: apiKey.keyUsed ?? DEEPSEEK_KEY_KEYS[0],
  }
}

export function isDeepSeekAvailable(): boolean {
  return !!getDeepSeekConfigFromEnv()
}

// ----- xAI / Grok -----
export interface XaiProviderConfig {
  apiKey: string
  baseUrl: string
  model: string
  keySource: string
}

export function getXaiConfigFromEnv(): XaiProviderConfig | null {
  const apiKey = resolveFirstEnv(XAI_KEY_KEYS)
  if (!apiKey.value) return null
  const baseUrl = normalizeXaiBaseUrl(resolveFirstEnv(XAI_BASE_URL_KEYS).value)
  const model = resolveFirstEnv(XAI_MODEL_KEYS).value || 'grok-2-latest'
  return {
    apiKey: apiKey.value,
    baseUrl,
    model,
    keySource: apiKey.keyUsed ?? XAI_KEY_KEYS[0],
  }
}

export function isXaiAvailable(): boolean {
  return !!getXaiConfigFromEnv()
}

// ----- ClearSports -----
export interface ClearSportsProviderConfig {
  apiKey: string
  baseUrl: string
  keySource: string
}

export function getClearSportsConfigFromEnv(): ClearSportsProviderConfig | null {
  const apiKey = resolveFirstEnv(CLEARSPORTS_KEY_KEYS)
  const baseUrlRaw = resolveFirstEnv(CLEARSPORTS_BASE_URL_KEYS)
  const baseFallback = apiKey.value ? DEFAULT_CLEARSPORTS_BASE_URL : ''
  const baseUrl = normalizeBaseUrl(baseUrlRaw.value, baseFallback)
  if (!apiKey.value || !baseUrl) return null
  return {
    apiKey: apiKey.value,
    baseUrl,
    keySource: apiKey.keyUsed ?? CLEARSPORTS_KEY_KEYS[0],
  }
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

export interface ProviderSurfaceStatus {
  providerSelector: boolean
  aiModeSelector: boolean
  providerComparison: boolean
  mediaGeneration: boolean
  chimmy: boolean
  socialClipGeneration: boolean
  blogGeneration: boolean
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

export function getProviderSurfaceStatus(status: ProviderStatus = getProviderStatus()): ProviderSurfaceStatus {
  const aiProvidersOnline = [status.openai, status.deepseek, status.xai].filter(Boolean).length
  return {
    providerSelector: status.anyAi,
    aiModeSelector: status.anyAi,
    providerComparison: aiProvidersOnline > 1,
    mediaGeneration: status.openai || status.xai,
    chimmy: status.openai || status.xai,
    socialClipGeneration: status.openai || status.xai,
    blogGeneration: status.anyAi,
  }
}

// ----- Startup validation notes (safe, no secret values) -----
export interface ProviderStartupValidationNote {
  level: 'info' | 'warn'
  code: string
  message: string
}

export function getProviderStartupValidationNotes(): ProviderStartupValidationNote[] {
  const notes: ProviderStartupValidationNote[] = []
  const status = getProviderStatus()

  if (!status.anyAi) {
    notes.push({
      level: 'warn',
      code: 'ai_providers_missing',
      message: 'No AI providers configured. Set OPENAI_API_KEY, DEEPSEEK_API_KEY, or XAI_API_KEY.',
    })
  }

  const clearSportsKey = resolveFirstEnv(CLEARSPORTS_KEY_KEYS)
  const clearSportsBase = resolveFirstEnv(CLEARSPORTS_BASE_URL_KEYS)
  if (clearSportsKey.value && !clearSportsBase.value) {
    notes.push({
      level: 'info',
      code: 'clearsports_default_base_applied',
      message: `ClearSports base URL not set. Falling back to ${DEFAULT_CLEARSPORTS_BASE_URL}.`,
    })
  } else if (!!clearSportsKey.value !== !!clearSportsBase.value) {
    notes.push({
      level: 'warn',
      code: 'clearsports_partial_config',
      message: 'ClearSports config is partial. Set both CLEARSPORTS_API_KEY and CLEARSPORTS_API_BASE.',
    })
  }

  if (resolveFirstEnv(OPENAI_KEY_KEYS).keyUsed === 'AI_INTEGRATIONS_OPENAI_API_KEY') {
    notes.push({
      level: 'info',
      code: 'openai_legacy_alias_in_use',
      message: 'Using legacy alias AI_INTEGRATIONS_OPENAI_API_KEY. Prefer OPENAI_API_KEY.',
    })
  }

  if (resolveFirstEnv(XAI_KEY_KEYS).keyUsed === 'GROK_API_KEY') {
    notes.push({
      level: 'info',
      code: 'xai_legacy_alias_in_use',
      message: 'Using legacy alias GROK_API_KEY. Prefer XAI_API_KEY.',
    })
  }

  if (resolveFirstEnv(CLEARSPORTS_KEY_KEYS).keyUsed === 'CLEAR_SPORTS_API_KEY') {
    notes.push({
      level: 'info',
      code: 'clearsports_legacy_alias_in_use',
      message: 'Using legacy alias CLEAR_SPORTS_API_KEY. Prefer CLEARSPORTS_API_KEY.',
    })
  }

  return notes
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

export function logProviderStartupValidation(): void {
  if (typeof process === 'undefined') return
  const notes = getProviderStartupValidationNotes()
  for (const note of notes) {
    const line = `[ProviderConfig][${note.code}] ${note.message}`
    if (note.level === 'warn') console.warn(line)
    else console.info(line)
  }
}
