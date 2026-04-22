/**
 * Trade accept / reject / counter — value-based with archetype skew.
 */

import type { BotProfile, TradeAsset, TradeEvaluationContext, TradeProposalDecision, TradeResponseDecision } from "../types"
import { getPersonalityForArchetype } from "../botPersonality"
import { flavorForTradeDecision } from "../botVoiceTemplates"

function sumValue(assets: TradeAsset[]): number {
  return assets.reduce((s, a) => s + (a.value || 0), 0)
}

export function decideTradeResponse(ctx: TradeEvaluationContext): TradeResponseDecision {
  const give = sumValue(ctx.incomingGive)
  const recv = sumValue(ctx.incomingReceive)
  const net = recv - give
  const w = ctx.bot.tendencies

  let adjusted = net
  if (ctx.strategyMode === "rebuild") adjusted += (ctx.incomingReceive.some((a) => a.kind === "pick") ? 8 : 0) * w.pickHoarding
  if (ctx.strategyMode === "contend") adjusted += w.vetBuyerWeight * 3

  adjusted += (hashString(ctx.bot.botId) % 7) - 3 // ±3 deterministic tiebreak

  const personality = getPersonalityForArchetype(ctx.bot.archetypeId)

  if (adjusted >= 4) {
    const decision: TradeResponseDecision["decision"] = "accept"
    return {
      decision: "accept",
      confidence: Math.min(0.95, 0.55 + adjusted / 40),
      reasoning: "Net value positive for team build",
      publicLine: flavorForTradeDecision(decision, personality),
    }
  }
  if (adjusted <= -4) {
    const decision: TradeResponseDecision["decision"] = "reject"
    return {
      decision: "reject",
      confidence: 0.75,
      reasoning: "Not enough value to move assets",
      publicLine: flavorForTradeDecision(decision, personality),
    }
  }

  const decision: TradeResponseDecision["decision"] = "reject"
  return {
    decision: "reject",
    confidence: 0.55,
    reasoning: "Marginal — hold unless package improves",
    publicLine: flavorForTradeDecision(decision, personality),
  }
}

function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h | 0)
}

export function decideTradeOffer(
  bot: BotProfile,
  _leagueId: string,
  _teamId: string,
  cooldownBlocks: boolean
): TradeProposalDecision {
  if (cooldownBlocks) return { shouldPropose: false }
  const roll = hashString(bot.botId) % 100
  const threshold = 85 - bot.tendencies.tradeAggression * 30
  if (roll > threshold) return { shouldPropose: true, reasoning: "Periodic exploratory offer window" }
  return { shouldPropose: false }
}
