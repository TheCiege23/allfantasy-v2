/**
 * League Recommendation Engine (PROMPT 219) — types.
 * Deterministic scoring first; AI can enhance explanations.
 */

import type { DiscoveryCard } from "@/lib/public-discovery/types"

export interface UserLeagueProfile {
  /** Sports the user has leagues in (desc by count). */
  preferredSports: string[]
  /** Team counts from user's leagues (e.g. [12, 10]). */
  preferredTeamCounts: number[]
  /** User has at least one bracket league. */
  hasBracketLeagues: boolean
  /** User has at least one creator league. */
  hasCreatorLeagues: boolean
  /** User has participated in at least one draft (league with completed draft). */
  hasDraftParticipation: boolean
  /** Bracket league IDs user is already in (to exclude). */
  bracketLeagueIds: string[]
  /** Creator league IDs user is already in (to exclude). */
  creatorLeagueIds: string[]
}

export interface RecommendedLeagueWithExplanation {
  league: DiscoveryCard
  /** Deterministic or AI-enhanced short explanation. */
  explanation: string | null
  /** Internal score (for debugging). */
  score?: number
}
