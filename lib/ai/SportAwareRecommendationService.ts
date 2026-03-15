/**
 * SportAwareRecommendationService — adds sport context to AI recommendation payloads.
 * Use when building prompts or context for draft suggestions, waiver recommendations,
 * and roster advice so DeepSeek, Grok, and OpenAI receive explicit sport.
 */
import { buildSportContextString, type LeagueMetaForAI } from './AISportContextResolver'

export interface RecommendationContextInput {
  sport?: string | null
  leagueName?: string | null
  format?: string | null
  superflex?: boolean
  numTeams?: number
  faabBudget?: number
  currentWeek?: number
  idp?: boolean
  strategyMode?: string | null
  [key: string]: unknown
}

/**
 * Build context string for draft advice / AI draft suggestions.
 * Inject into system or user message for sport-aware rankings and suggestions.
 */
export function buildDraftRecommendationContext(meta: RecommendationContextInput): string {
  return buildSportContextString(meta as LeagueMetaForAI)
}

/**
 * Build context string for waiver recommendations.
 * Inject into waiver AI prompts for sport-specific filters and narrative.
 */
export function buildWaiverRecommendationContext(meta: RecommendationContextInput): string {
  return buildSportContextString(meta as LeagueMetaForAI)
}

/**
 * Build context string for roster/lineup suggestions.
 */
export function buildRosterRecommendationContext(meta: RecommendationContextInput): string {
  return buildSportContextString(meta as LeagueMetaForAI)
}
