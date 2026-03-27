/**
 * Tool registry — default mode, allowed modes, featureType and quality gate per tool.
 * Supports: trade, waiver, draft, matchup, rankings, psychological, legacy, rivalry, story, content, chimmy chat.
 */

import type { OrchestrationMode } from '@/lib/unified-ai/types'
import type { OrchestrationToolType, ToolRegistryEntry } from './types'
import { ORCHESTRATION_TOOL_TYPES } from './types'
import { normalizeOrchestrationToolKey } from './tool-key-normalizer'

const REGISTRY: Record<OrchestrationToolType, ToolRegistryEntry> = {
  trade_analyzer: {
    key: 'trade_analyzer',
    featureType: 'trade_analyzer',
    defaultMode: 'unified_brain',
    allowedModes: ['single_model', 'specialist', 'consensus', 'unified_brain'],
    minConfidenceForRecommendation: 40,
  },
  waiver_ai: {
    key: 'waiver_ai',
    featureType: 'waiver_ai',
    defaultMode: 'specialist',
    allowedModes: ['single_model', 'specialist', 'consensus', 'unified_brain'],
    minConfidenceForRecommendation: 45,
  },
  draft_helper: {
    key: 'draft_helper',
    featureType: 'draft_helper',
    defaultMode: 'specialist',
    allowedModes: ['single_model', 'specialist', 'consensus', 'unified_brain'],
    minConfidenceForRecommendation: 50,
  },
  matchup: {
    key: 'matchup',
    featureType: 'matchup',
    defaultMode: 'specialist',
    allowedModes: ['single_model', 'specialist', 'consensus', 'unified_brain'],
    minConfidenceForRecommendation: 40,
  },
  rankings: {
    key: 'rankings',
    featureType: 'rankings',
    defaultMode: 'specialist',
    allowedModes: ['single_model', 'specialist', 'consensus', 'unified_brain'],
    minConfidenceForRecommendation: 45,
  },
  psychological: {
    key: 'psychological',
    featureType: 'psychological',
    defaultMode: 'specialist',
    allowedModes: ['single_model', 'specialist', 'consensus', 'unified_brain'],
    minConfidenceForRecommendation: 45,
  },
  legacy_score: {
    key: 'legacy_score',
    featureType: 'legacy_score',
    defaultMode: 'consensus',
    allowedModes: ['single_model', 'specialist', 'consensus', 'unified_brain'],
    minConfidenceForRecommendation: 40,
  },
  rivalries: {
    key: 'rivalries',
    featureType: 'rivalries',
    defaultMode: 'consensus',
    allowedModes: ['single_model', 'specialist', 'consensus', 'unified_brain'],
    minConfidenceForRecommendation: 40,
  },
  story_creator: {
    key: 'story_creator',
    featureType: 'story_creator',
    defaultMode: 'unified_brain',
    allowedModes: ['single_model', 'consensus', 'unified_brain'],
    minConfidenceForRecommendation: 35,
  },
  ai_commissioner: {
    key: 'ai_commissioner',
    featureType: 'ai_commissioner',
    defaultMode: 'unified_brain',
    allowedModes: ['single_model', 'specialist', 'consensus', 'unified_brain'],
    minConfidenceForRecommendation: 45,
  },
  fantasy_coach: {
    key: 'fantasy_coach',
    featureType: 'fantasy_coach',
    defaultMode: 'unified_brain',
    allowedModes: ['single_model', 'consensus', 'unified_brain'],
    minConfidenceForRecommendation: 40,
  },
  content: {
    key: 'content',
    featureType: 'content',
    defaultMode: 'unified_brain',
    allowedModes: ['single_model', 'specialist', 'consensus', 'unified_brain'],
    minConfidenceForRecommendation: 40,
  },
  blog_generator: {
    key: 'blog_generator',
    featureType: 'blog_generator',
    defaultMode: 'unified_brain',
    allowedModes: ['single_model', 'consensus', 'unified_brain'],
    minConfidenceForRecommendation: 35,
  },
  social_clip_generator: {
    key: 'social_clip_generator',
    featureType: 'social_clip_generator',
    defaultMode: 'unified_brain',
    allowedModes: ['single_model', 'consensus', 'unified_brain'],
    minConfidenceForRecommendation: 35,
  },
  chimmy_chat: {
    key: 'chimmy_chat',
    featureType: 'chimmy_chat',
    defaultMode: 'unified_brain',
    allowedModes: ['single_model', 'consensus', 'unified_brain'],
  },
}

/**
 * Resolve featureType to tool registry entry. Accepts featureType string from envelope.
 */
export function getToolEntry(featureType: string): ToolRegistryEntry | null {
  const key = normalizeOrchestrationToolKey(featureType) as OrchestrationToolType
  if (REGISTRY[key]) return REGISTRY[key]
  return null
}

/**
 * Get default orchestration mode for a tool. Falls back to unified_brain if unknown.
 */
export function getDefaultModeForTool(featureType: string): OrchestrationMode {
  const entry = getToolEntry(featureType)
  return entry?.defaultMode ?? 'unified_brain'
}

/**
 * Check if a mode is allowed for this tool. Prevents dead mode selector states.
 */
export function isModeAllowed(featureType: string, mode: OrchestrationMode): boolean {
  const entry = getToolEntry(featureType)
  if (!entry) return true
  return entry.allowedModes.includes(mode)
}

/**
 * Resolve effective mode: requested mode if allowed, else tool default.
 */
export function resolveEffectiveMode(featureType: string, requestedMode?: OrchestrationMode): OrchestrationMode {
  const defaultMode = getDefaultModeForTool(featureType)
  if (!requestedMode) return defaultMode
  return isModeAllowed(featureType, requestedMode) ? requestedMode : defaultMode
}

/**
 * All orchestration tool types (for validation).
 */
export function getAllToolTypes(): OrchestrationToolType[] {
  return [...ORCHESTRATION_TOOL_TYPES]
}
