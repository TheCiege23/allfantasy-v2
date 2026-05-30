/**
 * Env-based AI configuration — single source of truth for all AI budget controls.
 *
 * Reads process.env at call time. Works identically on Vercel and Railway.
 * All values fail-safe: missing/invalid/negative env → falls back to default.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * COST MODE
 *   AI_COST_MODE=conservative|balanced|generous   (default: conservative)
 *
 * DAILY CAPS (integers, 0 = feature disabled for that tier)
 *   AI_CAP_FREE_CHIMMY_DAILY                      (default: 3)
 *   AI_CAP_FREE_EXPLAIN_DAILY                     (default: 1)
 *   AI_CAP_FREE_COMMISSIONER_BRAIN_DAILY          (default: 0)
 *   AI_CAP_PRO_CHIMMY_DAILY                       (default: 30)
 *   AI_CAP_PRO_EXPLAIN_DAILY                      (default: 5)
 *   AI_CAP_PRO_COMMISSIONER_BRAIN_DAILY           (default: 5)
 *   AI_CAP_ADMIN_CHIMMY_DAILY                     (default: 75)
 *   AI_CAP_ADMIN_EXPLAIN_DAILY                    (default: 20)
 *   AI_CAP_ADMIN_COMMISSIONER_BRAIN_DAILY         (default: 20)
 *
 * CACHE TTLs (integer, units per env var name)
 *   AI_CACHE_TTL_CHIMMY_MINUTES                   (default: 20)
 *   AI_CACHE_TTL_EXPLAIN_HOURS                    (default: 6)
 *   AI_CACHE_TTL_COMMISSIONER_BRAIN_MINUTES       (default: 30)
 *   AI_CACHE_TTL_SPORTS_SCHEDULE_MINUTES          (default: 15)
 *
 * PROVIDER ORDER
 *   AI_PROVIDER_ORDER=openai,anthropic,xai,deepseek (default order)
 *   — invalid names are ignored; duplicates are removed; empty → default
 *
 * BUDGET (USD floats, ≥0)
 *   AI_BUDGET_OPENAI_USD                          (default: 18)
 *   AI_BUDGET_ANTHROPIC_USD                       (default: 10)
 *   AI_BUDGET_XAI_USD                             (default: 0)
 *   AI_BUDGET_DEEPSEEK_USD                        (default: 0)
 * ────────────────────────────────────────────────────────────────────────────
 */
import 'server-only'

// ── Parse helpers ─────────────────────────────────────────────────────────────

/**
 * Parse an env var as a non-negative integer.
 * If allowZero is true, 0 is accepted (useful for caps where 0 = disabled).
 */
function envInt(key: string, defaultVal: number, allowZero = false): number {
  const raw = process.env[key]?.trim()
  if (!raw) return defaultVal
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n)) return defaultVal
  if (n < 0) return defaultVal
  if (n === 0 && !allowZero) return defaultVal
  return n
}

function envFloat(key: string, defaultVal: number): number {
  const raw = process.env[key]?.trim()
  if (!raw) return defaultVal
  const n = Number.parseFloat(raw)
  if (!Number.isFinite(n)) return defaultVal
  if (n < 0) return defaultVal
  return n
}

// ── AI Cost Mode ──────────────────────────────────────────────────────────────

export type AiCostMode = 'conservative' | 'balanced' | 'generous'
const VALID_COST_MODES = new Set<AiCostMode>(['conservative', 'balanced', 'generous'])

export function getAiCostMode(): AiCostMode {
  const raw = process.env.AI_COST_MODE?.trim().toLowerCase() as AiCostMode | undefined
  if (raw && VALID_COST_MODES.has(raw)) return raw
  return 'conservative'
}

// ── Daily Caps ────────────────────────────────────────────────────────────────

export interface AiTierCaps {
  chimmy: number
  explain_bracket: number
  commissioner_brain: number
  /** Per-user daily cap on generative matchup AI calls (panel summary + ask_ai/explain narratives). */
  wc_matchup_narrative: number
}

export interface AiDailyCaps {
  free: AiTierCaps
  pro: AiTierCaps
  admin: AiTierCaps
}

/** Hard-coded defaults — used when env vars are absent or invalid. */
export const CAP_DEFAULTS: AiDailyCaps = {
  free:  { chimmy: 3,  explain_bracket: 1,  commissioner_brain: 0,  wc_matchup_narrative: 3   },
  pro:   { chimmy: 30, explain_bracket: 5,  commissioner_brain: 5,  wc_matchup_narrative: 25  },
  admin: { chimmy: 75, explain_bracket: 20, commissioner_brain: 20, wc_matchup_narrative: 200 },
}

/** Returns effective daily caps — reads from env at call time. */
export function getAiDailyCaps(): AiDailyCaps {
  return {
    free: {
      chimmy:               envInt('AI_CAP_FREE_CHIMMY_DAILY',             CAP_DEFAULTS.free.chimmy,               true),
      explain_bracket:      envInt('AI_CAP_FREE_EXPLAIN_DAILY',            CAP_DEFAULTS.free.explain_bracket,      true),
      commissioner_brain:   envInt('AI_CAP_FREE_COMMISSIONER_BRAIN_DAILY', CAP_DEFAULTS.free.commissioner_brain,   true),
      wc_matchup_narrative: envInt('AI_CAP_FREE_WC_MATCHUP_DAILY',         CAP_DEFAULTS.free.wc_matchup_narrative, true),
    },
    pro: {
      chimmy:               envInt('AI_CAP_PRO_CHIMMY_DAILY',             CAP_DEFAULTS.pro.chimmy,               true),
      explain_bracket:      envInt('AI_CAP_PRO_EXPLAIN_DAILY',            CAP_DEFAULTS.pro.explain_bracket,      true),
      commissioner_brain:   envInt('AI_CAP_PRO_COMMISSIONER_BRAIN_DAILY', CAP_DEFAULTS.pro.commissioner_brain,   true),
      wc_matchup_narrative: envInt('AI_CAP_PRO_WC_MATCHUP_DAILY',         CAP_DEFAULTS.pro.wc_matchup_narrative, true),
    },
    admin: {
      chimmy:               envInt('AI_CAP_ADMIN_CHIMMY_DAILY',             CAP_DEFAULTS.admin.chimmy,               true),
      explain_bracket:      envInt('AI_CAP_ADMIN_EXPLAIN_DAILY',            CAP_DEFAULTS.admin.explain_bracket,      true),
      commissioner_brain:   envInt('AI_CAP_ADMIN_COMMISSIONER_BRAIN_DAILY', CAP_DEFAULTS.admin.commissioner_brain,   true),
      wc_matchup_narrative: envInt('AI_CAP_ADMIN_WC_MATCHUP_DAILY',         CAP_DEFAULTS.admin.wc_matchup_narrative, true),
    },
  }
}

// ── Cache TTLs (seconds) ──────────────────────────────────────────────────────

export interface AiCacheTtls {
  /** Chimmy Q&A cache TTL in seconds */
  chimmy: number
  /** Explain My Bracket TTL in seconds */
  explain_bracket: number
  /** Commissioner Brain TTL in seconds */
  commissioner_brain: number
  /** Sports schedule deterministic answers (key: schedule_static for compat) */
  schedule_static: number
}

/** Minimum cache TTL to prevent accidental near-zero values. */
const MIN_TTL_SECONDS = 60

export const TTL_DEFAULTS: AiCacheTtls = {
  chimmy:             20 * 60,       // 20 min
  explain_bracket:    6 * 3_600,     // 6 h
  commissioner_brain: 30 * 60,       // 30 min
  schedule_static:    15 * 60,       // 15 min
}

/** Returns effective cache TTLs in seconds — reads from env at call time. */
export function getAiCacheTtls(): AiCacheTtls {
  return {
    chimmy: Math.max(
      MIN_TTL_SECONDS,
      envInt('AI_CACHE_TTL_CHIMMY_MINUTES', 20, false) * 60
    ),
    explain_bracket: Math.max(
      MIN_TTL_SECONDS,
      envInt('AI_CACHE_TTL_EXPLAIN_HOURS', 6, false) * 3_600
    ),
    commissioner_brain: Math.max(
      MIN_TTL_SECONDS,
      envInt('AI_CACHE_TTL_COMMISSIONER_BRAIN_MINUTES', 30, false) * 60
    ),
    schedule_static: Math.max(
      MIN_TTL_SECONDS,
      envInt('AI_CACHE_TTL_SPORTS_SCHEDULE_MINUTES', 15, false) * 60
    ),
  }
}

// ── Provider Order ────────────────────────────────────────────────────────────

export type KnownProvider = 'openai' | 'anthropic' | 'xai' | 'deepseek'
const KNOWN_PROVIDERS = new Set<KnownProvider>(['openai', 'anthropic', 'xai', 'deepseek'])
export const DEFAULT_PROVIDER_ORDER: KnownProvider[] = ['openai', 'anthropic', 'xai', 'deepseek']

/** Returns the effective provider order from env, deduplicated, with fallback. */
export function getEffectiveProviderOrder(): KnownProvider[] {
  const raw = process.env.AI_PROVIDER_ORDER?.trim()
  if (!raw) return DEFAULT_PROVIDER_ORDER
  const seen = new Set<KnownProvider>()
  const deduped = raw
    .split(',')
    .map((s) => s.trim().toLowerCase() as KnownProvider)
    .filter((p) => KNOWN_PROVIDERS.has(p) && !seen.has(p) && Boolean(seen.add(p)))
  return deduped.length > 0 ? deduped : DEFAULT_PROVIDER_ORDER
}

// ── Budget ────────────────────────────────────────────────────────────────────

export interface AiBudget {
  openaiUsd: number
  anthropicUsd: number
  xaiUsd: number
  deepseekUsd: number
  totalUsd: number
}

const BUDGET_DEFAULTS = { openai: 18, anthropic: 10, xai: 0, deepseek: 0 }

/** Returns configured AI budget from env — reads at call time. */
export function getAiBudget(): AiBudget {
  const openaiUsd    = envFloat('AI_BUDGET_OPENAI_USD',    BUDGET_DEFAULTS.openai)
  const anthropicUsd = envFloat('AI_BUDGET_ANTHROPIC_USD', BUDGET_DEFAULTS.anthropic)
  const xaiUsd       = envFloat('AI_BUDGET_XAI_USD',       BUDGET_DEFAULTS.xai)
  const deepseekUsd  = envFloat('AI_BUDGET_DEEPSEEK_USD',  BUDGET_DEFAULTS.deepseek)
  return {
    openaiUsd,
    anthropicUsd,
    xaiUsd,
    deepseekUsd,
    totalUsd: +(openaiUsd + anthropicUsd + xaiUsd + deepseekUsd).toFixed(2),
  }
}

// ── Full snapshot ─────────────────────────────────────────────────────────────

export interface AiConfig {
  costMode: AiCostMode
  caps: AiDailyCaps
  ttls: AiCacheTtls
  providerOrder: KnownProvider[]
  budget: AiBudget
}

/** Returns a complete snapshot of effective AI config. Reads env at call time. */
export function getAiConfig(): AiConfig {
  return {
    costMode:      getAiCostMode(),
    caps:          getAiDailyCaps(),
    ttls:          getAiCacheTtls(),
    providerOrder: getEffectiveProviderOrder(),
    budget:        getAiBudget(),
  }
}
