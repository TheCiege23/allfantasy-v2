/**
 * Roster board — merge normalized wire rows into existing roster player shapes (display-only).
 */

import type { UnifiedPlayerWireDto } from '@/lib/player-data/serializeUnifiedPlayerForApi'
import type { NflRedraftCanonicalPlayer } from '@/lib/player-data/nflRedraftCanonicalPlayer'
import {
  buildNflRedraftPlayerMetadataFromWire,
  type NflRedraftPlayerDisplayMetadata,
} from '@/lib/player-data/nflRedraftPlayerMetadata'
import {
  buildNflRedraftPlayerIntelligenceFromWire,
  type NflRedraftPlayerIntelligence,
} from '@/lib/player-data/nflRedraftPlayerIntelligence'

export type RosterSectionKey = 'starters' | 'bench' | 'ir' | 'taxi' | 'devy'

/** Minimal row shape merged by id — matches useRosterManager `RosterPlayer` + optional enrichments */
export type RosterPlayerMergeable = {
  id: string
  name: string
  team: string
  position: string
  opponent: string
  gameTime: string
  projection: number
  actual: number | null
  status: 'healthy' | 'q' | 'out' | 'ir'
  slot: RosterSectionKey
  headshotUrl?: string | null
  teamLogoUrl?: string | null
  providerInjuryLabel?: string | null
  unifiedProjectedPoints?: number | null
  unifiedLowConfidence?: boolean
  profileSource?: string | null
  statsSource?: string | null
  canonicalNflRedraft?: NflRedraftCanonicalPlayer | null
  canonicalPlayerMetadata?: NflRedraftPlayerDisplayMetadata | null
  canonicalPlayerIntelligence?: NflRedraftPlayerIntelligence | null
  playerDataLastUpdatedAt?: string | null
  playerDataWarnings?: string[]
}

export type RosterStateMergeable = Record<RosterSectionKey, RosterPlayerMergeable[]>

function enrichOne(p: RosterPlayerMergeable, byId: Map<string, UnifiedPlayerWireDto>): RosterPlayerMergeable {
  const u = byId.get(p.id)
  if (!u) return p
  const canonical = u.nflRedraft ?? null
  const metadata = buildNflRedraftPlayerMetadataFromWire(u)
  const intelligence = buildNflRedraftPlayerIntelligenceFromWire(u)
  return {
    ...p,
    name: metadata?.displayName ?? canonical?.displayName ?? p.name,
    team: metadata?.teamAbbr ?? canonical?.teamAbbr ?? p.team,
    position: metadata?.position ?? canonical?.fantasyPosition ?? p.position,
    headshotUrl: metadata?.headshot.url ?? canonical?.media.headshot.url ?? u.headshotUrl ?? null,
    teamLogoUrl: metadata?.teamLogo.url ?? canonical?.media.teamLogo.url ?? u.teamLogoUrl ?? null,
    providerInjuryLabel: intelligence?.injury.injuryStatus ?? canonical?.injury.designation ?? u.injuryStatus ?? null,
    unifiedProjectedPoints:
      intelligence?.projection.projectedFantasyPoints != null &&
      Number.isFinite(Number(intelligence.projection.projectedFantasyPoints))
        ? Number(intelligence.projection.projectedFantasyPoints)
        : canonical?.currentProjection.weeklyProjectedPoints != null &&
          Number.isFinite(Number(canonical.currentProjection.weeklyProjectedPoints))
          ? Number(canonical.currentProjection.weeklyProjectedPoints)
        : u.projectedPoints != null && Number.isFinite(Number(u.projectedPoints))
          ? Number(u.projectedPoints)
          : null,
    unifiedLowConfidence: u.lowConfidence === true || Boolean(canonical?.fallbacks.length) || Boolean(intelligence?.providerFallback.fallback),
    profileSource: u.profileSource ?? null,
    statsSource: u.statsSource ?? null,
    canonicalNflRedraft: canonical,
    canonicalPlayerMetadata: metadata,
    canonicalPlayerIntelligence: intelligence,
    playerDataLastUpdatedAt: intelligence?.providerFreshness.updatedAtIso ?? canonical?.lastUpdatedAt ?? null,
    playerDataWarnings: intelligence?.providerFreshness.warnings ?? metadata?.providerFreshness.warnings ?? canonical?.dataFreshness.staleWarnings ?? [],
  }
}

function mapSection(
  players: RosterPlayerMergeable[],
  byId: Map<string, UnifiedPlayerWireDto>,
): RosterPlayerMergeable[] {
  return players.map((p) => enrichOne(p, byId))
}

/**
 * Non-destructive: same ids/slots/order; adds unified fields when player id matches `unifiedRoster`.
 */
export function mergeUnifiedIntoRosterState<T extends RosterStateMergeable>(state: T, unifiedRoster: UnifiedPlayerWireDto[] | null | undefined): T {
  const byId = new Map<string, UnifiedPlayerWireDto>()
  for (const row of unifiedRoster ?? []) {
    if (row?.id) byId.set(String(row.id), row)
  }
  const sections: RosterSectionKey[] = ['starters', 'bench', 'ir', 'taxi', 'devy']
  const out = { ...state }
  for (const key of sections) {
    out[key] = mapSection(state[key], byId) as T[typeof key]
  }
  return out
}
