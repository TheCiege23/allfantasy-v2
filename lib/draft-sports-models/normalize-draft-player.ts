/**
 * Normalize raw provider/API player data into internal draft models.
 * Sport-aware; supports NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER.
 */

import type { DraftSport } from './types'
import type {
  PlayerDisplayModel,
  PlayerAssetModel,
  PlayerDraftMetadataModel,
  PlayerStatSnapshotModel,
  TeamDisplayModel,
  NormalizedDraftEntry,
} from './types'
import { resolvePlayerAssets, buildTeamDisplayModel } from './player-asset-resolver'
import { normalizeToSupportedSport } from '@/lib/sport-scope'

export type RawDraftPlayerLike = {
  name?: string | null
  playerName?: string | null
  full_name?: string | null
  position?: string | null
  pos?: string | null
  secondaryPositions?: string[] | null
  positionEligibility?: string[] | null
  eligiblePositions?: string[] | null
  team?: string | null
  teamAbbr?: string | null
  playerId?: string | null
  sleeperId?: string | null
  id?: string | null
  adp?: number | null
  bye?: number | null
  byeWeek?: number | null
  injuryStatus?: string | null
  status?: string | null
  college?: string | null
  collegeOrPipeline?: string | null
  isDevy?: boolean
  school?: string | null
  draftEligibleYear?: number | null
  graduatedToNFL?: boolean
  /** C2C: 'college' | 'pro' */
  poolType?: 'college' | 'pro'
  [key: string]: unknown
}

/**
 * Normalize one raw player into NormalizedDraftEntry with PlayerDisplayModel.
 */
export function normalizeDraftPlayer(
  raw: RawDraftPlayerLike,
  sport: DraftSport | string
): NormalizedDraftEntry {
  const sportNorm = normalizeToSupportedSport(sport) as DraftSport
  const name = String(raw.name ?? raw.playerName ?? raw.full_name ?? '').trim()
  const position = String(raw.position ?? raw.pos ?? '').trim()
  const teamAbbr = raw.team ?? raw.teamAbbr ?? null
  const teamStr = teamAbbr != null ? String(teamAbbr).trim() : null
  const playerId =
    raw.playerId ?? raw.sleeperId ?? raw.id ?? (name ? `name:${name}:${position}:${teamStr ?? ''}` : '')
  const adp = raw.adp != null ? Number(raw.adp) : null
  const byeWeek = raw.byeWeek ?? raw.bye ?? null
  const bye = byeWeek != null ? Number(byeWeek) : null
  const injuryStatus = raw.injuryStatus ?? raw.status ?? null
  const collegeOrPipeline = raw.collegeOrPipeline ?? raw.college ?? raw.school ?? null
  const isDevy = Boolean(raw.isDevy)
  const school = raw.school ?? (isDevy ? collegeOrPipeline : null)
  const draftEligibleYear = raw.draftEligibleYear != null ? Number(raw.draftEligibleYear) : null
  const graduatedToNFL = Boolean(raw.graduatedToNFL)
  const secondaryPositions = Array.isArray(raw.secondaryPositions)
    ? raw.secondaryPositions.map((p) => String(p).trim()).filter(Boolean)
    : []
  const explicitEligibility = Array.isArray(raw.positionEligibility)
    ? raw.positionEligibility
    : Array.isArray(raw.eligiblePositions)
      ? raw.eligiblePositions
      : []
  const positionEligibility = Array.from(
    new Set(
      [position, ...secondaryPositions, ...explicitEligibility]
        .map((p) => String(p ?? '').trim().toUpperCase())
        .filter(Boolean)
    )
  )

  const assets = resolvePlayerAssets(playerId || null, teamStr, sportNorm)
  const team = buildTeamDisplayModel(teamStr, sportNorm)

  const metadata: PlayerDraftMetadataModel = {
    position: position || '—',
    secondaryPositions: secondaryPositions.length > 0 ? secondaryPositions : undefined,
    positionEligibility: positionEligibility.length > 0 ? positionEligibility : undefined,
    teamAbbreviation: teamStr,
    teamAffiliation: teamStr ?? (school != null ? String(school).trim() : null),
    byeWeek: bye,
    injuryStatus: injuryStatus != null ? String(injuryStatus).trim() : null,
    collegeOrPipeline: collegeOrPipeline != null ? String(collegeOrPipeline).trim() : (school != null ? String(school).trim() : null),
    sport: sportNorm,
  }

  const stats: PlayerStatSnapshotModel = {
    primaryStatLabel: adp != null ? 'ADP' : null,
    primaryStatValue: adp ?? null,
    secondaryStatLabel: bye != null && bye > 0 ? 'Bye' : null,
    secondaryStatValue: bye ?? null,
    adp: adp ?? null,
    byeWeek: bye ?? null,
  }

  const display: PlayerDisplayModel = {
    playerId: String(playerId),
    displayName: name || '—',
    sport: sportNorm,
    assets,
    team,
    stats,
    metadata,
  }

  return {
    display,
    name: name || '—',
    position: metadata.position,
    team: teamStr,
    adp: adp ?? undefined,
    byeWeek: bye ?? undefined,
    playerId: playerId ? String(playerId) : undefined,
    injuryStatus: metadata.injuryStatus ?? undefined,
    collegeOrPipeline: metadata.collegeOrPipeline ?? undefined,
    isDevy: isDevy || undefined,
    school: school != null ? String(school).trim() : undefined,
    draftEligibleYear: draftEligibleYear ?? undefined,
    graduatedToNFL: graduatedToNFL || undefined,
    poolType: raw.poolType ?? (isDevy ? 'college' : undefined),
  }
}

/**
 * Normalize a list of raw players into NormalizedDraftEntry[].
 */
export function normalizeDraftPlayerList(
  rawList: RawDraftPlayerLike[],
  sport: DraftSport | string
): NormalizedDraftEntry[] {
  const sportNorm = normalizeToSupportedSport(sport) as DraftSport
  return (rawList || []).map((raw) => normalizeDraftPlayer(raw, sportNorm))
}
