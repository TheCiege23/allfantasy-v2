export type {
  IntelligenceChipState,
  IntelligencePlatformHealth,
  IntelligenceSnapshot,
  LeagueSourceKind,
  ResolvedLeagueIntelligenceContext,
} from '@/lib/intelligence/types'

export { computeIntelligencePlatformHealth } from '@/lib/intelligence/computePlatformHealth'
export { resolveLeagueIntelligenceContext } from '@/lib/intelligence/resolveLeagueIntelligenceContext'
export { buildIntelligenceSnapshot } from '@/lib/intelligence/buildIntelligenceSnapshot'
export { buildAiToolPayload } from '@/lib/intelligence/buildAiToolPayload'
export type { AiToolPayloadEnvelope } from '@/lib/intelligence/buildAiToolPayload'
export { attachIntelligenceToChimmyPayload } from '@/lib/intelligence/chimmyIntelligenceMerge'

export { buildStandardAiPayload } from '@/lib/ai-payload/buildStandardAiPayload'
export type { BuildStandardAiPayloadArgs } from '@/lib/ai-payload/buildStandardAiPayload'
export {
  AI_PAYLOAD_SYSTEM_REMINDER,
  STANDARD_AI_TOOL_RESPONSE_JSON_SCHEMA,
} from '@/lib/ai-payload/types'
export type {
  AllFantasyStandardAiPayload,
  AiTeamContextPayload,
  StandardAiToolResponse,
} from '@/lib/ai-payload/types'
