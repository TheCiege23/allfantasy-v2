/**
 * FAAB / waiver claim ordering — deterministic heuristics.
 */

import type { BotProfile, WaiverClaimCandidate, WaiverDecision } from "../types"

export type WaiverContext = {
  bot: BotProfile
  budgetRemaining: number
  minBid: number
  isFaab: boolean
  tiebreakHint?: "rolling" | "reverse_standings" | "fcfs"
  candidates: WaiverClaimCandidate[]
  /** League waiver aggression from commissioner settings 0–1 */
  leagueWaiverAggression?: number
}

export function decideWaiverClaims(ctx: WaiverContext): WaiverDecision {
  const { bot, candidates, budgetRemaining, minBid, isFaab } = ctx
  const agg = bot.tendencies.waiverAggression * (ctx.leagueWaiverAggression ?? 0.6) + 0.2

  const scored = candidates.map((c) => {
    const base = c.upside * (1 - bot.tendencies.floorVsUpside) + c.floor * bot.tendencies.floorVsUpside
    const need = c.needBonus
    const score = base * 12 + need * 5 + c.upside * bot.tendencies.riskTolerance * 3
    return { c, score }
  })

  scored.sort((a, b) => b.score - a.score)

  const orderedClaims = scored.slice(0, 12).map(({ c }, i) => {
    let bid = minBid
    if (isFaab) {
      const share = agg * (1 - i * 0.06)
      bid = Math.min(budgetRemaining, Math.max(minBid, Math.floor(budgetRemaining * share * 0.35)))
    }
    return {
      playerId: c.playerId,
      faabBid: bid,
      reason: `Priority ${i + 1}: upside/floor vs need`,
    }
  })

  return { orderedClaims }
}
