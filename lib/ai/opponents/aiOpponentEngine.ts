/**
 * Central facade — deterministic decisions. Optional LLM copy can wrap these results later.
 */

import type {
  AiOpponentsLeagueSettings,
  BotProfile,
  DraftDecisionContext,
  DraftPickDecision,
  LineupDecision,
  TeamStrategyMode,
  TradeEvaluationContext,
  TradeProposalDecision,
  TradeResponseDecision,
  WaiverDecision,
} from "./types"
import { decideDraftPick, suggestPreDraftQueue } from "./draft/aiOpponentDraft"
import { decideLineup, type LineupContext } from "./lineups/aiOpponentLineups"
import { decideTradeOffer, decideTradeResponse } from "./trades/aiOpponentTrades"
import { decideWaiverClaims, type WaiverContext } from "./waivers/aiOpponentWaivers"
import type { BotLeagueMemoryState } from "./botMemory"

export function decideDraftPickRequest(ctx: DraftDecisionContext): DraftPickDecision {
  return decideDraftPick(ctx)
}

export function decideQueueRequest(bot: BotProfile, players: DraftDecisionContext["available"], limit: number): string[] {
  return suggestPreDraftQueue(bot, players, limit)
}

export function decideWaiverClaimsRequest(ctx: WaiverContext): WaiverDecision {
  return decideWaiverClaims(ctx)
}

export function decideLineupRequest(ctx: LineupContext): LineupDecision {
  return decideLineup(ctx)
}

export function decideTradeResponseRequest(ctx: TradeEvaluationContext): TradeResponseDecision {
  return decideTradeResponse(ctx)
}

export function decideTradeOfferRequest(bot: BotProfile, leagueId: string, teamId: string, cooldownBlocks: boolean): TradeProposalDecision {
  return decideTradeOffer(bot, leagueId, teamId, cooldownBlocks)
}

export type DropCandidateContext = {
  bot: BotProfile
  rosterPlayerIds: string[]
  /** Lower score = drop first */
  scoresByPlayerId: Record<string, number>
  minToDrop: number
}

/** Drop worst projected bench players when roster illegal / bye crunch */
export function decideDropCandidates(ctx: DropCandidateContext): string[] {
  const ranked = [...ctx.rosterPlayerIds].sort((a, b) => (ctx.scoresByPlayerId[a] ?? 0) - (ctx.scoresByPlayerId[b] ?? 0))
  return ranked.slice(0, ctx.minToDrop)
}

export type RosterMovePlan = {
  adds: string[]
  drops: string[]
  reason: string
}

export function decideRosterMoves(_bot: BotProfile, memory: BotLeagueMemoryState): RosterMovePlan {
  return {
    adds: [],
    drops: [],
    reason: `Strategy ${memory.strategyMode}: no forced moves in stub`,
  }
}

export function decideLongTermPlan(bot: BotProfile, record: { wins: number; losses: number }): TeamStrategyMode {
  const total = record.wins + record.losses
  if (total < 4) return "neutral"
  const pct = record.wins / Math.max(1, total)
  if (pct >= 0.62 && bot.tendencies.winNowVsFuture > 0.2) return "contend"
  if (pct <= 0.38 && bot.tendencies.winNowVsFuture < -0.1) return "rebuild"
  return "neutral"
}

export function aiOpponentsEnabled(settings: AiOpponentsLeagueSettings | null | undefined): boolean {
  return Boolean(settings?.enabled)
}

export function mockOnlyBlocksLive(settings: AiOpponentsLeagueSettings | undefined, isMockDraft: boolean): boolean {
  if (!settings?.mockDraftsOnly) return false
  return !isMockDraft
}

export type ExplainLayer = {
  line?: string
}

/** Hook for future LLM — never throws */
export async function optionalPersonalityLine(
  _bot: BotProfile,
  kind: "draft" | "waiver" | "trade" | "lineup",
  _ctx: unknown
): Promise<ExplainLayer | null> {
  if (process.env.AI_OPPONENT_LLM_EXPLAIN === "1") {
    return { line: `[${kind}]` }
  }
  return null
}
