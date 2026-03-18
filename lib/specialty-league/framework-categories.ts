/**
 * Reusable framework categories for specialty leagues (PROMPT 343).
 * Use to classify features as deterministic, automation, or AI when building new league types.
 *
 * Rule: Deterministic = legal/state/outcome (no LLM). Automation = jobs/triggers that call engines.
 * AI = explanation/strategy only (gated; context from engine only).
 */

/** Deterministic engine categories — no LLM in path. */
export const DETERMINISTIC_ENGINE_CATEGORIES = [
  'scoring',
  'standings',
  'elimination',
  'cap_legal_validation',
  'roster_legality',
  'draft_order',
  'waiver_processing',
  'lottery_execution',
  'bestball_optimization',
  'offseason_lifecycle',
  'contract_lifecycle',
  'status_transformation',
  'resource_inventory_ledger',
  'universe_standings_aggregation',
  'promotion_relegation',
  'weekly_board_generation',
  'anti_collusion_flags',
  'anti_neglect_dangerous_drops',
] as const

export type DeterministicEngineCategory = (typeof DETERMINISTIC_ENGINE_CATEGORIES)[number]

/** Automation categories — scheduled/triggered jobs that call engines. */
export const AUTOMATION_CATEGORIES = [
  'scheduled_jobs',
  'weekly_processing',
  'season_rollover',
  'media_event_triggers',
  'rankings_generation',
  'recap_generation_triggers',
  'alerts_notifications',
  'audit_logs',
] as const

export type AutomationCategory = (typeof AUTOMATION_CATEGORIES)[number]

/** AI categories — explanation/strategy only; gated; context from engine. */
export const AI_CATEGORIES = [
  'explanation',
  'strategy',
  'planning',
  'narrative_recaps',
  'takeover_orphan_help',
  'commissioner_diagnostics_summaries',
] as const

export type AICategory = (typeof AI_CATEGORIES)[number]

/** Sports API requirements for all specialty leagues. */
export const SPORTS_API_REQUIREMENTS = [
  'player_images',
  'team_logos',
  'normalized_stats',
  'injury_status',
  'sport_aware_metadata',
  'fallback_assets',
  'caching',
] as const

export type SportsAPIRequirement = (typeof SPORTS_API_REQUIREMENTS)[number]

/** QA template section ids for every specialty league. */
export const QA_TEMPLATE_SECTIONS = [
  'creation_flow',
  'settings_flow',
  'draft_flow',
  'season_flow',
  'offseason_flow',
  'ai_gating',
  'mobile_qa',
  'desktop_qa',
  'edge_case_qa',
] as const

export type QATemplateSection = (typeof QA_TEMPLATE_SECTIONS)[number]
