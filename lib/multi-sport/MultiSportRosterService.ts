/**
 * Multi-sport roster service: resolve roster template and validate slot/position by sport.
 * Delegates to RosterTemplateService and SportRegistry for positions.
 */
import type { LeagueSport } from '@prisma/client'
import { leagueSportToSportType } from './SportConfigResolver'
import { getRosterTemplate, getOrCreateLeagueRosterConfig, type RosterTemplateDto } from './RosterTemplateService'
import { getPositionsForSport } from './SportRegistry'

/**
 * Get roster template for a league's sport (and optional format).
 * When leagueId is provided and league is IDP, uses commissioner IDP config for roster slots.
 */
export async function getRosterTemplateForLeague(
  leagueSport: LeagueSport,
  formatType?: string,
  leagueId?: string
): Promise<RosterTemplateDto> {
  const sportType = leagueSportToSportType(leagueSport)
  const format = formatType ?? 'standard'
  return getRosterTemplate(sportType, format, leagueId)
}

/**
 * Get or create league roster config; returns template id and overrides.
 */
export async function resolveLeagueRosterConfig(
  leagueId: string,
  leagueSport: LeagueSport,
  formatType?: string
): Promise<{ templateId: string; overrides: Record<string, unknown> | null }> {
  const sportType = leagueSportToSportType(leagueSport)
  const format = formatType ?? 'standard'
  return getOrCreateLeagueRosterConfig(leagueId, sportType, format)
}

/**
 * Check if a position is valid for the given sport (and optional format, e.g. IDP for NFL).
 */
export function isPositionAllowedForSport(
  sport: LeagueSport,
  position: string,
  formatType?: string
): boolean {
  const sportType = leagueSportToSportType(sport)
  const positions = getPositionsForSport(sportType, formatType)
  return positions.includes(position)
}

/**
 * Resolve allowed positions for a slot (from template slot or sport-wide).
 */
export function getAllowedPositionsForSlot(
  slotAllowedPositions: string[],
  sport: LeagueSport
): string[] {
  if (slotAllowedPositions.length > 0) return slotAllowedPositions
  return getPositionsForSport(leagueSportToSportType(sport))
}
