/**
 * Resolves team logo URL by sport and team identifier (abbreviation or team_id).
 * Uses SportsTeam DB when available; falls back to SportTeamMetadataRegistry.
 */
import type { SportType } from './types'
import { getPrimaryLogoUrlForTeam } from './SportTeamMetadataRegistry'
import { prisma } from '@/lib/prisma'

function toSportType(s: string): SportType {
  const u = s.toUpperCase()
  if (u === 'NFL' || u === 'NBA' || u === 'MLB' || u === 'NHL' || u === 'NCAAF' || u === 'NCAAB' || u === 'SOCCER') return u as SportType
  return 'NFL'
}

/**
 * Resolve team logo URL for display. Tries DB (SportsTeam) first, then static registry.
 */
export async function resolveTeamLogoUrl(
  teamAbbreviationOrId: string | null,
  sportType: SportType | string
): Promise<string | null> {
  if (!teamAbbreviationOrId?.trim()) return null
  const sport = toSportType(typeof sportType === 'string' ? sportType : sportType)

  const abbr = teamAbbreviationOrId.trim().toUpperCase()

  const dbTeam = await prisma.sportsTeam.findFirst({
    where: {
      sport,
      OR: [
        { shortName: abbr },
        { shortName: teamAbbreviationOrId.trim() },
        { externalId: teamAbbreviationOrId.trim() },
      ],
    },
    orderBy: { fetchedAt: 'desc' },
  })
  if (dbTeam?.logo) return dbTeam.logo

  return getPrimaryLogoUrlForTeam(sport, abbr)
}

/**
 * Synchronous fallback when DB is not available (e.g. static export). Uses registry only.
 */
export function resolveTeamLogoUrlSync(
  teamAbbreviation: string | null,
  sportType: SportType | string
): string | null {
  if (!teamAbbreviation?.trim()) return null
  const sport = toSportType(typeof sportType === 'string' ? sportType : sportType)
  return getPrimaryLogoUrlForTeam(sport, teamAbbreviation.trim())
}
