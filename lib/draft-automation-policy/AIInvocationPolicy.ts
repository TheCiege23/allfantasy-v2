import { getDraftFeaturePolicy } from './feature-catalog'
import type { AIInvocationDecision, DraftAutomationFeature } from './types'

type InvocationWindow = {
  startedAt: number
  timestamps: number[]
}

const WINDOW_REGISTRY = new Map<string, InvocationWindow>()
const DEFAULT_WINDOW_MS = 5 * 60 * 1000
const DEFAULT_MAX_CALLS = 8
const DEFAULT_MAX_LATENCY_MS = 3200

function getWindowKey(feature: DraftAutomationFeature, scopeId: string): string {
  return `${feature}:${scopeId}`
}

function pruneWindow(window: InvocationWindow, now: number, windowMs: number) {
  window.timestamps = window.timestamps.filter((ts) => now - ts <= windowMs)
  if (window.timestamps.length === 0) {
    window.startedAt = now
  }
}

export function evaluateAIInvocationPolicy(input: {
  feature: DraftAutomationFeature
  scopeId?: string
  requestAI: boolean
  aiEnabled: boolean
  providerAvailable: boolean
  maxCallsPerWindow?: number
  windowMs?: number
  maxLatencyMs?: number
}): AIInvocationDecision {
  const now = Date.now()
  const featurePolicy = getDraftFeaturePolicy(input.feature)
  const maxCallsPerWindow = Math.max(1, input.maxCallsPerWindow ?? DEFAULT_MAX_CALLS)
  const windowMs = Math.max(1000, input.windowMs ?? DEFAULT_WINDOW_MS)
  const maxLatencyMs = Math.max(750, input.maxLatencyMs ?? DEFAULT_MAX_LATENCY_MS)

  if (!featurePolicy.aiOptional) {
    return {
      decision: 'deterministic_only',
      reasonCode: 'feature_is_deterministic',
      maxLatencyMs,
      canShowAIButton: false,
    }
  }

  if (!input.requestAI) {
    return {
      decision: 'deterministic_only',
      reasonCode: 'ai_not_requested',
      maxLatencyMs,
      canShowAIButton: true,
    }
  }

  if (!input.aiEnabled) {
    return {
      decision: 'deny_dead_button',
      reasonCode: 'ai_feature_disabled',
      maxLatencyMs,
      canShowAIButton: false,
    }
  }

  if (!input.providerAvailable) {
    return {
      decision: 'deterministic_only',
      reasonCode: 'provider_unavailable',
      maxLatencyMs,
      canShowAIButton: false,
    }
  }

  const scopeId = input.scopeId ?? 'global'
  const key = getWindowKey(input.feature, scopeId)
  const window = WINDOW_REGISTRY.get(key) ?? { startedAt: now, timestamps: [] }
  pruneWindow(window, now, windowMs)

  if (window.timestamps.length >= maxCallsPerWindow) {
    WINDOW_REGISTRY.set(key, window)
    return {
      decision: 'deterministic_only',
      reasonCode: 'ai_budget_window_exceeded',
      maxLatencyMs,
      canShowAIButton: true,
    }
  }

  window.timestamps.push(now)
  WINDOW_REGISTRY.set(key, window)
  return {
    decision: 'allow_ai',
    reasonCode: 'ai_allowed',
    maxLatencyMs,
    canShowAIButton: true,
  }
}
