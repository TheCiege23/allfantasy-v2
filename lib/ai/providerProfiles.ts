/**
 * Cost-aware provider profiles for the AI router.
 *
 * cheap    — simple Q&A, short summaries, quick Chimmy replies
 * standard — Explain My Bracket, deeper fantasy analysis
 * premium  — Commissioner Brain, long strategy / recap tasks
 *
 * Model selection reads from env vars so you can tune per-provider without
 * code changes. Falls back to reasonable defaults for each provider.
 */

export type ProviderProfile = 'cheap' | 'standard' | 'premium'

// ── OpenAI ────────────────────────────────────────────────────────────────────

const OPENAI_DEFAULTS: Record<ProviderProfile, string> = {
  cheap:    'gpt-4o-mini',
  standard: 'gpt-4o',
  premium:  'gpt-4o',
}

export function resolveOpenAIModel(profile: ProviderProfile): string {
  if (profile === 'cheap') {
    return process.env.OPENAI_MODEL_CHEAP?.trim() || OPENAI_DEFAULTS.cheap
  }
  if (profile === 'premium') {
    return process.env.OPENAI_MODEL_PREMIUM?.trim() || OPENAI_DEFAULTS.premium
  }
  return (
    process.env.OPENAI_MODEL_STANDARD?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    OPENAI_DEFAULTS.standard
  )
}

// ── Anthropic ─────────────────────────────────────────────────────────────────

const ANTHROPIC_DEFAULTS: Record<ProviderProfile, string> = {
  cheap:    'claude-haiku-4-5-20251001',
  standard: 'claude-sonnet-4-6',
  premium:  'claude-sonnet-4-6',
}

export function resolveAnthropicModel(profile: ProviderProfile): string {
  if (profile === 'cheap') {
    return (
      process.env.ANTHROPIC_MODEL_CHEAP?.trim() ||
      process.env.ANTHROPIC_MODEL_QUICKASK?.trim() ||
      ANTHROPIC_DEFAULTS.cheap
    )
  }
  if (profile === 'premium') {
    return (
      process.env.ANTHROPIC_MODEL_PREMIUM?.trim() ||
      process.env.ANTHROPIC_MODEL_DEEP?.trim() ||
      ANTHROPIC_DEFAULTS.premium
    )
  }
  return (
    process.env.ANTHROPIC_MODEL_STANDARD?.trim() ||
    process.env.ANTHROPIC_MODEL_SPECIALIST?.trim() ||
    ANTHROPIC_DEFAULTS.standard
  )
}

// ── xAI ───────────────────────────────────────────────────────────────────────

export function resolveXaiModel(_profile: ProviderProfile): string {
  return process.env.XAI_MODEL?.trim() || process.env.GROK_MODEL?.trim() || 'grok-2-latest'
}

// ── DeepSeek ──────────────────────────────────────────────────────────────────

export function resolveDeepSeekModel(_profile: ProviderProfile): string {
  return process.env.DEEPSEEK_MODEL?.trim() || 'deepseek-chat'
}
