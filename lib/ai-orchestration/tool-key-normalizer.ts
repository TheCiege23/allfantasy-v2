/**
 * Canonical tool-key normalization for orchestration and route inputs.
 * Supports both underscore and hyphen tool names from clients.
 */

export const TOOL_KEY_ALIASES: Record<string, string> = {
  // Required unified tool types.
  'trade-analyzer': 'trade_analyzer',
  'trade analyzer': 'trade_analyzer',
  trade_analyzer: 'trade_analyzer',
  trade_evaluator: 'trade_analyzer',
  waiver: 'waiver_ai',
  'waiver-wire': 'waiver_ai',
  'waiver wire ai': 'waiver_ai',
  'waiver-wire-ai': 'waiver_ai',
  waiver_ai: 'waiver_ai',
  'draft-helper': 'draft_helper',
  'draft helper': 'draft_helper',
  draft_helper: 'draft_helper',
  matchup: 'matchup',
  'matchup-explainer': 'matchup',
  'league-rankings-explainer': 'rankings',
  rankings: 'rankings',
  story: 'story_creator',
  'league-story-creator': 'story_creator',
  story_creator: 'story_creator',
  'ai-commissioner': 'ai_commissioner',
  ai_commissioner: 'ai_commissioner',
  'fantasy-coach': 'fantasy_coach',
  'fantasy-coach-mode': 'fantasy_coach',
  fantasy_coach: 'fantasy_coach',
  content: 'content',
  'content-generator': 'content',
  content_generator: 'content',
  'blog-generator': 'blog_generator',
  blog_generator: 'blog_generator',
  'social-clip-generator': 'social_clip_generator',
  social_clip_generator: 'social_clip_generator',
  'chimmy-chat': 'chimmy_chat',
  chimmy_chat: 'chimmy_chat',

  // Existing platform aliases.
  simulation: 'matchup',
  graph_insight: 'rivalries',
  rivalry: 'rivalries',
  rivalries: 'rivalries',
  legacy: 'legacy_score',
  reputation: 'legacy_score',
  legacy_score: 'legacy_score',
  psychological_profiles: 'psychological',
  psychology: 'psychological',
  psychological: 'psychological',
  commentary: 'content',
  openclaw_dev_assistant: 'chimmy_chat',
  openclaw_growth_marketing_assistant: 'content',
}

/**
 * Normalize incoming tool/feature key into canonical orchestration key.
 */
export function normalizeOrchestrationToolKey(value: string): string {
  const raw = (value ?? '').trim().toLowerCase()
  if (!raw) return raw
  const underscored = raw.replace(/[\s-]+/g, '_')
  return TOOL_KEY_ALIASES[raw] ?? TOOL_KEY_ALIASES[underscored] ?? underscored
}
