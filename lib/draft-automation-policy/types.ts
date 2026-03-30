export type DraftExecutionLane =
  | 'deterministic_required'
  | 'rules_engine'
  | 'scheduled_cached'
  | 'ai_optional'

export type DraftExecutionMode =
  | 'instant_automated'
  | 'rules_engine'
  | 'scheduled_cached'
  | 'ai_explained'
  | 'deterministic_fallback'

export type DraftAutomationFeature =
  | 'timer_engine'
  | 'draft_order_engine'
  | 'pick_ownership_resolver'
  | 'draft_queue_reorder_engine'
  | 'cpu_draft_baseline_mode'
  | 'player_filter_sort_search'
  | 'bye_week_display'
  | 'roster_position_validation'
  | 'player_availability_state'
  | 'sport_specific_eligibility'
  | 'pick_trade_ownership_resolution'
  | 'commissioner_automation_controls'
  | 'ai_adp_aggregation_job'
  | 'asset_ingestion_caching'
  | 'post_draft_summary_calculations'
  | 'draft_helper_recommendation_engine'
  | 'explain_best_pick'
  | 'explain_reach_vs_value'
  | 'explain_positional_need'
  | 'private_trade_review'
  | 'counter_trade_suggestion'
  | 'explain_draft_recap'
  | 'explain_ai_queue_reorder_rationale'
  | 'narrative_league_story_recap'
  | 'premium_coach_style_advice'

export type DraftFeaturePolicy = {
  feature: DraftAutomationFeature
  lane: DraftExecutionLane
  aiOptional: boolean
  description: string
}

export type AIInvocationDecisionKind =
  | 'allow_ai'
  | 'deterministic_only'
  | 'deny_dead_button'

export type AIInvocationDecision = {
  decision: AIInvocationDecisionKind
  reasonCode: string
  maxLatencyMs: number
  canShowAIButton: boolean
}

export type DraftExecutionMetadata = {
  feature: DraftAutomationFeature
  lane: DraftExecutionLane
  mode: DraftExecutionMode
  aiUsed: boolean
  aiEligible: boolean
  reasonCode: string
}
