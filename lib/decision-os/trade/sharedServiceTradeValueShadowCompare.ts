/**
 * Trade Value Console — shadow-compare seam (Phase 18).
 *
 * Runs BESIDE the legacy /api/trade-value/analyze response, comparing each
 * resolved player asset's identity (and, secondarily, its market value)
 * against the canonical PlayerIdentityResolver (Phase 14). See
 * `lib/shared-services/trade/TradeValueConsoleShadowService.ts`'s docstring
 * for why this is scoped to identity/value cross-check rather than a full
 * fairness-score comparison — the existing roster-pair-based
 * `lib/shared-services/trade/TradeShadowService.ts` does not apply to this
 * route (no roster ids exist in its request shape).
 *
 * NEVER affects the legacy response. NEVER throws past this module's own
 * boundary. Gated by SHARED_SERVICES_TRADE_SHADOW_COMPARE, read via the
 * same shouldRunShadow()/DecisionShadowScope convention every other
 * Decision OS slice uses — not a new flag framework.
 */

import { shouldRunShadow, type DecisionShadowScope } from '@/lib/decision-os/core/shadow'
import { emitShadowParity } from '@/lib/decision-os/core/parity'
import {
  evaluateTradeValueConsoleShadow,
  type TradeValueConsoleAssetInput,
  type TradeValueConsoleShadowResult,
} from '@/lib/shared-services/trade/TradeValueConsoleShadowService'

const SHARED_TRADE_SHADOW_COMPARE_FLAG = 'SHARED_SERVICES_TRADE_SHADOW_COMPARE'

/**
 * Chosen from real measurement (Phase 18), NOT copied from Waiver's 4000ms.
 * A 12-run local benchmark against `.env.test` (real FantasyCalc API + real
 * PlayerIdentityMap/SportsPlayer DB queries) found: cold run (first
 * FantasyCalc fetch, uncached) 2539ms; warm runs (cached FantasyCalc,
 * DB-only resolution) 0-231ms, p50 20ms. The bottleneck is entirely the
 * external FantasyCalc HTTP call, which only happens once per warm process
 * — but since this seam may run cold on each fresh serverless invocation
 * (module-level caches aren't guaranteed to persist), the bound is set to
 * ~2.4x the one observed real cold-start sample to absorb realistic network
 * variance, not an arbitrary round number. See
 * docs/os/FANTASY_OS_TRADE_SHADOW_COMPARE.md's "Timeout rationale" section
 * for the full evidence and this reasoning.
 */
export const TRADE_SHADOW_COMPARE_TIMEOUT_MS = 6000

export function shouldRunSharedTradeShadowCompare(
  env: NodeJS.ProcessEnv = process.env,
  scope?: DecisionShadowScope,
): boolean {
  return shouldRunShadow(SHARED_TRADE_SHADOW_COMPARE_FLAG, env, scope)
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

export type TradeValueShadowCompareStatus =
  | 'equivalent'
  | 'partial_identity_unresolved'
  | 'identity_unresolvable'
  | 'unsupported'
  | 'shadow_execution_failure'

export interface TradeValueShadowCompareResult {
  ran: boolean
  status: TradeValueShadowCompareStatus
  assetCount: number
  resolvedCount: number
  unresolvedCount: number
  sharedServiceDurationMs: number | null
  totalDurationMs: number
  failureReason: string | null
}

export interface RunSharedTradeValueShadowCompareArgs {
  leagueId: string | null
  assets: TradeValueConsoleAssetInput[]
  authoritativeDurationMs: number
}

/**
 * Runs the Trade Value Console shadow identity/value cross-check and emits
 * telemetry. Never throws. Never alters the caller's response — the route
 * is expected to await this without changing anything it already computed.
 */
export async function runSharedTradeValueShadowCompare(
  args: RunSharedTradeValueShadowCompareArgs
): Promise<TradeValueShadowCompareResult> {
  const totalStart = Date.now()
  const base = {
    ran: false as const,
    assetCount: args.assets.length,
    resolvedCount: 0,
    unresolvedCount: 0,
    sharedServiceDurationMs: null,
    failureReason: null,
  }

  if (args.assets.length === 0) {
    const result: TradeValueShadowCompareResult = { ...base, status: 'unsupported', totalDurationMs: Date.now() - totalStart }
    emitShadowParity('shared_services.trade', {
      compare: true,
      ran: false,
      reason: 'no_player_assets',
      leagueId: args.leagueId,
      comparisonVersion: 'phase18-trade-value-console',
    })
    return result
  }

  const sharedStart = Date.now()
  try {
    const evaluation: TradeValueConsoleShadowResult = await withTimeout(
      evaluateTradeValueConsoleShadow(args.assets),
      TRADE_SHADOW_COMPARE_TIMEOUT_MS,
      'trade value console shadow evaluation'
    )
    const sharedServiceDurationMs = Date.now() - sharedStart

    const result: TradeValueShadowCompareResult = {
      ...base,
      ran: true,
      status: evaluation.status,
      resolvedCount: evaluation.resolvedCount,
      unresolvedCount: evaluation.unresolvedCount,
      sharedServiceDurationMs,
      totalDurationMs: Date.now() - totalStart,
    }

    emitShadowParity('shared_services.trade', {
      compare: true,
      ran: true,
      status: evaluation.status,
      leagueId: args.leagueId,
      route: 'trade-value-console',
      assetCount: args.assets.length,
      resolvedCount: evaluation.resolvedCount,
      unresolvedCount: evaluation.unresolvedCount,
      authoritativeDurationMs: args.authoritativeDurationMs,
      sharedServiceDurationMs,
      totalDurationMs: Date.now() - totalStart,
      comparisonVersion: 'phase18-trade-value-console',
    })

    return result
  } catch (err) {
    const isTimeout = err instanceof Error && err.message.includes('timed out')
    const result: TradeValueShadowCompareResult = {
      ...base,
      ran: true,
      status: 'shadow_execution_failure',
      sharedServiceDurationMs: Date.now() - sharedStart,
      totalDurationMs: Date.now() - totalStart,
      failureReason: err instanceof Error ? err.message : 'shared_service_error',
    }
    emitShadowParity('shared_services.trade', {
      compare: true,
      ran: true,
      status: 'shadow_execution_failure',
      reason: isTimeout ? 'timeout' : 'exception',
      leagueId: args.leagueId,
      route: 'trade-value-console',
      totalDurationMs: Date.now() - totalStart,
      comparisonVersion: 'phase18-trade-value-console',
    })
    return result
  }
}
