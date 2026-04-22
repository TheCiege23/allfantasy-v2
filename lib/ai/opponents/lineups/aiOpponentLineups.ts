/**
 * Weekly lineup — greedy by projected points with injury/bye penalties.
 */

import type { BotProfile, LineupDecision, LineupPlayer, LineupSlotRequirement } from "../types"

export type LineupContext = {
  bot: BotProfile
  week: number
  slots: LineupSlotRequirement[]
  players: LineupPlayer[]
  irEligibleIds?: Set<string>
  taxiIds?: Set<string>
}

function penalty(p: LineupPlayer, bot: BotProfile): number {
  let pen = 0
  if (p.isBye) pen += 50
  const st = (p.injuryStatus || "").toLowerCase()
  if (st.includes("out") || st.includes("ir")) pen += 80
  else if (st.includes("doubt")) pen += 25 * (1 + bot.tendencies.riskTolerance)
  else if (st.includes("ques")) pen += 8
  return pen
}

export function decideLineup(ctx: LineupContext): LineupDecision {
  const { slots, players, bot } = ctx
  const pool = players.filter((p) => !ctx.taxiIds?.has(p.playerId))
  // IR-designated players stay off starting lineup unless your league rules allow (stub: exclude from starters)
  const usable = pool.filter((p) => !ctx.irEligibleIds?.has(p.playerId))

  const startersBySlot: Record<string, string> = {}
  const taken = new Set<string>()

  const sorted = [...usable].sort(
    (a, b) => b.projectedPoints - penalty(b, bot) - (a.projectedPoints - penalty(a, bot)),
  )

  for (const slot of slots) {
    const pick = sorted.find((p) => !taken.has(p.playerId) && canFillSlot(p, slot))
    if (pick) {
      startersBySlot[slot.slotId] = pick.playerId
      taken.add(pick.playerId)
    }
  }

  const benchPlayerIds = pool.filter((p) => !taken.has(p.playerId)).map((p) => p.playerId)

  return {
    startersBySlot,
    benchPlayerIds,
    reason: "Greedy start by projection with injury/bye penalties weighted by risk tolerance",
  }
}

function canFillSlot(p: LineupPlayer, slot: LineupSlotRequirement): boolean {
  const pos = p.position.toUpperCase()
  return slot.positions.some((allow) => pos.includes(allow) || allow === "FLEX" || allow === "FLX")
}
