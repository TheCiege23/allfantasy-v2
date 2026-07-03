/**
 * Start/sit / matchup cards — map unified wire rows to compact display context (no scoring engine).
 */

import type { UnifiedPlayerWireDto } from '@/lib/player-data/serializeUnifiedPlayerForApi'
import {
  buildNflRedraftPlayerMetadataFromWire,
  type NflRedraftPlayerDisplayMetadata,
} from '@/lib/player-data/nflRedraftPlayerMetadata'
import {
  buildNflRedraftPlayerIntelligenceFromWire,
  type NflRedraftPlayerIntelligence,
} from '@/lib/player-data/nflRedraftPlayerIntelligence'

export type MatchupPlayerCardContext = {
  playerId: string
  name: string
  position: string | null
  team: string | null
  headshotUrl: string | null
  teamLogoUrl: string | null
  canonicalPlayerMetadata: NflRedraftPlayerDisplayMetadata | null
  canonicalPlayerIntelligence: NflRedraftPlayerIntelligence | null
  injuryStatus: string | null
  activeStatus: string | null
  projectedPoints: number | null
  liveStatsAvailable: boolean
  statsSource: string | null
  projectionSource: string | null
  lowConfidence: boolean
  staleDataWarnings: string[]
}

export function matchupContextFromUnifiedWire(row: UnifiedPlayerWireDto): MatchupPlayerCardContext {
  const canonical = row.nflRedraft ?? null
  const metadata = buildNflRedraftPlayerMetadataFromWire(row)
  const intelligence = buildNflRedraftPlayerIntelligenceFromWire(row)
  const stats = row.normalizedStats ?? {}
  const keys = Object.keys(stats).filter((k) => k !== 'projectionSource')
  return {
    playerId: row.id,
    name: metadata?.displayName ?? row.name,
    position: metadata?.position ?? canonical?.fantasyPosition ?? row.position,
    team: metadata?.teamAbbr ?? canonical?.teamAbbr ?? row.team,
    headshotUrl: metadata?.headshot.url ?? canonical?.media.headshot.url ?? row.headshotUrl,
    teamLogoUrl: metadata?.teamLogo.url ?? canonical?.media.teamLogo.url ?? row.teamLogoUrl,
    canonicalPlayerMetadata: metadata,
    canonicalPlayerIntelligence: intelligence,
    injuryStatus: intelligence?.injury.injuryStatus ?? canonical?.injury.designation ?? row.injuryStatus,
    activeStatus: canonical?.activeStatus ?? null,
    projectedPoints: intelligence?.projection.projectedFantasyPoints ?? canonical?.currentProjection.weeklyProjectedPoints ?? row.projectedPoints,
    liveStatsAvailable: keys.length > 2,
    statsSource: row.statsSource,
    projectionSource: intelligence?.projection.source ?? canonical?.currentProjection.source ?? row.projectionsSource,
    lowConfidence: row.lowConfidence === true || Boolean(canonical?.fallbacks.length) || Boolean(intelligence?.providerFallback.fallback),
    staleDataWarnings: intelligence?.providerFreshness.warnings ?? canonical?.dataFreshness.staleWarnings ?? [],
  }
}
