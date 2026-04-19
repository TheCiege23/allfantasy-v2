/**
 * AllFantasy Standard AI Payload — single structured contract for every AI tool.
 * All league/roster/time values must come from resolvers/DB; never fabricate.
 */

import type { AiTimeContextPayload, DataFreshnessTimestamps } from '@/lib/time-engine/types'
import type { NormalizedLeagueContext } from '@/lib/league-context-engine/types'
import type { IntelligencePlatformHealth } from '@/lib/intelligence/types'
import type { AllFantasyLearningLayersPayload } from '@/lib/ai-learning-system/types'
import type { StrategicCoachingSnapshot } from '@/lib/long-term-coaching/types'

export type AiPayloadMode = 'global' | 'league'

/** Tool identity + routing — no invented IDs. */
export type AllFantasyAiContextBlock = {
  userId: string
  sport: string
  tool: string
  mode: AiPayloadMode
}

/**
 * Time context is the existing `AiTimeContextPayload` (server UTC, user TZ, locks, waiver, freshness).
 * @see buildAiTimeContextPayload
 */
export type AllFantasyAiTimeContextBlock = AiTimeContextPayload

/** Full normalized league rules (scoring, roster, waiver, trade, playoff). */
export type AllFantasyAiLeagueContextBlock = NormalizedLeagueContext | null

export type AiRosterPlayerRef = {
  playerId: string
  name: string | null
  position: string | null
  team: string | null
  injuryStatus: string | null
}

export type AiTeamContextPayload = {
  schemaVersion: 1
  teamId: string | null
  teamName: string | null
  platformUserId: string | null
  record: { wins: number; losses: number; ties: number } | null
  standingRank: number | null
  pointsFor: number | null
  rosterPlayerCount: number
  starters: AiRosterPlayerRef[]
  bench: AiRosterPlayerRef[]
  injuredReserve: AiRosterPlayerRef[]
  taxi: AiRosterPlayerRef[]
  opponentThisPeriod: { label: string | null; week: number | null } | null
  dataGaps: string[]
}

/** Aggregated freshness for prompts (subset also lives on timeContext). */
export type AllFantasyAiDataFreshnessBlock = {
  timestamps: DataFreshnessTimestamps
  leagueLastSyncedAt: string | null
  importMappingOk: boolean | null
  computedAt: string
}

/**
 * Optional shape for model outputs — tools may parse into this for consistent UI.
 * Values are always produced by models from structured inputs, not invented server-side.
 */
export type StandardAiToolResponse = {
  verdict?: string | null
  explanation?: string | null
  confidence?: number | null
  urgency?: 'low' | 'medium' | 'high' | null
  recommendedAction?: string | null
  risks?: string[]
  alternatives?: string[]
}

/** Hints for orchestration layers (optional; does not change deterministic data). */
export type AiProviderRoutingHints = {
  openai?: string
  deepseek?: string
  grok?: string
}

/**
 * Canonical v2 payload — use for OpenAI / DeepSeek / Grok prompts and Chimmy bridges.
 */
export type AllFantasyStandardAiPayload = {
  schemaVersion: 2
  context: AllFantasyAiContextBlock
  timeContext: AllFantasyAiTimeContextBlock
  leagueContext: AllFantasyAiLeagueContextBlock
  teamContext: AiTeamContextPayload | null
  dataFreshness: AllFantasyAiDataFreshnessBlock
  /** Tool-specific arguments (lineup questions, trade assets, trend window, etc.). */
  toolInput: Record<string, unknown>
  /** Same as toolInput — stable alias for older prompt templates. */
  data: Record<string, unknown>
  providerHints?: AiProviderRoutingHints | null
  /** Optional platform health snapshot (same as legacy envelope `health`). */
  platformHealth?: IntelligencePlatformHealth | null
  /**
   * Deterministic 3-level learning (app / league / user) from `af_learning_*` tables.
   * Soft personalization only — never overrides injuries, locks, or scoring rules.
   */
  learningLayers?: AllFantasyLearningLayersPayload | null
  /**
   * Optional long-term strategic coaching snapshot (dynasty / devy / C2C / keeper).
   * Populated when `includeStrategicCoaching` is set on the payload builder — reflects the user’s team, not a trade partner.
   */
  strategicCoaching?: StrategicCoachingSnapshot | null
}

/** JSON-schema description for documentation / structured output tooling. */
export const STANDARD_AI_TOOL_RESPONSE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: ['string', 'null'] },
    explanation: { type: ['string', 'null'] },
    confidence: { type: ['number', 'null'] },
    urgency: { type: ['string', 'null'], enum: ['low', 'medium', 'high', null] },
    recommendedAction: { type: ['string', 'null'] },
    risks: { type: 'array', items: { type: 'string' } },
    alternatives: { type: 'array', items: { type: 'string' } },
  },
} as const

export const AI_PAYLOAD_SYSTEM_REMINDER =
  'Use only the provided structured fields (context, timeContext, leagueContext, teamContext, dataFreshness, toolInput, learningLayers and strategicCoaching when present). Do not invent league settings, times, players, injuries, or projections. Treat learningLayers as advisory behavior/market tendencies; official status and rules always win. Treat strategicCoaching as deterministic team strategy context (contend vs rebuild signals); it does not override weekly injuries, locks, or scoring.'
