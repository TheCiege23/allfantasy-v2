/**
 * In-league bot memory — JSON blob merged server-side (`AiOpponentLeagueMemory.stateJson`).
 * Pure functions: safe to unit test without DB.
 */

import type { TeamStrategyMode } from "./types"

export type BotMemoryRosterSnapshot = {
  playerIds: string[]
  byPosition: Record<string, number>
}

export type BotLeagueMemoryState = {
  leagueId: string
  botId: string
  roster: BotMemoryRosterSnapshot
  picksOwned: string[]
  recentMoves: Array<{ type: string; summary: string; at: string }>
  recentClaims: Array<{ playerId: string; at: string }>
  tradeHistorySummaries: string[]
  positionStrength: Record<string, number>
  positionWeakness: Record<string, number>
  strategyMode: TeamStrategyMode
  targetPlayerIds: string[]
  avoidPlayerIds: string[]
  notes?: string
  updatedAtIso?: string
}

export const EMPTY_MEMORY = (leagueId: string, botId: string): BotLeagueMemoryState => ({
  leagueId,
  botId,
  roster: { playerIds: [], byPosition: {} },
  picksOwned: [],
  recentMoves: [],
  recentClaims: [],
  tradeHistorySummaries: [],
  positionStrength: {},
  positionWeakness: {},
  strategyMode: "neutral",
  targetPlayerIds: [],
  avoidPlayerIds: [],
})

export function parseMemoryJson(raw: unknown): BotLeagueMemoryState | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  if (typeof o.leagueId !== "string" || typeof o.botId !== "string") return null
  return o as unknown as BotLeagueMemoryState
}

export function serializeMemory(state: BotLeagueMemoryState): Record<string, unknown> {
  return { ...state, updatedAtIso: new Date().toISOString() }
}

export function updateMemoryAfterDraftPick(
  prev: BotLeagueMemoryState,
  pick: { playerId: string; position: string; overall: number }
): BotLeagueMemoryState {
  const byPos = { ...prev.roster.byPosition }
  const pos = pick.position || "FL"
  byPos[pos] = (byPos[pos] ?? 0) + 1
  return {
    ...prev,
    roster: {
      playerIds: [...prev.roster.playerIds, pick.playerId],
      byPosition: byPos,
    },
    recentMoves: [
      { type: "draft_pick", summary: `Pick ${pick.overall}: ${pick.playerId}`, at: new Date().toISOString() },
      ...prev.recentMoves,
    ].slice(0, 40),
  }
}

export function updateMemoryAfterClaim(prev: BotLeagueMemoryState, playerId: string): BotLeagueMemoryState {
  return {
    ...prev,
    recentClaims: [{ playerId, at: new Date().toISOString() }, ...prev.recentClaims].slice(0, 20),
  }
}

export function updateStrategyMode(prev: BotLeagueMemoryState, mode: TeamStrategyMode): BotLeagueMemoryState {
  return { ...prev, strategyMode: mode }
}

/** Recompute coarse strength/weakness from positional counts vs expected starter slots. */
export function recomputePositionalNeed(
  state: BotLeagueMemoryState,
  starterSlotsByPos: Record<string, number>
): BotLeagueMemoryState {
  const strength: Record<string, number> = {}
  const weakness: Record<string, number> = {}
  for (const [pos, need] of Object.entries(starterSlotsByPos)) {
    const have = state.roster.byPosition[pos] ?? 0
    const delta = have - need
    if (delta >= 1) strength[pos] = delta
    if (delta < 0) weakness[pos] = -delta
  }
  return { ...state, positionStrength: strength, positionWeakness: weakness }
}
