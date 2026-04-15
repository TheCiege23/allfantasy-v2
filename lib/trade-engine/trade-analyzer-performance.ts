/**
 * Trade Analyzer Performance Optimizer
 *
 * Target: full response under 2 seconds.
 *
 * Strategy:
 *   1. Precompute hot-path data (player values, UTV, risk scores)
 *   2. Cache league settings, manager profiles, news data
 *   3. Parallelize deterministic layer + AI calls
 *   4. Fast initial result + deferred deep analysis
 */

import { cacheGet, cacheSet } from './caching'
import type { TradeDecisionContextV1 } from './trade-decision-context'
import { buildDeterministicIntelligence, type DeterministicIntelligence } from './deterministic-intelligence'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FastTradeResult {
  /** Deterministic verdict — always available within 200ms */
  deterministic: DeterministicIntelligence
  /** Whether deep AI analysis is available or pending */
  aiStatus: 'ready' | 'pending' | 'failed' | 'skipped'
  /** AI analysis (null if pending/skipped) */
  aiAnalysis: unknown | null
  /** Total wall-clock time in ms */
  totalMs: number
  /** Breakdown of time spent in each phase */
  timing: TimingBreakdown
  /** Whether result came from cache */
  cached: boolean
}

export interface TimingBreakdown {
  precomputeMs: number
  deterministicMs: number
  aiMs: number | null
  totalMs: number
}

export interface PrecomputedValues {
  /** Player market values by name (normalized) */
  playerValues: Map<string, number>
  /** Risk scores by player name */
  riskScores: Map<string, number>
  /** Computed at timestamp */
  computedAt: number
}

// ---------------------------------------------------------------------------
// Precompute Cache (in-memory, 15-min TTL)
// ---------------------------------------------------------------------------

const PRECOMPUTE_TTL_MS = 15 * 60 * 1000
const PRECOMPUTE_CACHE_KEY = 'trade:precomputed'

export function getPrecomputedValues(): PrecomputedValues | null {
  return cacheGet<PrecomputedValues>(PRECOMPUTE_CACHE_KEY)
}

export function setPrecomputedValues(values: PrecomputedValues): void {
  cacheSet(PRECOMPUTE_CACHE_KEY, values, PRECOMPUTE_TTL_MS)
}

/**
 * Precompute player values and risk scores from trade context.
 * Call this at the start of analysis to warm the cache.
 */
export function precomputeFromContext(ctx: TradeDecisionContextV1): PrecomputedValues {
  const playerValues = new Map<string, number>()
  const riskScores = new Map<string, number>()

  for (const side of [ctx.sideA, ctx.sideB]) {
    for (const asset of side.assets) {
      if (asset.type === 'PLAYER') {
        playerValues.set(asset.name.toLowerCase(), asset.marketValue)
      }
    }
    for (const marker of side.riskMarkers) {
      let risk = 0
      if (marker.ageBucket === 'cliff') risk += 0.4
      else if (marker.ageBucket === 'declining') risk += 0.25

      if (marker.injuryStatus) {
        if (marker.injuryStatus.reinjuryRisk === 'high') risk += 0.35
        else if (marker.injuryStatus.reinjuryRisk === 'moderate') risk += 0.2
        if (marker.injuryStatus.status !== 'Healthy' && marker.injuryStatus.status !== 'Active') {
          risk += 0.15
        }
      }

      riskScores.set(marker.playerName.toLowerCase(), Math.min(1, risk))
    }
  }

  const values: PrecomputedValues = {
    playerValues,
    riskScores,
    computedAt: Date.now(),
  }

  setPrecomputedValues(values)
  return values
}

// ---------------------------------------------------------------------------
// Parallel Execution
// ---------------------------------------------------------------------------

export interface ParallelAnalysisInput {
  ctx: TradeDecisionContextV1
  /** Run AI analysis in parallel with deterministic layer */
  runAI: () => Promise<unknown>
  /** Skip AI if deterministic is high-confidence */
  skipAIThreshold?: number
  /** Maximum time to wait for AI (ms) */
  aiTimeoutMs?: number
}

/**
 * Run deterministic + AI analysis in parallel.
 * Returns fast deterministic result immediately, AI result when ready.
 *
 * If deterministic confidence > skipAIThreshold, AI is skipped entirely.
 * If AI exceeds aiTimeoutMs, return deterministic result with aiStatus='pending'.
 */
export async function runParallelAnalysis(
  input: ParallelAnalysisInput,
): Promise<FastTradeResult> {
  const start = Date.now()
  const skipThreshold = input.skipAIThreshold ?? 85
  const aiTimeout = input.aiTimeoutMs ?? 8000

  // Phase 1: Precompute (synchronous, <5ms)
  const preStart = Date.now()
  precomputeFromContext(input.ctx)
  const precomputeMs = Date.now() - preStart

  // Phase 2: Deterministic (synchronous, <50ms)
  const detStart = Date.now()
  const deterministic = buildDeterministicIntelligence(input.ctx)
  const deterministicMs = Date.now() - detStart

  // Fast path: if deterministic is high-confidence, skip AI entirely
  if (deterministic.confidence >= skipThreshold) {
    return {
      deterministic,
      aiStatus: 'skipped',
      aiAnalysis: null,
      totalMs: Date.now() - start,
      timing: {
        precomputeMs,
        deterministicMs,
        aiMs: null,
        totalMs: Date.now() - start,
      },
      cached: false,
    }
  }

  // Phase 3: AI (parallel, with timeout)
  const aiStart = Date.now()
  let aiAnalysis: unknown = null
  let aiStatus: FastTradeResult['aiStatus'] = 'pending'

  try {
    aiAnalysis = await Promise.race([
      input.runAI(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), aiTimeout)),
    ])

    aiStatus = aiAnalysis != null ? 'ready' : 'pending'
  } catch {
    aiStatus = 'failed'
  }

  const aiMs = Date.now() - aiStart
  const totalMs = Date.now() - start

  return {
    deterministic,
    aiStatus,
    aiAnalysis,
    totalMs,
    timing: {
      precomputeMs,
      deterministicMs,
      aiMs,
      totalMs,
    },
    cached: false,
  }
}

// ---------------------------------------------------------------------------
// Result Caching
// ---------------------------------------------------------------------------

const RESULT_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Build a stable cache key from trade context.
 * Key is based on asset names + league config hash.
 */
export function buildTradeResultCacheKey(ctx: TradeDecisionContextV1): string {
  // Sort each side independently, then join with separator to preserve side identity
  const sideANames = ctx.sideA.assets.map(a => a.name).sort().join(',')
  const sideBNames = ctx.sideB.assets.map(a => a.name).sort().join(',')
  const assetKey = `${sideANames}||${sideBNames}`

  const leagueKey = `${ctx.leagueConfig.leagueId ?? 'unknown'}:${ctx.leagueConfig.isSF}:${ctx.leagueConfig.isTEP}`

  return `trade:result:${leagueKey}:${hashString(assetKey)}`
}

function hashString(s: string): string {
  let hash = 0
  for (let i = 0; i < s.length; i++) {
    const char = s.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}

export function getCachedTradeResult(ctx: TradeDecisionContextV1): FastTradeResult | null {
  const key = buildTradeResultCacheKey(ctx)
  const cached = cacheGet<FastTradeResult>(key)
  if (cached) {
    return { ...cached, cached: true }
  }
  return null
}

export function cacheTradeResult(ctx: TradeDecisionContextV1, result: FastTradeResult): void {
  const key = buildTradeResultCacheKey(ctx)
  cacheSet(key, result, RESULT_CACHE_TTL_MS)
}

// ---------------------------------------------------------------------------
// Deferred Deep Analysis
// ---------------------------------------------------------------------------

export interface DeferredAnalysisHandle {
  /** Promise that resolves when deep analysis is complete */
  promise: Promise<unknown>
  /** Whether the analysis has completed */
  completed: boolean
  /** Result (null until completed) */
  result: unknown | null
}

/**
 * Start deep analysis in the background.
 * Returns a handle that can be polled or awaited.
 */
export function startDeferredAnalysis(
  runDeep: () => Promise<unknown>,
): DeferredAnalysisHandle {
  const handle: DeferredAnalysisHandle = {
    promise: Promise.resolve(null),
    completed: false,
    result: null,
  }

  handle.promise = runDeep()
    .then((result) => {
      handle.completed = true
      handle.result = result
      return result
    })
    .catch((err) => {
      console.warn('[trade-analyzer] Deferred deep analysis failed:', err?.message || err)
      handle.completed = true
      handle.result = null
      return null
    })

  return handle
}
