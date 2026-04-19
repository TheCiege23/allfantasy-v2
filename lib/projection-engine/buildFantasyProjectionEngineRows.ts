import type { NormalizedPlayerSportsProfile } from '@/lib/sports-data-normalization/types'
import { collectProjectionNotes, effectiveFantasyPoints } from '@/lib/ai-tools-start-sit/effectiveProjection'
import { annotatePlayerIdentityFromProfile } from '@/lib/identity/annotatePlayerIdentity'
import type { FantasyProjectionEngineRow } from '@/lib/projection-engine/types'

function rowKey(p: NormalizedPlayerSportsProfile, fallback: string): string {
  return p.player.id?.trim() || fallback
}

/**
 * Maps normalized sports profiles into the shared projection-engine row shape for tools,
 * War Room, and AI payloads (one path — no parallel projection math).
 */
export function buildFantasyProjectionEngineRows(args: {
  profiles: NormalizedPlayerSportsProfile[]
  idFallbackPrefix?: string
}): FantasyProjectionEngineRow[] {
  const prefix = args.idFallbackPrefix ?? 'p'
  return args.profiles.map((prof, i) => {
    const id = rowKey(prof, `${prefix}-${i}`)
    const pts = effectiveFantasyPoints(prof)
    const ann = annotatePlayerIdentityFromProfile(prof)
    const range = prof.projection.projectedFantasyPointsRange
    return {
      playerKey: id,
      rosterPlayerId: prof.player.id,
      profile: prof,
      projectedFantasyPoints: pts,
      projectionConfidence: prof.projection.projectionConfidence,
      projectionFloor: range?.low ?? null,
      projectionCeiling: range?.high ?? null,
      adjustedProjectionReasoning: collectProjectionNotes(prof),
      identityConfidence: ann.confidence,
      identityNotes: ann.notes,
    }
  })
}
