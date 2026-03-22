import {
  DEFAULT_SPORT,
  SUPPORTED_SPORTS,
  isSupportedSport,
  normalizeToSupportedSport,
  type SupportedSport,
} from '@/lib/sport-scope'

export type RelationshipSport = SupportedSport

export const RELATIONSHIP_SPORTS = [...SUPPORTED_SPORTS]

export function normalizeSportForRelationship(
  sport: string | null | undefined
): RelationshipSport {
  return normalizeToSupportedSport(sport)
}

export function normalizeOptionalSportForRelationship(
  sport: string | null | undefined
): RelationshipSport | null {
  if (!sport || !String(sport).trim()) return null
  return normalizeSportForRelationship(sport)
}

export function isSupportedRelationshipSport(
  sport: string | null | undefined
): sport is RelationshipSport {
  return isSupportedSport(sport)
}

export function getRelationshipSportLabel(sport: string | null | undefined): string {
  const resolved = sport ? normalizeSportForRelationship(sport) : DEFAULT_SPORT
  if (resolved === 'NCAAB') return 'NCAA Basketball'
  if (resolved === 'NCAAF') return 'NCAA Football'
  return resolved
}
