/**
 * AllFantasy unified projection engine — single import surface for tools.
 * Core math lives in `resolveNormalizedPlayerSportsProfiles` + `effectiveFantasyPoints`.
 */

export type { FantasyProjectionEngineBatch, FantasyProjectionEngineRow } from '@/lib/projection-engine/types'
export { buildFantasyProjectionEngineRows } from '@/lib/projection-engine/buildFantasyProjectionEngineRows'
export { effectiveFantasyPoints, collectProjectionNotes } from '@/lib/ai-tools-start-sit/effectiveProjection'
