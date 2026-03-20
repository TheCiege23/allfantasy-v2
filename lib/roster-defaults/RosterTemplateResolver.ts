/**
 * Resolves roster template for a sport (DB or in-memory default).
 * Delegates to multi-sport RosterTemplateService; provides a single entry for draft/waiver/lineup.
 */
import type { SportType } from './types'
import { getRosterTemplate, type RosterTemplateDto } from '@/lib/multi-sport/RosterTemplateService'
import { toSportType } from '@/lib/sport-defaults/sport-type-utils'

function normalizeFormatTypeForRoster(sport: SportType, formatType: string): string {
  if (sport === 'NFL' && formatType.toUpperCase() === 'DYNASTY_IDP') return 'IDP'
  return formatType
}

/**
 * Resolve roster template for a sport (and optional format).
 * Use for league creation, draft room position list, and lineup/waiver rules.
 */
export async function resolveRosterTemplate(
  sportType: SportType | string,
  formatType: string = 'standard'
): Promise<RosterTemplateDto> {
  const sport = toSportType(typeof sportType === 'string' ? sportType : sportType)
  const normalizedFormat = normalizeFormatTypeForRoster(sport, formatType)
  return getRosterTemplate(sport, normalizedFormat)
}

/**
 * Resolve roster template for a league (by league id); requires league sport from DB.
 * Use when you have league context and need the template that league is using.
 */
export async function resolveRosterTemplateForLeague(
  leagueId: string,
  leagueSport: string,
  formatType?: string
): Promise<RosterTemplateDto> {
  const { getOrCreateLeagueRosterConfig } = await import('@/lib/multi-sport/RosterTemplateService')
  const sport = toSportType(leagueSport)
  const rawFormat = formatType ?? 'standard'
  const normalizedFormat = normalizeFormatTypeForRoster(sport, rawFormat)
  await getOrCreateLeagueRosterConfig(leagueId, sport, normalizedFormat)
  return resolveRosterTemplate(sport, normalizedFormat)
}
