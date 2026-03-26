/**
 * AI Tool Layer — shared output shape and tool keys for Trade, Waiver, Rankings, Draft, Psychology, etc.
 * All tools: deterministic first, then model-specific reasoning, then final user explanation.
 */

/** Standard structured sections every tool AI response should include where relevant. */
export interface ToolOutput {
  /** Verdict or top-level recommendation (e.g. "Accept", "Add Player X", "Draft RB here"). */
  verdict: string
  /** Bullet or short list of evidence (scores, ranks, stats) — no invented data. */
  keyEvidence: string[]
  /** 0–100 or label; must reflect data strength. */
  confidence: number | { label: "low" | "medium" | "high"; pct?: number }
  /** Risks, caveats, format assumptions. */
  risksCaveats: string[]
  /** One clear suggested next action. */
  suggestedNextAction: string
  /** Optional alternate path (e.g. "If you need a QB instead..."). */
  alternatePath?: string
  /** Optional raw narrative for backward compatibility. */
  narrative?: string
}

export type ToolKey =
  | "trade_analyzer"
  | "waiver_ai"
  | "rankings"
  | "draft_helper"
  | "psychological"
  | "psychology"
  | "psychological_profiles"
  | "matchup"
  | "simulation"
  | "legacy_score"
  | "legacy"
  | "rivalries"
  | "rivalry"
  | "story_creator"
  | "drama"

/** Model routing hint per tool: deterministic → deepseek → grok → openai (final). */
export const TOOL_MODEL_FLOW: Record<
  ToolKey,
  { deterministicFirst: string; deepseek: string; grok: string; openai: string }
> = {
  trade_analyzer: {
    deterministicFirst: "Trade engine: fairness, value, acceptance, risk",
    deepseek: "Review structured output and scoring",
    grok: "Compact narrative framing when helpful",
    openai: "Final verdict and action plan",
  },
  waiver_ai: {
    deterministicFirst: "Rules/scoring engine prioritizes claims",
    deepseek: "Interpret scoring/ranking logic",
    grok: "Short trend framing where useful",
    openai: "Who to add and why",
  },
  rankings: {
    deterministicFirst: "Ranking engine or scoring model first",
    deepseek: "Interpret movement and score structure",
    grok: "Engagement-style summary if social",
    openai: "Rankings in plain language",
  },
  draft_helper: {
    deterministicFirst: "Board / scarcity / roster-fit logic first",
    deepseek: "Review structured board context",
    grok: "Concise draft room insight phrasing",
    openai: "Recommendation and contingency plan",
  },
  psychological: {
    deterministicFirst: "Evidence and profile engine first",
    deepseek: "Review evidence consistency",
    grok: "Profile framing and behavioral summary",
    openai: "Explain profile carefully and clearly",
  },
  psychology: {
    deterministicFirst: "Evidence and profile engine first",
    deepseek: "Review evidence consistency",
    grok: "Profile framing and behavioral summary",
    openai: "Explain profile clearly",
  },
  psychological_profiles: {
    deterministicFirst: "Evidence and profile engine first",
    deepseek: "Review evidence consistency",
    grok: "Profile framing and behavioral summary",
    openai: "Explain profile carefully and clearly",
  },
  matchup: {
    deterministicFirst: "Simulation/projection output first",
    deepseek: "Interpret probabilities and scenarios",
    grok: "Narrative framing",
    openai: "Matchup explanation and recommendation",
  },
  simulation: {
    deterministicFirst: "Simulation/projection output first",
    deepseek: "Interpret probabilities and scenarios",
    grok: "Narrative framing",
    openai: "Matchup explanation and recommendation",
  },
  legacy_score: {
    deterministicFirst: "Legacy score / evidence engine first",
    deepseek: "Interpret score components",
    grok: "Story framing",
    openai: "Clear explanation",
  },
  legacy: {
    deterministicFirst: "Legacy score / evidence engine first",
    deepseek: "Interpret score components",
    grok: "Story framing",
    openai: "Clear explanation",
  },
  rivalries: {
    deterministicFirst: "Graph/rivalry scores first",
    deepseek: "Interpret intensity and history",
    grok: "Rivalry narrative",
    openai: "Explanation",
  },
  rivalry: {
    deterministicFirst: "Graph/rivalry scores first",
    deepseek: "Interpret intensity and history",
    grok: "Rivalry narrative",
    openai: "Explanation",
  },
  story_creator: {
    deterministicFirst: "League facts and deterministic storyline cues first",
    deepseek: "Validate structure and consistency of factual cues",
    grok: "Narrative framing and rivalry/drama expression",
    openai: "Final polished user-facing story summary",
  },
  drama: {
    deterministicFirst: "League facts and deterministic narrative signals first",
    deepseek: "Check consistency with events and scoring context",
    grok: "League drama and rivalry framing",
    openai: "Final concise explanation",
  },
}
