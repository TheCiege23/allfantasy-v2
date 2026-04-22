/**
 * Short, rate-friendly copy for feeds — no LLM required.
 */

import type { BotProfile } from "./types"

const DRAFT_LINES: Record<string, string[]> = {
  default: ["On the clock.", "Building the board.", "Sticking to the plan."],
}

export function draftRoomLine(bot: BotProfile): string {
  const pool = DRAFT_LINES[bot.archetypeId] ?? DRAFT_LINES.default
  const idx = Math.abs(hash(bot.botId)) % pool.length
  return pool[idx]!
}

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h
}
