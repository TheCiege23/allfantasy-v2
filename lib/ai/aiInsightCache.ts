/**
 * AiInsightCache — World Cup AI response cache.
 *
 * Wraps the existing AiResult model (lib/ai/ai-result-cache.ts) with
 * World Cup-specific scope keys, TTLs, and a grounding hash helper.
 *
 * ── Usage pattern ──────────────────────────────────────────────────────────────
 *  1. Compute groundingHash from current pool/entry state.
 *  2. Call getOrCreateWcXxxInsight(input, onCacheMiss).
 *  3. onCacheMiss is only invoked when there is no fresh cached result.
 *  4. On cache hit, the audit log should record provider: "cache" and skip
 *     token counting — no LLM was called.
 *
 * ── Security ───────────────────────────────────────────────────────────────────
 *  - scopeId always includes userId for user-scoped results → no cross-user
 *    cache pollution.
 *  - groundingHash ties the cache entry to the pool's current data state.
 *    When the leaderboard, picks, or match results change, the hash changes
 *    and the cached answer is automatically invalidated (cache miss).
 *  - No raw userId, email, prompt text, or PII is stored in the payload.
 *    Only hashed/normalized values are used as part of the cache key.
 *
 * ── Audit note ─────────────────────────────────────────────────────────────────
 *  Callers MUST NOT bypass grounding, validator, or audit logging on cache miss.
 *  The onCacheMiss function must still produce a validated response.
 *  The audit logger is called by callers, not by this module.
 */
import 'server-only'

import { createHash } from 'node:crypto'

import { getCachedAiResult, saveAiResult } from './ai-result-cache'
import { getAiCacheTtls } from './aiConfig'

// ─── Stable JSON serializer ───────────────────────────────────────────────────

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(',')}]`
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b)
  )
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`
}

/**
 * Produce a stable 32-char hex hash of any grounding data payload.
 *
 * Use this to derive the groundingHash parameter for getOrCreateWcXxxInsight.
 * When the underlying pool/entry state changes (new match result, leaderboard
 * update, pick change), the hash changes and the old cache entry becomes a miss.
 *
 * ── Guidelines for what to pass ────────────────────────────────────────────────
 *  - DO include: entry counts, scores, ranks, pick counts, match statuses,
 *    phase flags, lastSyncedAt timestamps.
 *  - DO NOT include: raw userId, email, displayName, full prompt text, or PII.
 *  - Null/undefined top-level fields are filtered so minor schema evolution
 *    does not cause spurious cache misses.
 */
export function hashGroundingPacket(data: unknown): string {
  const cleaned =
    data && typeof data === 'object' && !Array.isArray(data)
      ? Object.fromEntries(
          Object.entries(data as Record<string, unknown>).filter(([, v]) => v != null)
        )
      : data
  return createHash('sha256').update(stableStringify(cleaned)).digest('hex').slice(0, 32)
}

// ─── Shared return type ───────────────────────────────────────────────────────

export type WcInsightCacheResult = {
  /** true if the response came from cache — no LLM was called. */
  cacheHit: boolean
  /** The (possibly empty) response text. */
  text: string
  /** Which AI provider generated this response; null on cache hits. */
  provider: string | null
  /** Which model was used; null on cache hits. */
  model: string | null
  /** Tokens consumed; null on cache hits (no tokens were spent). */
  tokensUsed: number | null
}

/**
 * Shape of the object returned by the onCacheMiss callback.
 * All fields optional — cache saving is skipped when resultText is null.
 */
export type WcInsightCacheMissResult = {
  resultText: string | null
  tokensUsed?: number | null
  provider?: string | null
  model?: string | null
  /** 'ready' (default) or 'blocked' — stored for downstream analytics. */
  status?: string
}

// ─── Internal helper ──────────────────────────────────────────────────────────

/**
 * Core get-or-create primitive.
 * Model is always stored as null in the cache key so the cached answer is
 * model-agnostic — switching providers doesn't cause spurious cache misses.
 */
async function getOrCreate(
  opts: {
    feature: string
    scopeType: string
    scopeId: string
    payload: unknown
    ttlSeconds: number
  },
  onCacheMiss: () => Promise<WcInsightCacheMissResult>
): Promise<WcInsightCacheResult> {
  // ── 1. Cache read ─────────────────────────────────────────────────────────
  try {
    const existing = await getCachedAiResult({
      feature: opts.feature,
      scopeType: opts.scopeType,
      scopeId: opts.scopeId,
      model: null, // model-agnostic cache key
      payload: opts.payload,
    })
    if (existing?.resultText) {
      return {
        cacheHit: true,
        text: existing.resultText,
        provider: existing.provider,
        model: existing.model,
        tokensUsed: null,
      }
    }
  } catch {
    // Cache read failure is non-fatal — fall through to LLM
  }

  // ── 2. Cache miss — call LLM (via callback) ───────────────────────────────
  const result = await onCacheMiss()

  // ── 3. Persist result (fire-and-forget — never blocks the user path) ──────
  if (result.resultText) {
    saveAiResult({
      feature: opts.feature,
      scopeType: opts.scopeType,
      scopeId: opts.scopeId,
      model: null, // model-agnostic key (see above)
      provider: result.provider ?? null,
      payload: opts.payload,
      resultText: result.resultText,
      status: result.status ?? 'ready',
      tokenOutput: result.tokensUsed ?? null,
      ttlSeconds: opts.ttlSeconds,
    }).catch(() => {
      // Cache write failure is non-fatal
    })
  }

  return {
    cacheHit: false,
    text: result.resultText ?? '',
    provider: result.provider ?? null,
    model: result.model ?? null,
    tokensUsed: result.tokensUsed ?? null,
  }
}

// ─── Chimmy private reply ─────────────────────────────────────────────────────

export type WcChimmyCacheInput = {
  userId: string
  challengeId: string
  /**
   * Lowercased, trimmed, max-400-char prompt.
   * Minor phrasing variations share the same cache entry.
   */
  promptNormalized: string
  /**
   * hashGroundingPacket() of the current pool state snapshot.
   * Changes when leaderboard, picks, or match results change.
   */
  groundingHash: string
}

/**
 * Cache for World Cup Chimmy private replies.
 *
 * TTL: 20 min (env AI_CACHE_TTL_CHIMMY_MINUTES).
 * Scope: per user × challenge × normalized prompt × grounding state.
 *
 * Same user asking the same question in the same pool state within TTL
 * → cache hit (no LLM call).
 * Pool data changes (new match result, leaderboard update)
 * → different groundingHash → cache miss.
 */
export async function getOrCreateWcChimmyInsight(
  input: WcChimmyCacheInput,
  onCacheMiss: () => Promise<WcInsightCacheMissResult>
): Promise<WcInsightCacheResult> {
  return getOrCreate(
    {
      feature: 'wc_chimmy',
      scopeType: 'user_challenge',
      scopeId: `${input.userId}:${input.challengeId}`,
      payload: {
        prompt: input.promptNormalized,
        groundingHash: input.groundingHash,
      },
      ttlSeconds: getAiCacheTtls().chimmy,
    },
    onCacheMiss
  )
}

// ─── Bracket explanation ──────────────────────────────────────────────────────

export type WcExplainBracketCacheInput = {
  userId: string
  entryId: string
  /**
   * hashGroundingPacket() of { champion, pickCount, entryName, challengeName, locale }.
   * Changes when the user updates a pick.
   */
  groundingHash: string
  locale?: string | null
}

/**
 * Cache for World Cup bracket explanation narratives.
 *
 * TTL: 6 hours (env AI_CACHE_TTL_EXPLAIN_HOURS).
 * Scope: per user × entry × pick state × locale.
 *
 * Expensive 600-token call. The narrative only changes when the user
 * updates a pick → groundingHash changes → cache miss.
 */
export async function getOrCreateWcExplainBracketInsight(
  input: WcExplainBracketCacheInput,
  onCacheMiss: () => Promise<WcInsightCacheMissResult>
): Promise<WcInsightCacheResult> {
  return getOrCreate(
    {
      feature: 'wc_explain_bracket',
      scopeType: 'user_entry',
      scopeId: `${input.userId}:${input.entryId}`,
      payload: {
        groundingHash: input.groundingHash,
        locale: input.locale ?? null,
      },
      ttlSeconds: getAiCacheTtls().explain_bracket,
    },
    onCacheMiss
  )
}

// ─── Commissioner brain ───────────────────────────────────────────────────────

export type WcCommissionerInsightCacheInput = {
  challengeId: string
  /**
   * The action kind ("hype", "standings", "trash_talk", "pool_swing", etc.).
   * Differentiates cache entries for different commissioner actions.
   */
  kind: string
  /**
   * hashGroundingPacket() of the deterministic base lines that were sent to
   * the LLM. When pool data changes → base lines change → hash changes →
   * cache miss → fresh AI enhancement generated.
   */
  groundingHash: string
}

/**
 * Cache for commissioner brain AI narrative enhancements.
 *
 * TTL: 30 min (env AI_CACHE_TTL_COMMISSIONER_BRAIN_MINUTES).
 * Scope: per challenge × action kind × pool state.
 *
 * Called for every commissioner action button — caching prevents
 * repeated LLM calls for stable pool state.
 */
export async function getOrCreateWcCommissionerInsight(
  input: WcCommissionerInsightCacheInput,
  onCacheMiss: () => Promise<WcInsightCacheMissResult>
): Promise<WcInsightCacheResult> {
  return getOrCreate(
    {
      feature: 'wc_commissioner',
      scopeType: 'challenge',
      scopeId: input.challengeId,
      payload: {
        kind: input.kind,
        groundingHash: input.groundingHash,
      },
      ttlSeconds: getAiCacheTtls().commissioner_brain,
    },
    onCacheMiss
  )
}

// ─── Matchup narrative ────────────────────────────────────────────────────────

export type WcMatchupInsightCacheInput = {
  matchId: string
  strategy: string
  /** 'panel' | 'ask_ai' | 'explain' — different intents get separate cache entries. */
  intent: string
  /** 0-100 integer percentage — changes when bracket model is re-run. */
  homePct: number
  awayPct: number
  upsetRisk: 'low' | 'medium' | 'high'
}

/**
 * Cache for World Cup matchup narratives (WHY / RISK / BRACKET paragraphs).
 *
 * TTL: 60 minutes — bracket model probabilities are static per tournament round.
 * Scope: per match × strategy × intent × model output.
 *
 * Same match, same strategy, same probabilities → cache hit for 60 min.
 */
export async function getOrCreateWcMatchupInsight(
  input: WcMatchupInsightCacheInput,
  onCacheMiss: () => Promise<WcInsightCacheMissResult>
): Promise<WcInsightCacheResult> {
  const TTL_60_MIN = 60 * 60
  return getOrCreate(
    {
      feature: 'wc_matchup',
      scopeType: 'match',
      scopeId: input.matchId,
      payload: {
        strategy: input.strategy,
        intent: input.intent,
        homePct: input.homePct,
        awayPct: input.awayPct,
        upsetRisk: input.upsetRisk,
      },
      ttlSeconds: TTL_60_MIN,
    },
    onCacheMiss
  )
}
