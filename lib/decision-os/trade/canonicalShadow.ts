/**
 * Decision OS — Phase E.4: the canonical `TradeWorld` shadow attempt.
 *
 * Runs the approved canonical pipeline BESIDE the existing redraft-native trade shadow:
 *
 *     CanonicalWorld → TradeWorldResolver → CanonicalTradeMemo → manager.trade.evaluate
 *
 * It is SHADOW-ONLY and PARITY-FIRST. The native (redraft) shadow path runs FIRST and is untouched;
 * this attempt runs alongside it for parity/telemetry. It NEVER throws, NEVER writes, NEVER persists,
 * NEVER warms a cache, and NEVER mutates a proposal/snapshot — the injected `resolveWorld` is read-only
 * (default `resolveCanonicalWorld`, whose default port is prisma find* only).
 *
 * When canonical inputs are unavailable it returns a STRUCTURED SKIP (never an error):
 *   • `canonical_trade_world_unavailable`      — no canonical world, or it doesn't describe BOTH
 *                                                participant rosters (the known redraft↔canonical
 *                                                roster-identity mismatch; full join lands in E.5).
 *   • `canonical_asset_resolution_unavailable` — the trade assets could not be staged into canonical
 *                                                movements (no assets / resolution produced nothing).
 *   • `canonical_memo_unavailable`             — the two-sided canonical memo could not be produced
 *                                                (multi-team trade, or the engine threw).
 *
 * Honest-degraded parity (documented, intentional): E.3 deferred the ADP/projection port, so no market
 * enrichment is injected here yet. Player values floor to 0 and the canonical snapshot DIFFERS from the
 * redraft snapshot — parity records `passed: false` with the diffs honestly. Full parity arrives in E.5
 * once the read-only enrichment seam feeds `MarketContext`. The attempt never fabricates parity (P3).
 *
 * Telemetry: emits `decision.shadow_parity` with `source: 'canonical_trade_world'` and the completeness /
 * uncertainty / asset-count / participant-count / memo-source / valuation-source signals. The provider
 * name appears ONLY under `provenance` (debug/audit) — never in a decision-facing flag.
 */
import type { TradeValueSnapshot } from '@/lib/trade-value/types'
import type { CanonicalWorld } from '@/lib/decision-os/world/facts'
import { resolveCanonicalWorld } from '@/lib/decision-os/world'
import { fromAfLeagueTradeItems, resolveCanonicalAssets, type AfLeagueTradeItemRow } from '@/lib/decision-os/world/assets'
import { emitShadowParity } from '@/lib/decision-os/core/parity'
import { resolveTradeWorld } from './tradeWorld'
import {
  buildTradeMemo,
  compareTradeMemos,
  type CanonicalTradeMemo,
  type TradeMemoParityResult,
  type TradeMovement,
} from './canonicalMemo'
import { deriveParticipants, type TradeAssetSummary } from './dco'

export type CanonicalTradeShadowSkipReason =
  | 'canonical_trade_world_unavailable'
  | 'canonical_asset_resolution_unavailable'
  | 'canonical_memo_unavailable'

/** Pure telemetry record for the canonical attempt — built whether it ran or skipped, then emitted. */
export interface CanonicalTradeShadowTelemetry {
  decision_type: 'manager.trade.evaluate'
  /** ALWAYS 'canonical_trade_world' here — distinguishes this attempt from the `redraft_native` path. */
  source: 'canonical_trade_world'
  ran: boolean
  reason?: CanonicalTradeShadowSkipReason
  asset_count: number
  participant_count: number
  memo_source?: 'canonical_world'
  valuation_source?: 'deterministic_engine'
  completeness?: number
  uncertainty_count?: number
  parity?: { passed: boolean; value_totals_match: boolean; grade_match: boolean; diffs: number }
  /** Provenance/debug ONLY — provider name never appears in a decision-facing field. */
  provenance?: { provider: string | null; asset_source_models: string[] }
}

export interface CanonicalTradeShadowResult {
  ran: boolean
  skipReason?: CanonicalTradeShadowSkipReason
  /** Present only when `ran` is true. */
  memo?: CanonicalTradeMemo
  parity?: TradeMemoParityResult
  telemetry: CanonicalTradeShadowTelemetry
}

export interface CanonicalTradeShadowArgs {
  leagueId: string
  proposerRosterId: string
  receiverRosterId: string
  assets: TradeAssetSummary[]
  /** The persisted redraft snapshot the native path already parsed — the parity reference. */
  referenceSnapshot: TradeValueSnapshot
  proposalId: string
  /** Optional pick-discount season; the resolver defaults to the world's season when absent. */
  currentSeason?: number | null
}

export interface CanonicalTradeShadowDeps {
  /** READ-ONLY canonical world resolver. Default `resolveCanonicalWorld` (find* port only). */
  resolveWorld: (leagueId: string) => Promise<CanonicalWorld | null>
}

const defaultDeps: CanonicalTradeShadowDeps = {
  resolveWorld: (leagueId) => resolveCanonicalWorld(leagueId),
}

/** Stage the redraft trade-asset summaries into canonical `AfLeagueTradeItem` rows (neutral graph). */
function toTradeItemRows(assets: TradeAssetSummary[]): AfLeagueTradeItemRow[] {
  return assets.map((a, i) => ({
    id: `mv_${i}`,
    itemType: a.assetType,
    // `fromAfLeagueTradeItems` reads `itemReference` as the player id for player-ish types.
    itemReference: a.playerId,
    fromRosterId: a.fromRosterId,
    toRosterId: a.toRosterId,
    faabAmount: a.faabAmount,
    metadata: a.playerName ? { playerName: a.playerName } : {},
  }))
}

/** Stage assets → canonical movements (`CanonicalAsset` + direction). Pure; order-preserving. */
function buildMovements(assets: TradeAssetSummary[], origin: string | null): TradeMovement[] {
  const rows = toTradeItemRows(assets)
  const inputs = fromAfLeagueTradeItems(rows, origin)
  const canonical = resolveCanonicalAssets(inputs)
  return canonical.map((asset, i) => ({ asset, fromRosterId: inputs[i].fromRosterId, toRosterId: inputs[i].toRosterId }))
}

/** Flatten the telemetry record into `emitShadowParity` flags (provider stays nested under provenance). */
function toShadowParityFlags(t: CanonicalTradeShadowTelemetry, proposalId: string): Record<string, unknown> {
  return {
    shadow: true,
    source: t.source,
    ran: t.ran,
    proposalId,
    ...(t.reason ? { reason: t.reason } : {}),
    asset_count: t.asset_count,
    participant_count: t.participant_count,
    ...(t.memo_source ? { memo_source: t.memo_source } : {}),
    ...(t.valuation_source ? { valuation_source: t.valuation_source } : {}),
    ...(t.completeness != null ? { completeness: t.completeness } : {}),
    ...(t.uncertainty_count != null ? { uncertainty_count: t.uncertainty_count } : {}),
    ...(t.parity
      ? {
          parity_passed: t.parity.passed,
          value_totals_match: t.parity.value_totals_match,
          grade_match: t.parity.grade_match,
          parity_diffs: t.parity.diffs,
        }
      : {}),
    // Provider lives ONLY here — never in a decision-facing flag above.
    ...(t.provenance ? { provenance: t.provenance } : {}),
  }
}

function skip(
  reason: CanonicalTradeShadowSkipReason,
  args: CanonicalTradeShadowArgs,
  counts: { asset_count: number; participant_count: number },
): CanonicalTradeShadowResult {
  const telemetry: CanonicalTradeShadowTelemetry = {
    decision_type: 'manager.trade.evaluate',
    source: 'canonical_trade_world',
    ran: false,
    reason,
    asset_count: counts.asset_count,
    participant_count: counts.participant_count,
  }
  emitShadowParity('manager.trade.evaluate', toShadowParityFlags(telemetry, args.proposalId), args.proposalId)
  return { ran: false, skipReason: reason, telemetry }
}

/**
 * Attempt the canonical `TradeWorld` shadow for one proposal. Best-effort, read-only, never throws.
 * Returns `{ ran: true, memo, parity }` when the canonical pipeline produced a memo, else a structured
 * `{ ran: false, skipReason }`. Always emits exactly one `decision.shadow_parity` telemetry event.
 */
export async function runCanonicalTradeShadowAttempt(
  args: CanonicalTradeShadowArgs,
  deps: Partial<CanonicalTradeShadowDeps> = {},
): Promise<CanonicalTradeShadowResult> {
  const resolveWorld = deps.resolveWorld ?? defaultDeps.resolveWorld
  const assetCount = args.assets.length
  const participantCount = deriveParticipants(args.assets).length
  const counts = { asset_count: assetCount, participant_count: participantCount }

  try {
    // 1. Canonical world (read-only). null or a world that doesn't cover BOTH participant rosters ⇒ the
    //    canonical layer cannot describe THIS proposal yet (redraft↔canonical roster-identity mismatch).
    let world: CanonicalWorld | null = null
    try {
      world = await resolveWorld(args.leagueId)
    } catch {
      world = null
    }
    if (!world) return skip('canonical_trade_world_unavailable', args, counts)

    const rosterIds = new Set(world.rosters.map((r) => r.rosterId))
    if (!rosterIds.has(args.proposerRosterId) || !rosterIds.has(args.receiverRosterId)) {
      return skip('canonical_trade_world_unavailable', args, counts)
    }

    // 2. Assets → canonical movements.
    let movements: TradeMovement[]
    try {
      movements = buildMovements(args.assets, world.provenance.provider)
    } catch {
      return skip('canonical_asset_resolution_unavailable', args, counts)
    }
    if (movements.length === 0) return skip('canonical_asset_resolution_unavailable', args, counts)

    // The canonical memo is strictly two-sided (proposer → receiver). Multi-team trades are honestly
    // unsupported by it (the native DCO already flags them) — skip, never invent a multi-team valuation.
    if (participantCount !== 2) return skip('canonical_memo_unavailable', args, counts)

    // 3. TradeWorld → canonical memo. No enrichment is injected yet (E.5 ADP/projection port) ⇒ the memo
    //    degrades honestly (player values floor to 0); it never fabricates a value.
    let memo: CanonicalTradeMemo
    try {
      const tradeWorld = resolveTradeWorld({
        world,
        movements,
        proposerRosterId: args.proposerRosterId,
        receiverRosterId: args.receiverRosterId,
        currentSeason: args.currentSeason,
      })
      memo = buildTradeMemo(tradeWorld)
    } catch {
      return skip('canonical_memo_unavailable', args, counts)
    }
    if (!memo?.snapshot) return skip('canonical_memo_unavailable', args, counts)

    // 4. Parity vs the persisted redraft snapshot + telemetry. Differences are reported, never hidden.
    const parity = compareTradeMemos(memo.snapshot, args.referenceSnapshot)
    const telemetry: CanonicalTradeShadowTelemetry = {
      decision_type: 'manager.trade.evaluate',
      source: 'canonical_trade_world',
      ran: true,
      asset_count: assetCount,
      participant_count: participantCount,
      memo_source: memo.provenance.memoSource,
      valuation_source: memo.provenance.valuationSource,
      completeness: memo.completeness,
      uncertainty_count: memo.uncertainty.length,
      parity: { passed: parity.passed, value_totals_match: parity.valueTotalsMatch, grade_match: parity.gradeMatch, diffs: parity.diffs.length },
      provenance: { provider: memo.provenance.provider, asset_source_models: memo.provenance.assetSourceModels },
    }
    emitShadowParity('manager.trade.evaluate', toShadowParityFlags(telemetry, args.proposalId), args.proposalId)
    return { ran: true, memo, parity, telemetry }
  } catch {
    // Defensive belt-and-suspenders: the canonical attempt must NEVER affect the native shadow.
    return skip('canonical_memo_unavailable', args, counts)
  }
}
