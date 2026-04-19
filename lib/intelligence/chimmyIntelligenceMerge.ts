import 'server-only'

import type { AiToolPayloadEnvelope } from '@/lib/intelligence/buildAiToolPayload'

/**
 * Merges the canonical AI time + envelope metadata into `chimmyPayload.intelligence`
 * so clients and downstream Chimmy bridges see one consistent shape across tools.
 */
export function attachIntelligenceToChimmyPayload(
  chimmyPayload: Record<string, unknown>,
  envelope: AiToolPayloadEnvelope,
  intelligenceExtras?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...chimmyPayload,
    intelligence: {
      schemaVersion: 1 as const,
      time: envelope.time,
      standard: envelope.standard,
      envelope: {
        schemaVersion: envelope.schemaVersion,
        tool: envelope.tool,
        mode: envelope.mode,
        league: envelope.league ?? null,
      },
      ...(envelope.health ? { health: envelope.health } : {}),
      ...(intelligenceExtras ?? {}),
    },
  }
}
