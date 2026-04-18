/**
 * DB-backed team metadata (SportsTeam). Loaded separately so SportTeamMetadataRegistry.ts
 * stays free of prisma for client-safe static logo resolution.
 */

import { prisma } from '@/lib/prisma'
import type { SportType, TeamMetadata } from './types'
import {
  getTeamMetadataForSport,
  logoUrlForAbbrev,
} from './SportTeamMetadataRegistry'

function toSportType(s: string): SportType {
  const u = s.toUpperCase()
  if (u === 'NFL' || u === 'NBA' || u === 'MLB' || u === 'NHL' || u === 'NCAAF' || u === 'NCAAB' || u === 'SOCCER') {
    return u as SportType
  }
  return 'NFL'
}

export async function getTeamMetadataForSportDbAware(
  sportType: SportType | string,
  options?: { limit?: number }
): Promise<TeamMetadata[]> {
  const sport = toSportType(typeof sportType === 'string' ? sportType : sportType)

  let rows: Array<{
    externalId: string | null
    shortName: string | null
    name: string
    city: string | null
    conference: string | null
    division: string | null
    logo: string | null
    primaryColor: string | null
  }> = []

  try {
    rows = await prisma.sportsTeam.findMany({
      where: { sport },
      orderBy: { fetchedAt: 'desc' },
      take: options?.limit ?? 500,
    })
  } catch {
    return getTeamMetadataForSport(sport)
  }

  if (rows.length === 0) {
    return getTeamMetadataForSport(sport)
  }

  const deduped = new Map<string, TeamMetadata>()
  for (const row of rows) {
    const abbreviation = (row.shortName ?? row.externalId ?? row.name).trim().toUpperCase()
    if (!abbreviation) continue
    if (deduped.has(abbreviation)) continue
    deduped.set(abbreviation, {
      team_id: row.externalId || abbreviation,
      sport_type: sport,
      team_name: row.name,
      city: row.city ?? '',
      abbreviation,
      conference: row.conference ?? null,
      division: row.division ?? null,
      primary_logo_url: row.logo ?? logoUrlForAbbrev(sport, abbreviation),
      alternate_logo_url: null,
      primary_color: row.primaryColor ?? null,
    })
  }

  if (deduped.size === 0) {
    return getTeamMetadataForSport(sport)
  }

  return [...deduped.values()]
}
