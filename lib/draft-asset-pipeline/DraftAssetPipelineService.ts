/**
 * Draft Asset Pipeline — single entry for all draft types (live, mock, auction, slow, keeper, devy, C2C).
 * Provides: asset normalization, asset cache, fallback placeholders, stat snapshot cache, team logo registry.
 * No provider-specific shapes leak to callers; all sports (NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER) supported.
 */

import type {
  PlayerAssetModel,
  PlayerStatSnapshotModel,
  TeamDisplayModel,
  NormalizedDraftEntry,
  DraftSport,
} from '@/lib/draft-sports-models/types'
import type { RawDraftPlayerLike } from '@/lib/draft-sports-models/normalize-draft-player'
import {
  resolvePlayerAssets,
  resolvePlayerAssetsBatch,
  buildTeamDisplayModel,
  resolveTeamLogoUrlSync,
  clearAssetCache,
} from '@/lib/draft-sports-models/player-asset-resolver'
import { normalizeDraftPlayer, normalizeDraftPlayerList } from '@/lib/draft-sports-models/normalize-draft-player'
import { getStatSnapshot, setStatSnapshot, clearStatSnapshotCache } from './stat-snapshot-cache'

/** Resolve player assets (headshot + team logo) with cache and fallbacks. */
export function resolveAssets(
  playerId: string | null,
  teamAbbreviation: string | null,
  sport: DraftSport | string
): PlayerAssetModel {
  return resolvePlayerAssets(playerId, teamAbbreviation, sport)
}

/** Resolve assets for multiple players in one call (batch; uses cache). */
export function resolveAssetsBatch(
  items: Array<{ playerId: string | null; teamAbbreviation: string | null; sport: string }>
): Map<string, PlayerAssetModel> {
  return resolvePlayerAssetsBatch(items)
}

/** Build team display model (logo from registry, abbreviation, sport). Never blank logo in UI — use team.displayName/abbreviation as fallback. */
export function getTeamDisplay(teamAbbreviation: string | null, sport: DraftSport | string): TeamDisplayModel | null {
  return buildTeamDisplayModel(teamAbbreviation, sport)
}

/** Get team logo URL from registry (sync). */
export function getTeamLogoUrl(teamAbbreviation: string | null, sport: DraftSport | string): string | null {
  return resolveTeamLogoUrlSync(teamAbbreviation, sport)
}

/** Get or compute stat snapshot for a raw player; uses stat snapshot cache when available. */
export function getStatSnapshotForPlayer(
  raw: RawDraftPlayerLike,
  sport: DraftSport | string
): PlayerStatSnapshotModel {
  const playerId =
    raw.playerId ?? raw.sleeperId ?? raw.id ?? (raw.name || raw.playerName || raw.full_name
      ? `name:${String(raw.name ?? raw.playerName ?? raw.full_name).trim()}:${String(raw.position ?? raw.pos ?? '').trim()}:${String(raw.team ?? raw.teamAbbr ?? '').trim()}`
      : '')
  const sportNorm = sport.toString().toUpperCase()
  const cached = playerId ? getStatSnapshot(playerId, sportNorm) : null
  if (cached) return cached

  const entry = normalizeDraftPlayer(raw, sport)
  const stats = entry.display.stats
  if (playerId) setStatSnapshot(playerId, sportNorm, stats)
  return stats
}

/** Normalize a single raw player into NormalizedDraftEntry (assets + stats + team from pipeline). */
export function normalizePlayer(raw: RawDraftPlayerLike, sport: DraftSport | string): NormalizedDraftEntry {
  return normalizeDraftPlayer(raw, sport)
}

/** Normalize a list of raw players (e.g. from ADP or player pool API). */
export function normalizePlayerList(
  rawList: RawDraftPlayerLike[],
  sport: DraftSport | string
): NormalizedDraftEntry[] {
  return normalizeDraftPlayerList(rawList, sport)
}

/** Clear all pipeline caches (assets + stat snapshots). Use for tests or admin refresh. */
export function clearPipelineCaches(): void {
  clearAssetCache()
  clearStatSnapshotCache()
}
