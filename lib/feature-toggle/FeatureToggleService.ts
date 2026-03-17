/**
 * Feature toggle service: read/write platform config keys.
 * Keys are strings; values are stored as string ("true"/"false") or JSON.
 */

import { prisma } from "@/lib/prisma"
import { SUPPORTED_SPORTS } from "@/lib/sport-scope"
import type { LeagueSport } from "@prisma/client"

export const FEATURE_KEYS = {
  AI_ASSISTANT: "feature_ai_assistant",
  MOCK_DRAFTS: "feature_mock_drafts",
  LEGACY_MODE: "feature_legacy_mode",
  BRACKET_CHALLENGES: "feature_bracket_challenges",
  SPORTS_AVAILABILITY: "sports_availability",
  TOOL_WAIVER_AI: "feature_tool_waiver_ai",
  TOOL_TRADE_ANALYZER: "feature_tool_trade_analyzer",
  TOOL_RANKINGS: "feature_tool_rankings",
  EXPERIMENTAL_LEGACY_IMPORT: "feature_experimental_legacy_import",
  EXPERIMENTAL_DYNASTY: "feature_experimental_dynasty",
} as const

const BOOLEAN_DEFAULTS: Record<string, boolean> = {
  [FEATURE_KEYS.AI_ASSISTANT]: true,
  [FEATURE_KEYS.MOCK_DRAFTS]: true,
  [FEATURE_KEYS.LEGACY_MODE]: true,
  [FEATURE_KEYS.BRACKET_CHALLENGES]: true,
  [FEATURE_KEYS.TOOL_WAIVER_AI]: true,
  [FEATURE_KEYS.TOOL_TRADE_ANALYZER]: true,
  [FEATURE_KEYS.TOOL_RANKINGS]: true,
  [FEATURE_KEYS.EXPERIMENTAL_LEGACY_IMPORT]: false,
  [FEATURE_KEYS.EXPERIMENTAL_DYNASTY]: true,
}

/** Get raw value for key, or null if not set. */
export async function getValue(key: string): Promise<string | null> {
  const row = await prisma.platformConfig.findUnique({
    where: { key },
    select: { value: true },
  })
  return row?.value ?? null
}

/** Set value for key (creates or updates). */
export async function setValue(key: string, value: string): Promise<void> {
  await prisma.platformConfig.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  })
}

/** Get boolean; defaults from BOOLEAN_DEFAULTS or false. */
export async function getBoolean(key: string): Promise<boolean> {
  const raw = await getValue(key)
  if (raw === null) return BOOLEAN_DEFAULTS[key] ?? false
  return raw.toLowerCase() === "true" || raw === "1"
}

/** Set boolean. */
export async function setBoolean(key: string, enabled: boolean): Promise<void> {
  await setValue(key, enabled ? "true" : "false")
}

/** Get JSON array of strings (e.g. enabled sports). */
export async function getStringArray(key: string): Promise<string[]> {
  const raw = await getValue(key)
  if (!raw || !raw.trim()) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : []
  } catch {
    return []
  }
}

/** Set JSON array of strings. */
export async function setStringArray(key: string, arr: string[]): Promise<void> {
  await setValue(key, JSON.stringify(arr))
}

export interface FeatureTogglesSnapshot {
  features: Record<string, boolean>
  sports: LeagueSport[]
  raw: Record<string, string>
}

/** Get full snapshot of all known toggles (for admin panel and resolver). */
export async function getFeatureTogglesSnapshot(): Promise<FeatureTogglesSnapshot> {
  const rows = await prisma.platformConfig.findMany({
    select: { key: true, value: true },
  })
  const raw: Record<string, string> = {}
  for (const r of rows) raw[r.key] = r.value

  const features: Record<string, boolean> = {}
  for (const key of Object.values(FEATURE_KEYS)) {
    if (key === FEATURE_KEYS.SPORTS_AVAILABILITY) continue
    const v = raw[key]
    if (v !== undefined) features[key] = v.toLowerCase() === "true" || v === "1"
    else features[key] = BOOLEAN_DEFAULTS[key] ?? false
  }

  let sports: LeagueSport[] = (SUPPORTED_SPORTS as unknown) as LeagueSport[]
  const sportsRaw = raw[FEATURE_KEYS.SPORTS_AVAILABILITY]
  if (sportsRaw) {
    try {
      const arr = JSON.parse(sportsRaw) as unknown
      if (Array.isArray(arr)) {
        const list = arr.filter((x): x is string => typeof x === "string") as LeagueSport[]
        if (list.length > 0) sports = list.filter((s) => (SUPPORTED_SPORTS as readonly string[]).includes(s))
      }
    } catch {
      // keep default all sports
    }
  }

  return { features, sports, raw }
}

/** All keys that are boolean toggles (for admin UI). */
export function getBooleanToggleKeys(): string[] {
  return Object.values(FEATURE_KEYS).filter((k) => k !== FEATURE_KEYS.SPORTS_AVAILABILITY)
}
