/**
 * Phase 2B — ProviderSelector
 *
 * Maps a `ChimmyIntent` to the subset of context providers we want loaded for
 * the current turn. Goal: keep prompts tight + reduce DB/load pressure by
 * skipping providers we don't need.
 *
 * Always-on providers: user, subscription, league, importedHistory.
 *   - `user` + `subscription` gate UX language ("you have X tokens left").
 *   - `league` resolves active league + role.
 *   - `importedHistory` is cheap and high-signal for personalization.
 *
 * Intent-conditional providers:
 *   matchup        → matchup, roster, standings
 *   start_sit      → matchup, roster, rankings
 *   waiver         → roster, rankings
 *   trade          → roster, standings, rankings, leagueDifficulty
 *   dynasty        → rankings, leagueDifficulty, standings
 *   rankings       → rankings, leagueDifficulty
 *   draft          → rankings
 *   general        → (always-on only)
 */

import type { ChimmyIntent } from "@/lib/chimmy-context/intent/IntentClassifier"

export type ProviderName =
  | "user"
  | "subscription"
  | "league"
  | "matchup"
  | "roster"
  | "standings"
  | "ranking"
  | "leagueDifficulty"
  | "importedHistory"
  | "sportsSchedule"

const ALWAYS_ON: ProviderName[] = [
  "user",
  "subscription",
  "league",
  "importedHistory",
]

const INTENT_ADDITIONS: Record<ChimmyIntent, ProviderName[]> = {
  general: [],
  sports_schedule: ["sportsSchedule"],
  matchup: ["matchup", "roster", "standings"],
  start_sit: ["matchup", "roster", "ranking"],
  waiver: ["roster", "ranking"],
  trade: ["roster", "standings", "ranking", "leagueDifficulty"],
  dynasty: ["ranking", "leagueDifficulty", "standings"],
  rankings: ["ranking", "leagueDifficulty"],
  draft: ["ranking"],
  commissioner: ["standings", "leagueDifficulty"],
  bracket: ["sportsSchedule"],
  injury: ["roster", "ranking", "sportsSchedule"],
  weather: ["sportsSchedule"],
}

/**
 * Returns the de-duplicated provider subset for a given intent.
 * Stable order: always-on first, then intent additions in declaration order.
 */
export function selectProvidersForIntent(intent: ChimmyIntent): ProviderName[] {
  const seen = new Set<ProviderName>()
  const out: ProviderName[] = []
  for (const p of ALWAYS_ON) {
    if (!seen.has(p)) {
      seen.add(p)
      out.push(p)
    }
  }
  for (const p of INTENT_ADDITIONS[intent] ?? []) {
    if (!seen.has(p)) {
      seen.add(p)
      out.push(p)
    }
  }
  return out
}
