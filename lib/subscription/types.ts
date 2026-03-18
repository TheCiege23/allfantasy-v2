/**
 * Subscription and entitlement types for gating (useEntitlement, LockedFeatureCard).
 * PROMPT 287 — Monetization QA; single source for feature IDs and plan mapping.
 */

/** Feature IDs used for hasAccess(featureId). Matches useEntitlement plan mapping. */
export type SubscriptionFeatureId =
  | 'trade_analyzer'
  | 'ai_chat'
  | 'ai_waivers'
  | 'planning_tools'
  | 'player_ai_recommendations'
  | 'matchup_explanations'
  | 'player_comparison_explanations'
  | 'advanced_scoring'
  | 'advanced_playoff_setup'
  | 'ai_collusion_detection'
  | 'ai_tanking_detection'
  | 'storyline_creation'
  | 'league_rankings'
  | 'draft_rankings'
  | 'ai_team_managers'
  | 'commissioner_automation'
  | 'draft_strategy_build'
  | 'draft_prep'
  | 'future_planning'
  | 'multi_year_strategy'
  | 'draft_board_intelligence'
  | 'roster_construction_planning'
  | 'ai_planning_3_5_year'
  | 'guillotine_ai'
  | 'salary_cap_ai'

/** Plan slugs returned by entitlements API; used for hasAccess. */
export type SubscriptionPlanId = 'pro' | 'commissioner' | 'war_room' | 'all_access'

/** Entitlement status from GET /api/subscription/entitlements */
export type EntitlementStatus = 'active' | 'grace' | 'past_due' | 'expired' | 'none'
