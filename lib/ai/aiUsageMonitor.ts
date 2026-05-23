/**
 * AI Usage Monitor — admin-only aggregation helper.
 *
 * Aggregates data from existing durable tables:
 *   - ApiRateLimitRecord  (cap usage per feature/user-hash, daily window)
 *   - SportsDataCache     (active AI cache entries by feature)
 *   - ChimmyContextRun    (per-call telemetry — fail-safe if table absent)
 *   - verifyProviderEnv() (provider configured booleans)
 *
 * Privacy:
 *   - Never returns raw user IDs, emails, invite codes, or prompt text.
 *   - User identity appears only as hashed endpoint prefixes (from cap records).
 *   - Aggregate counts only.
 *
 * Fail-open: all DB queries are wrapped in try/catch. Missing data is surfaced
 * as dataAvailable:false so the UI can show "Not tracked yet" cleanly.
 */
import 'server-only'

import { prisma } from '@/lib/prisma'
import { verifyProviderEnv } from '@/lib/ai/envVerification'
import {
  getAiConfig,
  getAiBudget,
  type AiConfig,
  type AiBudget,
} from '@/lib/ai/aiConfig'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AiProviderStatus {
  openai: boolean
  anthropic: boolean
  xai: boolean
  deepseek: boolean
}

export interface AiCapFeatureRow {
  feature: string
  /** Distinct hashed user entries for today's window */
  totalUsers: number
  /** Sum of callsMade across all user entries */
  totalCalls: number
  /** Users at ≥80% of their cap limit */
  usersNearCap: number
  /** Users at or over their cap limit */
  usersAtCap: number
}

export interface AiCapSummary {
  dataAvailable: boolean
  windowDate: string       // UTC date string e.g. "2026-05-22"
  totalCallsToday: number
  totalUsersToday: number
  usersNearCap: number
  usersAtCap: number
  byFeature: AiCapFeatureRow[]
}

export interface AiCacheStats {
  dataAvailable: boolean
  /** Active (unexpired) AI cache entries right now */
  activeCacheEntries: number
  byFeature: { feature: string; count: number }[]
  note: string
}

/** Per-provider breakdown parsed from ChimmyContextRun.providerMeta */
export interface AiProviderBreakdown {
  provider: string
  totalCalls: number
  cachedCalls: number
  failedCalls: number
}

export interface AiTelemetrySummary {
  /** True when ChimmyContextRun table has rows for today */
  tracked: boolean
  totalRuns: number
  totalCacheHits: number
  totalProviderFailures: number
  avgDurationMs: number
  byProvider: AiProviderBreakdown[]
  byIntent: { intent: string; count: number }[]
}

export interface AiCostEstimateRow {
  feature: string
  paidCalls: number
  profile: 'cheap' | 'standard' | 'premium' | 'unknown'
  estimatedLowUsd: number
  estimatedHighUsd: number
}

export interface AiCostEstimate {
  /** Always false — token-level billing data not stored */
  precise: false
  note: string
  totalPaidCallsEstimate: number
  totalLowUsd: number
  totalHighUsd: number
  byFeature: AiCostEstimateRow[]
}

export interface AiBudgetHealth {
  /** Always false — token-level billing not stored */
  precise: false
  totalBudgetUsd: number
  perProvider: { provider: string; budgetUsd: number }[]
  estimatedSpendTodayLowUsd: number
  estimatedSpendTodayHighUsd: number
  estimatedCallsToday: number
  /**
   * Projected days until budget exhausted based on today's usage rate.
   * null when no calls have been made today (can't project a rate).
   */
  estimatedDaysRemaining: number | null
  note: string
}

export interface AiUsageReport {
  generatedAt: Date
  providerStatus: AiProviderStatus
  caps: AiCapSummary
  cache: AiCacheStats
  telemetry: AiTelemetrySummary
  costEstimate: AiCostEstimate
  /** Effective configuration from env vars at report generation time */
  config: AiConfig
  budget: AiBudgetHealth
}

// ── UTC helpers ───────────────────────────────────────────────────────────────

function utcDayStart(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function utcDayEnd(d = new Date()): Date {
  return new Date(utcDayStart(d).getTime() + 24 * 60 * 60 * 1_000)
}

function utcDateString(d = new Date()): string {
  return d.toISOString().slice(0, 10)
}

// ── Cost mapping ──────────────────────────────────────────────────────────────
// Conservative per-call estimates. Labeled "estimate" — not billing truth.
// cheap  = gpt-4o-mini / claude-haiku  (~500 in + 200 out tokens avg)
// standard/premium = gpt-4o / claude-sonnet (~1000 in + 600 out tokens avg)

const PROFILE_MAP: Record<string, 'cheap' | 'standard' | 'premium'> = {
  chimmy:              'cheap',
  explain_bracket:     'standard',
  commissioner_brain:  'premium',
}

const COST_PER_CALL_LOW: Record<string, number> = {
  cheap:    0.0004,
  standard: 0.003,
  premium:  0.007,
  unknown:  0.001,
}

const COST_PER_CALL_HIGH: Record<string, number> = {
  cheap:    0.002,
  standard: 0.015,
  premium:  0.025,
  unknown:  0.005,
}

// ── Provider status ───────────────────────────────────────────────────────────

async function fetchProviderStatus(): Promise<AiProviderStatus> {
  const env = verifyProviderEnv()
  return {
    openai:    env.openaiConfigured,
    anthropic: env.anthropicConfigured,
    xai:       env.xaiConfigured,
    deepseek:  env.deepseekConfigured,
  }
}

// ── Cap summary ───────────────────────────────────────────────────────────────

async function fetchCapSummary(): Promise<AiCapSummary> {
  const today = utcDayStart()

  const empty: AiCapSummary = {
    dataAvailable: false,
    windowDate: utcDateString(),
    totalCallsToday: 0,
    totalUsersToday: 0,
    usersNearCap: 0,
    usersAtCap: 0,
    byFeature: [],
  }

  try {
    const records = await prisma.apiRateLimitRecord.findMany({
      where: {
        provider: 'ai_daily',
        windowStart: { gte: today },
        windowEnd:   { lte: utcDayEnd() },
      },
      select: { endpoint: true, callsMade: true, callsLimit: true },
    })

    if (records.length === 0) return { ...empty, dataAvailable: true }

    const byFeature: Record<string, AiCapFeatureRow> = {}
    let totalCalls = 0
    let usersNearCap = 0
    let usersAtCap = 0

    for (const r of records) {
      // endpoint format: "feature:sha256HashPrefix"
      const feature = r.endpoint.split(':')[0] ?? 'unknown'
      if (!byFeature[feature]) {
        byFeature[feature] = { feature, totalUsers: 0, totalCalls: 0, usersNearCap: 0, usersAtCap: 0 }
      }
      byFeature[feature].totalUsers++
      byFeature[feature].totalCalls += r.callsMade
      totalCalls += r.callsMade

      const pct = r.callsLimit > 0 ? r.callsMade / r.callsLimit : 0
      if (pct >= 0.8) {
        byFeature[feature].usersNearCap++
        usersNearCap++
      }
      if (r.callsMade >= r.callsLimit && r.callsLimit > 0) {
        byFeature[feature].usersAtCap++
        usersAtCap++
      }
    }

    return {
      dataAvailable: true,
      windowDate: utcDateString(),
      totalCallsToday: totalCalls,
      totalUsersToday: records.length,
      usersNearCap,
      usersAtCap,
      byFeature: Object.values(byFeature),
    }
  } catch {
    return empty
  }
}

// ── Cache stats ───────────────────────────────────────────────────────────────

async function fetchCacheStats(): Promise<AiCacheStats> {
  const empty: AiCacheStats = {
    dataAvailable: false,
    activeCacheEntries: 0,
    byFeature: [],
    note: 'No AI cache data available yet.',
  }

  try {
    const rows = await prisma.sportsDataCache.findMany({
      where: {
        cacheKey:  { startsWith: 'aic:' },
        expiresAt: { gt: new Date() },
      },
      select: { cacheKey: true },
    })

    if (rows.length === 0) {
      return { ...empty, dataAvailable: true, note: 'No active AI cache entries.' }
    }

    const byFeature: Record<string, number> = {}
    for (const row of rows) {
      // key format: aic:feature:scope:qhash:chash
      const parts = row.cacheKey.split(':')
      const feature = parts[1] ?? 'unknown'
      byFeature[feature] = (byFeature[feature] ?? 0) + 1
    }

    return {
      dataAvailable: true,
      activeCacheEntries: rows.length,
      byFeature: Object.entries(byFeature).map(([feature, count]) => ({ feature, count })),
      note: 'Active (unexpired) cache entries only. Hit count not tracked per entry.',
    }
  } catch {
    return empty
  }
}

// ── ChimmyContextRun telemetry ────────────────────────────────────────────────

async function fetchTelemetry(): Promise<AiTelemetrySummary> {
  const empty: AiTelemetrySummary = {
    tracked: false,
    totalRuns: 0,
    totalCacheHits: 0,
    totalProviderFailures: 0,
    avgDurationMs: 0,
    byProvider: [],
    byIntent: [],
  }

  try {
    const today = utcDayStart()
    const rows = await (prisma as unknown as {
      chimmyContextRun: {
        findMany: (args: unknown) => Promise<Array<{
          durationMs: number
          cacheHitCount: number
          providerFailureCount: number
          providerMeta: unknown
          intent: string | null
        }>>
      }
    }).chimmyContextRun.findMany({
      where: { createdAt: { gte: today } },
      select: {
        durationMs:           true,
        cacheHitCount:        true,
        providerFailureCount: true,
        providerMeta:         true,
        intent:               true,
      },
    })

    if (rows.length === 0) return { ...empty, tracked: true }

    let totalCacheHits = 0
    let totalFailures = 0
    let totalDuration = 0
    const providerMap: Record<string, AiProviderBreakdown> = {}
    const intentMap: Record<string, number> = {}

    for (const run of rows) {
      totalCacheHits += run.cacheHitCount
      totalFailures += run.providerFailureCount
      totalDuration += run.durationMs

      const intent = run.intent ?? 'unknown'
      intentMap[intent] = (intentMap[intent] ?? 0) + 1

      // providerMeta: [{name, ok, cached, durationMs}]
      if (Array.isArray(run.providerMeta)) {
        for (const p of run.providerMeta as Array<{ name?: string; ok?: boolean; cached?: boolean }>) {
          const name = p.name ?? 'unknown'
          if (!providerMap[name]) {
            providerMap[name] = { provider: name, totalCalls: 0, cachedCalls: 0, failedCalls: 0 }
          }
          providerMap[name].totalCalls++
          if (p.cached) providerMap[name].cachedCalls++
          if (!p.ok) providerMap[name].failedCalls++
        }
      }
    }

    return {
      tracked: true,
      totalRuns: rows.length,
      totalCacheHits,
      totalProviderFailures: totalFailures,
      avgDurationMs: Math.round(totalDuration / rows.length),
      byProvider: Object.values(providerMap),
      byIntent: Object.entries(intentMap)
        .map(([intent, count]) => ({ intent, count }))
        .sort((a, b) => b.count - a.count),
    }
  } catch {
    return empty
  }
}

// ── Cost estimate ─────────────────────────────────────────────────────────────

function buildCostEstimate(caps: AiCapSummary): AiCostEstimate {
  const byFeature: AiCostEstimateRow[] = caps.byFeature.map((row) => {
    const profile = PROFILE_MAP[row.feature] ?? 'unknown'
    return {
      feature:          row.feature,
      paidCalls:        row.totalCalls,
      profile,
      estimatedLowUsd:  +(row.totalCalls * COST_PER_CALL_LOW[profile]).toFixed(4),
      estimatedHighUsd: +(row.totalCalls * COST_PER_CALL_HIGH[profile]).toFixed(4),
    }
  })

  const totalLow  = +byFeature.reduce((s, r) => s + r.estimatedLowUsd,  0).toFixed(4)
  const totalHigh = +byFeature.reduce((s, r) => s + r.estimatedHighUsd, 0).toFixed(4)

  return {
    precise: false,
    note: 'Estimate based on call counts × conservative per-call cost range. Token-level billing not stored.',
    totalPaidCallsEstimate: caps.totalCallsToday,
    totalLowUsd: totalLow,
    totalHighUsd: totalHigh,
    byFeature,
  }
}

// ── Budget health ─────────────────────────────────────────────────────────────

function buildBudgetHealth(costEstimate: AiCostEstimate, budget: AiBudget): AiBudgetHealth {
  const perProvider = [
    { provider: 'openai',    budgetUsd: budget.openaiUsd    },
    { provider: 'anthropic', budgetUsd: budget.anthropicUsd },
    { provider: 'xai',       budgetUsd: budget.xaiUsd       },
    { provider: 'deepseek',  budgetUsd: budget.deepseekUsd  },
  ].filter((p) => p.budgetUsd > 0)

  const callsToday = costEstimate.totalPaidCallsEstimate
  const midUsd = (costEstimate.totalLowUsd + costEstimate.totalHighUsd) / 2

  let estimatedDaysRemaining: number | null = null
  if (callsToday > 0 && midUsd > 0 && budget.totalUsd > 0) {
    const raw = budget.totalUsd / midUsd
    // Cap at 9999 to avoid absurd projections from a single cheap call
    estimatedDaysRemaining = Math.min(9999, Math.floor(raw))
  }

  return {
    precise: false,
    totalBudgetUsd: budget.totalUsd,
    perProvider,
    estimatedSpendTodayLowUsd:  costEstimate.totalLowUsd,
    estimatedSpendTodayHighUsd: costEstimate.totalHighUsd,
    estimatedCallsToday: callsToday,
    estimatedDaysRemaining,
    note: 'Estimate only — token-level spend is not fully tracked yet. Days remaining projected from today\'s usage rate.',
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getAiUsageReport(): Promise<AiUsageReport> {
  const [providerStatus, caps, cache, telemetry] = await Promise.all([
    fetchProviderStatus(),
    fetchCapSummary(),
    fetchCacheStats(),
    fetchTelemetry(),
  ])

  const costEstimate = buildCostEstimate(caps)
  const budget = getAiBudget()

  return {
    generatedAt: new Date(),
    providerStatus,
    caps,
    cache,
    telemetry,
    costEstimate,
    config: getAiConfig(),
    budget: buildBudgetHealth(costEstimate, budget),
  }
}
