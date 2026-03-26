/**
 * PROMPT 124 — AIToolRegistry. Every AI-powered tool plugs into the unified orchestration layer.
 * Supported sports: NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER.
 */

import type { AIMode, AIProvider } from './contracts'

export interface AIToolRegistration {
  /** Canonical tool key (featureType). */
  toolKey: string
  /** Display name. */
  toolName: string
  /** Whether deterministic context is required before AI runs. */
  deterministicRequired: boolean
  /** Allowed providers for this tool. */
  allowedProviders: AIProvider[]
  /** Supported orchestration modes. */
  supportedModes: AIMode[]
  /** Context fields required when deterministicRequired is true. */
  requiredContextFields: string[]
  /** Optional response schema hint (e.g. evidence, verdict, actionPlan). */
  responseSchema: string[]
}

const REGISTRY: AIToolRegistration[] = [
  {
    toolKey: 'trade_analyzer',
    toolName: 'Trade Analyzer',
    deterministicRequired: true,
    allowedProviders: ['openai', 'deepseek', 'grok'],
    supportedModes: ['single_model', 'specialist', 'consensus', 'unified_brain'],
    requiredContextFields: ['fairnessScore', 'valueDelta', 'sideATotalValue', 'sideBTotalValue'],
    responseSchema: ['evidence', 'valueVerdict', 'viabilityVerdict', 'actionPlan', 'confidence', 'uncertainty'],
  },
  {
    toolKey: 'waiver_ai',
    toolName: 'Waiver Wire AI',
    deterministicRequired: true,
    allowedProviders: ['openai', 'deepseek', 'grok'],
    supportedModes: ['single_model', 'specialist', 'consensus', 'unified_brain'],
    requiredContextFields: ['candidates', 'leagueSettings'],
    responseSchema: ['evidence', 'aiExplanation', 'actionPlan', 'confidence', 'uncertainty'],
  },
  {
    toolKey: 'draft_helper',
    toolName: 'Draft Helper',
    deterministicRequired: true,
    allowedProviders: ['openai', 'deepseek', 'grok'],
    supportedModes: ['single_model', 'specialist', 'consensus', 'unified_brain'],
    requiredContextFields: ['board', 'roster', 'scoring'],
    responseSchema: ['evidence', 'aiExplanation', 'actionPlan', 'confidence', 'uncertainty'],
  },
  {
    toolKey: 'matchup',
    toolName: 'Matchup Explainer',
    deterministicRequired: true,
    allowedProviders: ['openai', 'deepseek', 'grok'],
    supportedModes: ['single_model', 'specialist', 'consensus', 'unified_brain'],
    requiredContextFields: ['matchupSummary', 'projections'],
    responseSchema: ['evidence', 'aiExplanation', 'actionPlan', 'confidence', 'uncertainty'],
  },
  {
    toolKey: 'rankings',
    toolName: 'League Rankings Explainer',
    deterministicRequired: true,
    allowedProviders: ['openai', 'deepseek', 'grok'],
    supportedModes: ['single_model', 'specialist', 'consensus', 'unified_brain'],
    requiredContextFields: ['ordering', 'tiers'],
    responseSchema: ['evidence', 'aiExplanation', 'actionPlan', 'confidence', 'uncertainty'],
  },
  {
    toolKey: 'psychological',
    toolName: 'Psychological System',
    deterministicRequired: true,
    allowedProviders: ['openai', 'deepseek', 'grok'],
    supportedModes: ['single_model', 'specialist', 'consensus'],
    requiredContextFields: ['profile', 'evidence'],
    responseSchema: ['evidence', 'aiExplanation', 'actionPlan', 'confidence', 'uncertainty'],
  },
  {
    toolKey: 'legacy_score',
    toolName: 'Legacy / Dynasty Explainer',
    deterministicRequired: true,
    allowedProviders: ['openai', 'deepseek', 'grok'],
    supportedModes: ['single_model', 'specialist', 'consensus', 'unified_brain'],
    requiredContextFields: ['score'],
    responseSchema: ['evidence', 'aiExplanation', 'actionPlan', 'confidence', 'uncertainty'],
  },
  {
    toolKey: 'rivalries',
    toolName: 'Rivalry Explainer',
    deterministicRequired: true,
    allowedProviders: ['openai', 'deepseek', 'grok'],
    supportedModes: ['single_model', 'specialist', 'consensus', 'unified_brain'],
    requiredContextFields: ['compositeScore'],
    responseSchema: ['evidence', 'aiExplanation', 'actionPlan', 'confidence', 'uncertainty'],
  },
  {
    toolKey: 'story_creator',
    toolName: 'League Story Creator',
    deterministicRequired: true,
    allowedProviders: ['openai', 'deepseek', 'grok'],
    supportedModes: ['single_model', 'consensus', 'unified_brain'],
    requiredContextFields: ['leagueSummary', 'facts'],
    responseSchema: ['evidence', 'aiExplanation', 'actionPlan', 'confidence', 'uncertainty'],
  },
  {
    toolKey: 'ai_commissioner',
    toolName: 'AI Commissioner',
    deterministicRequired: true,
    allowedProviders: ['openai', 'deepseek', 'grok'],
    supportedModes: ['single_model', 'specialist', 'consensus', 'unified_brain'],
    requiredContextFields: ['leagueSettings', 'activity'],
    responseSchema: ['evidence', 'aiExplanation', 'actionPlan', 'confidence', 'uncertainty'],
  },
  {
    toolKey: 'fantasy_coach',
    toolName: 'Fantasy Coach Mode',
    deterministicRequired: false,
    allowedProviders: ['openai', 'deepseek', 'grok'],
    supportedModes: ['single_model', 'consensus', 'unified_brain'],
    requiredContextFields: [],
    responseSchema: ['evidence', 'aiExplanation', 'actionPlan', 'confidence', 'uncertainty'],
  },
  {
    toolKey: 'content',
    toolName: 'Content Generator',
    deterministicRequired: false,
    allowedProviders: ['openai', 'deepseek', 'grok'],
    supportedModes: ['single_model', 'specialist', 'consensus', 'unified_brain'],
    requiredContextFields: [],
    responseSchema: ['evidence', 'aiExplanation', 'actionPlan', 'confidence', 'uncertainty'],
  },
  {
    toolKey: 'blog_generator',
    toolName: 'Blog Generator',
    deterministicRequired: false,
    allowedProviders: ['openai', 'deepseek', 'grok'],
    supportedModes: ['single_model', 'consensus', 'unified_brain'],
    requiredContextFields: [],
    responseSchema: ['evidence', 'aiExplanation', 'actionPlan', 'confidence', 'uncertainty'],
  },
  {
    toolKey: 'social_clip_generator',
    toolName: 'Social Clip Generator',
    deterministicRequired: false,
    allowedProviders: ['openai', 'deepseek', 'grok'],
    supportedModes: ['single_model', 'consensus', 'unified_brain'],
    requiredContextFields: [],
    responseSchema: ['evidence', 'aiExplanation', 'actionPlan', 'confidence', 'uncertainty'],
  },
  {
    toolKey: 'chimmy_chat',
    toolName: 'Chimmy Chat',
    deterministicRequired: false,
    allowedProviders: ['openai', 'deepseek', 'grok'],
    supportedModes: ['single_model', 'consensus', 'unified_brain'],
    requiredContextFields: [],
    responseSchema: ['aiExplanation', 'confidence', 'uncertainty'],
  },
]

const BY_KEY = new Map<string, AIToolRegistration>()
REGISTRY.forEach((r) => BY_KEY.set(r.toolKey, r))
const TOOL_ALIASES: Record<string, string> = {
  psychology: 'psychological',
  psychological_profiles: 'psychological',
  legacy: 'legacy_score',
  rivalry: 'rivalries',
  simulation: 'matchup',
}

/** All registered tools. */
export function getAIToolRegistry(): AIToolRegistration[] {
  return [...REGISTRY]
}

/** Get one tool by key. Returns null if unsupported. */
export function getToolRegistration(toolKey: string): AIToolRegistration | null {
  const key = (toolKey || '').trim().toLowerCase()
  const canonicalKey = TOOL_ALIASES[key] ?? key
  return BY_KEY.get(canonicalKey) ?? null
}

/** Check if tool is supported. */
export function isToolSupported(toolKey: string): boolean {
  return getToolRegistration(toolKey) != null
}

/** Validate request: tool must be registered; if deterministicRequired, deterministicContext must have required fields. */
export function validateToolRequest(
  toolKey: string,
  deterministicContext?: Record<string, unknown> | null
): { valid: boolean; error?: string } {
  const reg = getToolRegistration(toolKey)
  if (!reg) {
    return { valid: false, error: `Unsupported tool: ${toolKey}. Use GET /api/ai/tools for allowed tools.` }
  }
  if (!reg.deterministicRequired) return { valid: true }
  if (!deterministicContext || typeof deterministicContext !== 'object') {
    return { valid: false, error: `Tool "${reg.toolName}" requires deterministicContext.` }
  }
  const missing = reg.requiredContextFields.filter((f) => deterministicContext[f] === undefined || deterministicContext[f] === null)
  if (missing.length > 0) {
    return { valid: false, error: `Missing required context fields: ${missing.join(', ')}.` }
  }
  return { valid: true }
}

/** Resolve effective mode for tool (requested mode if allowed, else first supported). */
export function resolveModeForTool(toolKey: string, requestedMode?: AIMode | null): AIMode {
  const reg = getToolRegistration(toolKey)
  if (!reg) return 'unified_brain'
  if (requestedMode && reg.supportedModes.includes(requestedMode)) return requestedMode
  return reg.supportedModes[0] ?? 'unified_brain'
}

/** Allowed provider list for tool (for UI). */
export function getAllowedProvidersForTool(toolKey: string): AIProvider[] {
  const reg = getToolRegistration(toolKey)
  return reg?.allowedProviders ?? ['openai', 'deepseek', 'grok']
}
