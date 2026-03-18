/**
 * Automation vs AI policy — machine-readable feature classification.
 * Use to guard against invoking AI for deterministic features and to gate AI-optional features.
 *
 * PROMPT 338 — Salary Cap League & future specialty leagues.
 *
 * Rule: Deterministic = legal/state/outcome (no LLM). AI-optional = explanation/advice only (gated).
 */

/** Salary Cap league: features that must be 100% deterministic (no AI in path). */
export const SALARY_CAP_DETERMINISTIC_FEATURES = [
  'salary_cap_tracking',
  'current_cap_space',
  'future_cap_space_projection',
  'player_salary_assignment',
  'contract_year_decrement',
  'contract_expiration',
  'dead_money_application',
  'cap_legality_checks',
  'salary_matching_checks',
  'extension_eligibility',
  'franchise_tag_eligibility',
  'rookie_contract_assignment',
  'weighted_lottery_execution',
  'startup_auction_mechanics',
  'bid_legality',
  'waiver_contract_bidding_mechanics',
  'roster_size_legality',
  'position_legality',
  'bestball_lineup_optimization',
  'offseason_calendar_transitions',
  'contract_status_updates',
  'transaction_validation',
  'future_pick_ownership',
  'compensatory_pick_formulas',
] as const

/** Salary Cap league: features that are AI-only (explanation/advice); require deterministic context. */
export const SALARY_CAP_AI_OPTIONAL_FEATURES = [
  'startup_auction_strategy',
  'cap_allocation_advice',
  'player_contract_length_advice',
  'extension_recommendation',
  'franchise_tag_recommendation',
  'trade_cap_consequence_explanation',
  'rebuild_vs_contend_advice',
  'multiyear_roster_planning',
  'bestball_construction_strategy',
  'orphan_recovery_plan',
  'salary_cap_storyline_recap',
  'commissioner_league_health_summary',
] as const

/** Hybrid: deterministic core + optional AI layer. Key = feature; value = [deterministicId, aiOptionalId]. */
export const SALARY_CAP_HYBRID_FEATURES: Record<string, [string, string]> = {
  cap_allocation: ['current_cap_space', 'cap_allocation_advice'],
  extension: ['extension_eligibility', 'extension_recommendation'],
  franchise_tag: ['franchise_tag_eligibility', 'franchise_tag_recommendation'],
  trade_evaluation: ['transaction_validation', 'trade_cap_consequence_explanation'],
  transaction_preview: ['transaction_validation', 'cap_allocation_advice'],
  roster_planning: ['future_cap_space_projection', 'multiyear_roster_planning'],
  orphan_takeover: ['current_cap_space', 'orphan_recovery_plan'],
  bestball: ['bestball_lineup_optimization', 'bestball_construction_strategy'],
  startup_auction: ['startup_auction_mechanics', 'startup_auction_strategy'],
  waiver_bidding: ['waiver_contract_bidding_mechanics', 'cap_allocation_advice'],
}

export type SalaryCapDeterministicFeatureId = (typeof SALARY_CAP_DETERMINISTIC_FEATURES)[number]
export type SalaryCapAIOptionalFeatureId = (typeof SALARY_CAP_AI_OPTIONAL_FEATURES)[number]

/** Returns true if featureId is a deterministic-only feature (AI must not be used to compute it). */
export function isSalaryCapDeterministicFeature(featureId: string): boolean {
  return (SALARY_CAP_DETERMINISTIC_FEATURES as readonly string[]).includes(featureId)
}

/** Returns true if featureId is an AI-optional feature (gated; consumes deterministic context only). */
export function isSalaryCapAIOptionalFeature(featureId: string): boolean {
  return (SALARY_CAP_AI_OPTIONAL_FEATURES as readonly string[]).includes(featureId)
}

/**
 * Reusable: for any specialty league, legal/state/outcome must be deterministic; explanation/advice may be AI.
 * Use when implementing new league types (Survivor, Devy, etc.) to classify features.
 */
export const SPECIALTY_LEAGUE_POLICY_RULE =
  'Deterministic = legal outcome, score, eligibility, order, state transition (no LLM). AI-optional = explanation, recommendation, narrative (gated; context from engine only).'
