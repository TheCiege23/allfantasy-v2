/**
 * League Recommendation Engine (PROMPT 219) — types.
 * Deterministic scoring first; AI can enhance explanations.
 */

import type { DiscoveryCard } from "@/lib/public-discovery/types"

export interface UserLeagueProfile {
  /** Sports the user has leagues in (desc by count). */
  preferredSports: string[]
  /** Sports inferred from historical participation counts. */
  historicalSports: string[]
  /** Team counts from user's leagues (e.g. [12, 10]). */
  preferredTeamCounts: number[]
  /** League-type signals gathered from prior participation. */
  leagueTypeCounts: Record<string, number>
  /** Draft types from previous participation (snake/linear/auction). */
  preferredDraftTypes: string[]
  /** User has at least one bracket league. */
  hasBracketLeagues: boolean
  /** User has at least one creator league. */
  hasCreatorLeagues: boolean
  /** User has participated in at least one draft (league with completed draft). */
  hasDraftParticipation: boolean
  /** Number of completed draft experiences. */
  draftParticipationCount: number
  /** AI usage events count over lookback window. */
  aiUsageEvents: number
  /** Normalized AI usage score [0..1]. */
  aiUsageScore: number
  /** Total past leagues considered for profile signals. */
  pastLeagueCount: number
  /** Fantasy league IDs user already manages to avoid duplicate recommendations. */
  fantasyLeagueIds: string[]
  /** Bracket league IDs user is already in (to exclude). */
  bracketLeagueIds: string[]
  /** Creator league IDs user is already in (to exclude). */
  creatorLeagueIds: string[]
}

export interface RecommendedLeagueWithExplanation {
  league: DiscoveryCard
  /** Deterministic or AI-enhanced short explanation. */
  explanation: string | null
  /** Deterministic rationale points. */
  reasons?: string[]
  /** Source for explanation text. */
  explanationSource?: "deterministic" | "ai"
  /** Matched profile signals used for UI hints. */
  matchedSignals?: string[]
  /** Internal score (for debugging). */
  score?: number
}
