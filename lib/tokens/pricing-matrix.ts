import type { SubscriptionPlanId } from "@/lib/subscription/types"

export type TokenPricingTier = "low" | "mid" | "high"

export type TokenFeatureComplexity = "simple" | "moderate" | "heavy"

export type TokenPricingMatrixEntry = {
  code: string
  category: "ai_feature" | "commissioner_function"
  featureLabel: string
  description: string
  tier: TokenPricingTier
  complexity: TokenFeatureComplexity
  tokenCost: number
  requiredPlan: SubscriptionPlanId | null
}

/**
 * PROMPT 254 — Central token pricing matrix.
 * Whole-number token costs by relative compute + scope + user value.
 */
export const TOKEN_SPEND_RULE_MATRIX: readonly TokenPricingMatrixEntry[] = [
  // Low-cost features
  {
    code: "ai_player_comparison_quick_explanation",
    category: "ai_feature",
    featureLabel: "Quick player comparison explanation",
    description: "Fast side-by-side player comparison summary.",
    tier: "low",
    complexity: "simple",
    tokenCost: 1,
    requiredPlan: "pro",
  },
  {
    code: "ai_waiver_one_off_suggestion",
    category: "ai_feature",
    featureLabel: "One-off waiver suggestion",
    description: "Single waiver add/drop recommendation.",
    tier: "low",
    complexity: "simple",
    tokenCost: 1,
    requiredPlan: "pro",
  },
  {
    code: "ai_matchup_explanation_single",
    category: "ai_feature",
    featureLabel: "One matchup explanation",
    description: "Single matchup confidence explanation.",
    tier: "low",
    complexity: "simple",
    tokenCost: 1,
    requiredPlan: "pro",
  },
  {
    code: "ai_start_sit_explanation_single",
    category: "ai_feature",
    featureLabel: "One start/sit explanation",
    description: "Single start/sit recommendation explanation.",
    tier: "low",
    complexity: "simple",
    tokenCost: 1,
    requiredPlan: "pro",
  },
  {
    code: "ai_lineup_recommendation_explanation_single",
    category: "ai_feature",
    featureLabel: "One lineup recommendation explanation",
    description: "Single lineup recommendation reasoning.",
    tier: "low",
    complexity: "simple",
    tokenCost: 1,
    requiredPlan: "pro",
  },

  // Mid-cost features
  {
    code: "ai_trade_analyzer_full_review",
    category: "ai_feature",
    featureLabel: "Trade analyzer full review",
    description: "Full trade context + fairness + action plan review.",
    tier: "mid",
    complexity: "moderate",
    tokenCost: 3,
    requiredPlan: "pro",
  },
  {
    code: "ai_draft_helper_session_recommendation",
    category: "ai_feature",
    featureLabel: "Draft helper session recommendation",
    description: "Session-level draft recommendation flow.",
    tier: "mid",
    complexity: "moderate",
    tokenCost: 3,
    requiredPlan: "war_room",
  },
  {
    code: "ai_draft_pick_explanation",
    category: "ai_feature",
    featureLabel: "Draft pick explanation",
    description: "Single pick explanation with contextual tradeoffs.",
    tier: "mid",
    complexity: "moderate",
    tokenCost: 2,
    requiredPlan: "war_room",
  },
  {
    code: "ai_weekly_planning_session",
    category: "ai_feature",
    featureLabel: "Weekly AI planning session",
    description: "Weekly multi-step planning guidance.",
    tier: "mid",
    complexity: "moderate",
    tokenCost: 3,
    requiredPlan: "pro",
  },
  {
    code: "ai_league_rankings_explanation",
    category: "ai_feature",
    featureLabel: "League rankings explanation",
    description: "Rankings interpretation with explainable context.",
    tier: "mid",
    complexity: "moderate",
    tokenCost: 2,
    requiredPlan: "commissioner",
  },
  {
    code: "ai_draft_rankings_explanation",
    category: "ai_feature",
    featureLabel: "Draft rankings explanation",
    description: "Draft ranking context and strategic implications.",
    tier: "mid",
    complexity: "moderate",
    tokenCost: 2,
    requiredPlan: "war_room",
  },

  // High-cost features
  {
    code: "ai_war_room_multi_step_planning",
    category: "ai_feature",
    featureLabel: "Multi-step war room planning",
    description: "Extended multi-step draft war room planning.",
    tier: "high",
    complexity: "heavy",
    tokenCost: 6,
    requiredPlan: "war_room",
  },
  {
    code: "ai_strategy_3_5_year_planning",
    category: "ai_feature",
    featureLabel: "3-5 year strategy planning",
    description: "Long-horizon 3-5 year strategic planning output.",
    tier: "high",
    complexity: "heavy",
    tokenCost: 7,
    requiredPlan: "war_room",
  },
  {
    code: "ai_storyline_creation",
    category: "commissioner_function",
    featureLabel: "AI storyline creation",
    description: "League storyline generation with narrative synthesis.",
    tier: "high",
    complexity: "heavy",
    tokenCost: 5,
    requiredPlan: "commissioner",
  },
  {
    code: "commissioner_ai_collusion_detection_scan",
    category: "commissioner_function",
    featureLabel: "AI collusion detection scan",
    description: "League-wide collusion signal analysis scan.",
    tier: "high",
    complexity: "heavy",
    tokenCost: 8,
    requiredPlan: "commissioner",
  },
  {
    code: "commissioner_ai_tanking_detection_scan",
    category: "commissioner_function",
    featureLabel: "AI tanking detection scan",
    description: "League-wide tanking signal analysis scan.",
    tier: "high",
    complexity: "heavy",
    tokenCost: 7,
    requiredPlan: "commissioner",
  },
  {
    code: "commissioner_ai_team_manager_actions",
    category: "commissioner_function",
    featureLabel: "AI team manager actions",
    description: "AI-assisted manager action recommendations.",
    tier: "high",
    complexity: "heavy",
    tokenCost: 6,
    requiredPlan: "commissioner",
  },
  {
    code: "commissioner_ai_full_draft_recap",
    category: "commissioner_function",
    featureLabel: "Full draft recap",
    description: "Full draft recap across league activity.",
    tier: "high",
    complexity: "heavy",
    tokenCost: 6,
    requiredPlan: "commissioner",
  },
  {
    code: "commissioner_ai_full_league_recap",
    category: "commissioner_function",
    featureLabel: "Full league recap",
    description: "Cross-surface full league recap generation.",
    tier: "high",
    complexity: "heavy",
    tokenCost: 7,
    requiredPlan: "commissioner",
  },
  {
    code: "commissioner_ai_large_analysis",
    category: "commissioner_function",
    featureLabel: "Large commissioner-wide analysis",
    description: "Large-scope commissioner-wide analysis run.",
    tier: "high",
    complexity: "heavy",
    tokenCost: 9,
    requiredPlan: "commissioner",
  },

  // Backward-compatible in-use rules (mapped into matrix values)
  {
    code: "ai_chimmy_chat_message",
    category: "ai_feature",
    featureLabel: "Chimmy chat message",
    description: "Unified Chimmy chat response generation.",
    tier: "low",
    complexity: "simple",
    tokenCost: 1,
    requiredPlan: "pro",
  },
  {
    code: "ai_trade_eval_consensus",
    category: "ai_feature",
    featureLabel: "Trade analyzer full review (legacy)",
    description: "Legacy trade evaluator route mapped to full review pricing.",
    tier: "mid",
    complexity: "moderate",
    tokenCost: 3,
    requiredPlan: "pro",
  },
  {
    code: "ai_waiver_engine_run",
    category: "ai_feature",
    featureLabel: "One-off waiver suggestion (legacy)",
    description: "Legacy waiver route mapped to one-off waiver pricing.",
    tier: "low",
    complexity: "simple",
    tokenCost: 1,
    requiredPlan: "pro",
  },
  {
    code: "commissioner_ai_cycle_run",
    category: "commissioner_function",
    featureLabel: "Large commissioner-wide analysis (legacy cycle)",
    description: "Legacy AI Commissioner cycle endpoint mapped to large analysis pricing.",
    tier: "high",
    complexity: "heavy",
    tokenCost: 9,
    requiredPlan: "commissioner",
  },
  {
    code: "commissioner_ai_chat_question",
    category: "commissioner_function",
    featureLabel: "AI Commissioner question",
    description: "Single AI Commissioner question and response.",
    tier: "mid",
    complexity: "moderate",
    tokenCost: 2,
    requiredPlan: "commissioner",
  },
] as const

const MATRIX_BY_CODE = new Map<string, TokenPricingMatrixEntry>(
  TOKEN_SPEND_RULE_MATRIX.map((entry) => [entry.code, entry])
)

export function getTokenSpendRuleMatrixEntry(code: string): TokenPricingMatrixEntry | null {
  return MATRIX_BY_CODE.get(code) ?? null
}

export function listTokenSpendRuleMatrix(): TokenPricingMatrixEntry[] {
  return TOKEN_SPEND_RULE_MATRIX.map((entry) => ({ ...entry }))
}
