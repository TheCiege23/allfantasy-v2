/**
 * Decision OS — shadow runner for `manager.trade.evaluate` (Slice 3 integration).
 *
 * Runs the Decision OS trade-evaluation path BESIDE the proposal-create response, compares parity
 * (WRAP-FIDELITY: fed the same persisted deterministic snapshot), logs status, and NEVER throws or
 * affects the legacy response. Gated by DECISION_OS_TRADE_SHADOW. The Decision OS evaluates ONLY — it
 * never creates/accepts/rejects/cancels/counters/votes/vetoes/processes/settles a trade, and never
 * mutates rosters/FAAB/trade state.
 */
import { emitShadowParity } from '@/lib/decision-os/core/parity'
import { shouldRunShadow, type DecisionShadowScope } from '@/lib/decision-os/core/shadow'
import type { TradeValueSnapshot } from '@/lib/trade-value/types'
import { runTradeEvaluateDecision, type RunTradeEvaluateResult } from './index'
import type { TradeAssetSummary, TradeProposalContext } from './dco'
import { loadTradeWorldFacts, worldInputFromFacts, parseTradeSnapshot, type TradeWorldFacts } from './loader'
import { buildProductionTradeDecisionDeps } from './deps'
import type { TradeDecisionDeps } from './decision'

export function shouldRunTradeShadow(
  env: NodeJS.ProcessEnv = process.env,
  scope?: DecisionShadowScope,
): boolean {
  return shouldRunShadow('DECISION_OS_TRADE_SHADOW', env, scope)
}

export interface TradeShadowResult {
  ran: boolean
  proposalId: string
  result?: RunTradeEvaluateResult
  error?: string
}

export interface TradeShadowDeps {
  loadWorldFacts: (input: { leagueId: string; seasonId: string; proposerRosterId: string; receiverRosterId: string }) => Promise<TradeWorldFacts | null>
  /** Build the decision deps from the persisted deterministic snapshot (the wrap-fidelity memo). */
  buildDecisionDeps: (memo: TradeValueSnapshot) => TradeDecisionDeps
}

const defaultTradeShadowDeps: TradeShadowDeps = {
  loadWorldFacts: (input) => loadTradeWorldFacts(input),
  buildDecisionDeps: (memo) => buildProductionTradeDecisionDeps(memo),
}

/**
 * Shadow one proposal's trade evaluation. The decision is fed the SAME persisted deterministic
 * snapshot the route captured, and parity compares the Decision OS evaluation against it — proving
 * the wrapper introduces NO drift. Never throws; never mutates trade state.
 */
export async function runTradeShadowForProposal(
  args: {
    userId: string
    leagueId: string
    seasonId: string
    proposal: TradeProposalContext
    assets: TradeAssetSummary[]
    /** The persisted snapshot row payload (JSON) the route already read. */
    snapshotPayload: unknown
    snapshotConfidenceScore?: number | null
  },
  deps: Partial<TradeShadowDeps> = {},
): Promise<TradeShadowResult> {
  const loadWorldFacts = deps.loadWorldFacts ?? defaultTradeShadowDeps.loadWorldFacts
  const buildDecisionDeps = deps.buildDecisionDeps ?? defaultTradeShadowDeps.buildDecisionDeps
  const proposalId = args.proposal.proposalId
  try {
    const snapshot = parseTradeSnapshot(args.snapshotPayload)
    if (!snapshot) {
      emitShadowParity('manager.trade.evaluate', { shadow: true, ran: false, reason: 'missing_snapshot', proposalId })
      return { ran: false, proposalId, error: 'missing_snapshot' }
    }
    const facts = await loadWorldFacts({
      leagueId: args.leagueId,
      seasonId: args.seasonId,
      proposerRosterId: args.proposal.proposerRosterId,
      receiverRosterId: args.proposal.receiverRosterId,
    })
    if (!facts) {
      emitShadowParity('manager.trade.evaluate', { shadow: true, ran: false, reason: 'inputs_unavailable', proposalId })
      return { ran: false, proposalId, error: 'inputs_unavailable' }
    }
    const result = await runTradeEvaluateDecision(
      {
        worldInput: worldInputFromFacts(facts, true),
        userId: args.userId,
        leagueId: args.leagueId,
        sport: facts.sport,
        proposal: args.proposal,
        assets: args.assets,
        snapshotConfidenceScore: args.snapshotConfidenceScore ?? snapshot.grade.confidenceScore ?? null,
      },
      {
        decision: buildDecisionDeps(snapshot),
        shadow: { snapshot },
      },
    )
    return { ran: true, proposalId, result }
  } catch (e) {
    emitShadowParity('manager.trade.evaluate', { shadow: true, ran: false, reason: 'shadow_error', proposalId })
    return { ran: false, proposalId, error: e instanceof Error ? e.message : 'shadow_error' }
  }
}
