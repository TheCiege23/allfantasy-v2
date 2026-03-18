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

// --- Survivor League (PROMPT 345) ---

/** Survivor league: features that must be 100% deterministic (no AI in path). */
export const SURVIVOR_DETERMINISTIC_FEATURES = [
  'tribe_creation_after_draft',
  'tribe_balancing_validation',
  'tribe_shuffle_trigger_rules',
  'tribe_chat_membership_updates',
  'official_chimmy_command_parsing',
  'challenge_lock_at_kickoff_deadline',
  'timestamping_and_first_submission_rule',
  'challenge_scoring_tallying',
  'immunity_assignment',
  'idol_seeding_after_draft',
  'one_idol_per_user_initial_assignment',
  'idol_chain_of_custody_tracking',
  'idol_transfer_on_trade',
  'idol_transfer_on_waiver_claim',
  'idol_transfer_on_stolen_player_ownership_change',
  'idol_usage_validation',
  'idol_expiry',
  'tribal_vote_deadline_enforcement',
  'self_vote_restriction',
  'vote_counting',
  'tie_resolution_by_total_season_points',
  'exile_island_enrollment',
  'jury_enrollment',
  'merge_trigger',
  'bestball_lineup_optimization',
  'roster_legality_by_sport',
  'exile_island_token_tracking',
  'exile_token_reset_when_boss_wins',
  'return_to_island_eligibility_at_tokens',
  'chat_access_removal_addition',
  'scroll_reveal_event_generation',
  'audit_logging',
] as const

/** Survivor league: AI-optional features (gated; explanation/narrative/advice only). */
export const SURVIVOR_AI_OPTIONAL_FEATURES = [
  'generating_tribe_names',
  'generating_tribe_logos',
  'weekly_host_narration',
  'tribal_council_dramatic_reveal_language',
  'scroll_text_styling',
  'challenge_flavor_text',
  'chimmy_language_normalization',
  'strategy_help',
  'idol_usage_coaching',
  'tribe_leader_coaching',
  'private_alliance_guidance',
  'survivor_style_recaps',
  'jury_finale_moderation_tone',
  'exile_advice',
  'return_path_strategy',
  'storyline_summaries',
] as const

/** Survivor hybrid: deterministic core + AI-optional layer. Key = feature; value = [deterministicId, aiOptionalId]. */
export const SURVIVOR_HYBRID_FEATURES: Record<string, [string, string]> = {
  chimmy_decision_intake: ['official_chimmy_command_parsing', 'chimmy_language_normalization'],
  tribe_strategy_prompts: ['tribal_vote_deadline_enforcement', 'strategy_help'],
  challenge_prompts: ['challenge_scoring_tallying', 'weekly_host_narration'],
  tribal_reveal: ['scroll_reveal_event_generation', 'tribal_council_dramatic_reveal_language'],
}

export type SurvivorDeterministicFeatureId = (typeof SURVIVOR_DETERMINISTIC_FEATURES)[number]
export type SurvivorAIOptionalFeatureId = (typeof SURVIVOR_AI_OPTIONAL_FEATURES)[number]

export function isSurvivorDeterministicFeature(featureId: string): boolean {
  return (SURVIVOR_DETERMINISTIC_FEATURES as readonly string[]).includes(featureId)
}

export function isSurvivorAIOptionalFeature(featureId: string): boolean {
  return (SURVIVOR_AI_OPTIONAL_FEATURES as readonly string[]).includes(featureId)
}
