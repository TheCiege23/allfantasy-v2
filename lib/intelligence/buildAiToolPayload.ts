import 'server-only'

import { buildStandardAiPayload } from '@/lib/ai-payload/buildStandardAiPayload'
import type { AllFantasyStandardAiPayload } from '@/lib/ai-payload/types'
import type { AiTimeContextPayload } from '@/lib/time-engine/types'
import type { IntelligencePlatformHealth } from '@/lib/intelligence/types'

/**
 * Legacy envelope for Chimmy / AI tool payloads — wraps `AllFantasyStandardAiPayload`.
 * Prefer reading `standard` (or `intelligence.standard` after merge) for new code.
 */
export type AiToolPayloadEnvelope = {
  schemaVersion: 1
  tool: string
  mode: 'global' | 'league'
  time: AiTimeContextPayload
  health?: IntelligencePlatformHealth
  league?: { leagueId: string; leagueName: string | null; sport: string } | null
  data: Record<string, unknown>
  /** Canonical structured payload — single source of truth for prompts. */
  standard: AllFantasyStandardAiPayload
}

export async function buildAiToolPayload(args: {
  userId: string
  tool: string
  mode: 'global' | 'league'
  data: Record<string, unknown>
  league?: { leagueId: string; leagueName: string | null; sport: string } | null
  /** When set, enriches time payload with league-local waiver estimate + sport hint. */
  enrichTimeFromLeagueId?: string | null
  /** When true, runs `computeIntelligencePlatformHealth()` (extra DB/cache work). */
  includeHealth?: boolean
  /** Passed through to `buildStandardAiPayload`. */
  includeTeamContext?: boolean
  preferredTeamId?: string | null
  preferredTeamExternalId?: string | null
  includeLearningLayers?: boolean
  includeStrategicCoaching?: boolean
}): Promise<AiToolPayloadEnvelope> {
  const standard = await buildStandardAiPayload({
    userId: args.userId,
    tool: args.tool,
    mode: args.mode,
    league: args.league ?? null,
    toolInput: args.data,
    enrichTimeFromLeagueId: args.enrichTimeFromLeagueId ?? null,
    includeHealth: args.includeHealth,
    includeTeamContext: args.includeTeamContext,
    preferredTeamId: args.preferredTeamId ?? null,
    preferredTeamExternalId: args.preferredTeamExternalId ?? null,
    includeLearningLayers: args.includeLearningLayers,
    includeStrategicCoaching: args.includeStrategicCoaching,
  })

  const health =
    args.includeHealth && standard.platformHealth != null ? standard.platformHealth : undefined

  return {
    schemaVersion: 1,
    tool: args.tool,
    mode: args.mode,
    time: standard.timeContext,
    ...(health ? { health } : {}),
    league: args.league ?? null,
    data: args.data,
    standard,
  }
}
