/**
 * League Story Creator — story types and output structure.
 * Fact-grounded narratives from drama, rivalry, graph, rankings, legacy, HoF.
 */

export type StoryType =
  | "weekly_recap"
  | "rivalry"
  | "upset"
  | "playoff_bubble"
  | "title_defense"
  | "trade_fallout"
  | "dynasty"
  | "bracket_challenge"
  | "platform_sport"

/** Structured narrative sections for every story. */
export interface StoryOutput {
  headline: string
  whatHappened: string
  whyItMatters: string
  whoItAffects: string
  keyEvidence: string[]
  nextStorylineToWatch: string
  shortVersion?: string
  socialVersion?: string
  longVersion?: string
  /** Optional style: announcer, recap, etc. */
  style?: "announcer" | "recap" | "neutral"
}

/** Assembled context passed to one-brain composer (facts only). */
export interface NarrativeContextPackage {
  leagueId: string
  sport: string
  sportLabel: string
  season: number | null
  storyType: StoryType
  /** Drama events (headline, summary, score, type). */
  dramaEvents: Array<{ id: string; headline: string; summary: string | null; dramaType: string; dramaScore: number; relatedManagerIds: string[] }>
  /** Top rivalries (nodeA, nodeB, intensity). */
  rivalries: Array<{ nodeA: string; nodeB: string; intensityScore?: number }>
  /** Graph summary (influence, clusters, transitions). */
  graphSummary?: string
  /** Rankings/standings snapshot if available. */
  rankingsSnapshot?: string
  /** Legacy/HoF hints if available. */
  legacyHint?: string
  /** Simulation or playoff odds if available. */
  simulationHint?: string
  /** Hard constraint: only use these entity names/ids. */
  allowedEntityIds?: string[]
  allowedManagerNames?: string[]
}
