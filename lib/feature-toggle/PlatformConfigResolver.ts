/**
 * Resolves platform config for app behavior: is feature enabled, which sports are available.
 * Use this at runtime (server-side or in API routes) to gate features.
 */

import { getBoolean, getStringArray, getFeatureTogglesSnapshot } from "./FeatureToggleService"
import { SUPPORTED_SPORTS } from "@/lib/sport-scope"
import type { LeagueSport } from "@prisma/client"
import { FEATURE_KEYS } from "./constants"

let cache: { snapshot: Awaited<ReturnType<typeof getFeatureTogglesSnapshot>>; at: number } | null = null
const CACHE_MS = 30 * 1000 // 30s

function getEnvBoolean(name: string): boolean | null {
  const raw = process.env[name]?.trim().toLowerCase()
  if (!raw) return null
  if (['1', 'true', 'yes', 'on'].includes(raw)) return true
  if (['0', 'false', 'no', 'off'].includes(raw)) return false
  return null
}

async function getSnapshot() {
  const now = Date.now()
  if (cache && now - cache.at < CACHE_MS) return cache.snapshot
  const snapshot = await getFeatureTogglesSnapshot()
  cache = { snapshot, at: now }
  return snapshot
}

/** Invalidate cache (call after admin updates config). */
export function invalidateConfigCache(): void {
  cache = null
}

/** Is the AI assistant feature enabled? */
export async function isAIAssistantEnabled(): Promise<boolean> {
  return getBoolean(FEATURE_KEYS.AI_ASSISTANT)
}

/** Are mock drafts enabled? */
export async function isMockDraftsEnabled(): Promise<boolean> {
  return getBoolean(FEATURE_KEYS.MOCK_DRAFTS)
}

/** Is legacy mode enabled? */
export async function isLegacyModeEnabled(): Promise<boolean> {
  return getBoolean(FEATURE_KEYS.LEGACY_MODE)
}

/** Are bracket challenges enabled? */
export async function areBracketChallengesEnabled(): Promise<boolean> {
  return getBoolean(FEATURE_KEYS.BRACKET_CHALLENGES)
}

/** List of sports currently enabled on the platform. If none set, all SUPPORTED_SPORTS. */
export async function getEnabledSports(): Promise<LeagueSport[]> {
  const arr = await getStringArray(FEATURE_KEYS.SPORTS_AVAILABILITY)
  if (arr.length === 0) return (SUPPORTED_SPORTS as unknown) as LeagueSport[]
  return arr.filter((s) => (SUPPORTED_SPORTS as readonly string[]).includes(s)) as LeagueSport[]
}

/** Is a specific sport enabled? */
export async function isSportEnabled(sport: string): Promise<boolean> {
  const enabled = await getEnabledSports()
  return enabled.includes(sport as LeagueSport)
}

/** Is a feature key enabled (by key name)? */
export async function isFeatureEnabled(key: string): Promise<boolean> {
  return getBoolean(key)
}

/** Waiver AI tool enabled? */
export async function isToolWaiverAIEnabled(): Promise<boolean> {
  return getBoolean(FEATURE_KEYS.TOOL_WAIVER_AI)
}

/** Trade analyzer tool enabled? */
export async function isToolTradeAnalyzerEnabled(): Promise<boolean> {
  return getBoolean(FEATURE_KEYS.TOOL_TRADE_ANALYZER)
}

/** Rankings tool enabled? */
export async function isToolRankingsEnabled(): Promise<boolean> {
  return getBoolean(FEATURE_KEYS.TOOL_RANKINGS)
}

/** Anthropic Chimmy pipeline enabled? */
export async function isAnthropicChimmyEnabled(): Promise<boolean> {
  const envOverride = getEnvBoolean('CHIMMY_ANTHROPIC_ENABLED')
  if (envOverride != null) return envOverride
  return getBoolean(FEATURE_KEYS.CHIMMY_ANTHROPIC)
}

/** Experimental legacy import enabled? */
export async function isExperimentalLegacyImportEnabled(): Promise<boolean> {
  return getBoolean(FEATURE_KEYS.EXPERIMENTAL_LEGACY_IMPORT)
}

/** Experimental dynasty features enabled? */
export async function isExperimentalDynastyEnabled(): Promise<boolean> {
  return getBoolean(FEATURE_KEYS.EXPERIMENTAL_DYNASTY)
}

/** Full snapshot (for API that serves client). */
export async function getPlatformConfigSnapshot() {
  return getSnapshot()
}
