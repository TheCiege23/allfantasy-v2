/**
 * Decision OS Replay Framework — generic, provider-agnostic, decision-type-
 * agnostic contracts, per docs/SLEEPER_TRADE_REPLAY_ARCHITECTURE_ADR.md.
 *
 * First implementation: Sleeper trades. The types below intentionally carry
 * no Sleeper-specific or trade-specific fields at the top level — only
 * `payload`/`backtestedOutput`/`realOutcome` vary per decision type, exactly
 * mirroring the schema's own `Json` fields. Adding a future replay type
 * (waiver, draft, lineup, commissioner_action, roster_move) means adding a
 * new normalizer/backtest-executor pair, never a schema migration.
 */

export type ReplayDecisionType = 'trade' | 'waiver' | 'draft' | 'lineup' | 'commissioner_action' | 'roster_move'

export interface ReplayImportInput {
  provider: string
  decisionType: ReplayDecisionType
  providerLeagueId: string
  providerTransactionId: string
  season: number
  providerWeek: number | null
  proposedAt: Date
  resolvedAt: Date | null
  providerStatus: string
  participantsInvolved: unknown
  managerUserIds: unknown
  managerDisplayNames: unknown
  payload: unknown
  rawProviderPayload: unknown
  contextSnapshot: unknown
  isDynasty: boolean | null
  isSuperFlex: boolean | null
  ingestSourceUserId: string
}

export interface BacktestResultInput {
  replayId: string
  decisionType: ReplayDecisionType
  modelVersion: string
  engineVersionHash: string
  deterministicConfigVersion: string
  backtestedOutput: unknown
  realOutcome: unknown | null
}

/** A roster player/pick usable as trade-engine `Asset` input — a subset of `Asset`'s fields, just enough for `computeTradeDrivers()`'s roster-context lineup math (`pos` is required for a player to count toward `computeBestLineupPPG()`). */
export interface TradeReplayRosterAsset {
  name: string
  value: number
  type: string
  pos?: string
}

/**
 * Trade-specific shape stored in `ReplayImport.payload` (decisionType: 'trade').
 * `proposerRoster`/`counterpartyRoster` are optional and additive (Phase 6,
 * per docs/SLEEPER_TRADE_REPLAY_ARCHITECTURE_ADR.md §11) — rows ingested
 * before Phase 6 simply have them `undefined`, handled gracefully by the
 * backtest executor (falls back to no roster context, exactly like before).
 */
export interface TradeReplayPayload {
  assetsGiven: Array<{ name: string; value: number; type: string }>
  assetsReceived: Array<{ name: string; value: number; type: string }>
  proposerRoster?: TradeReplayRosterAsset[]
  counterpartyRoster?: TradeReplayRosterAsset[]
}

/** Trade-specific shape stored in `ReplayBacktestResult.backtestedOutput`. */
export interface TradeBacktestOutput {
  acceptProb: number
  verdict: string
  confidenceScore: number
  lineupImpactScore: number
  vorpScore: number
  marketScore: number
  behaviorScore: number
}

/** Trade-specific shape stored in `ReplayBacktestResult.realOutcome` — only populated once the underlying trade's provider status reflects a resolved decision. */
export interface TradeRealOutcome {
  outcome: 'ACCEPTED' | 'REJECTED' | 'COUNTERED' | 'UNKNOWN'
  providerStatus: string
}
