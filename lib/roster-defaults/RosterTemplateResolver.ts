/**
 * Resolves roster template for a sport (DB or in-memory default).
 * Delegates to multi-sport RosterTemplateService; provides a single entry for draft/waiver/lineup.
 */
import type { SportType } from './types'
import { getRosterTemplate, type RosterTemplateDto } from '@/lib/multi-sport/RosterTemplateService'
import { toSportType } from '@/lib/sport-defaults/sport-type-utils'

/**
 * Resolve roster template for a sport (and optional format).
 * Use for league creation, draft room position list, and lineup/waiver rules.
 */
export async function resolveRosterTemplate(
  sportType: SportType | string,
  formatType: string = 'standard'
): Promise<RosterTemplateDto> {
  const sport = toSportType(typeof sportType === 'string' ? sportType : sportType)
  return getRosterTemplate(sport, formatType)
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
  await getOrCreateLeagueRosterConfig(leagueId, leagueSport, formatType ?? 'standard')
  return resolveRosterTemplate(leagueSport, formatType ?? 'standard')
}
