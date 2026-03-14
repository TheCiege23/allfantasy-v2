/**
 * Resolves sport configuration for a league (sport from league record or explicit sport type).
 * Used by MultiSportLeagueService, roster, and scoring resolvers.
 */
import type { LeagueSport } from '@prisma/client'
import { getSportConfig, type SportConfig } from './SportRegistry'
import { toSportType, type SportType } from './sport-types'

const LEAGUE_SPORT_TO_TYPE: Record<LeagueSport, SportType> = {
  NFL: 'NFL',
  NHL: 'NHL',
  MLB: 'MLB',
  NBA: 'NBA',
  NCAAF: 'NCAAF',
  NCAAB: 'NCAAB',
  SOCCER: 'SOCCER',
}

export function leagueSportToSportType(leagueSport: LeagueSport): SportType {
  return LEAGUE_SPORT_TO_TYPE[leagueSport] ?? 'NFL'
}

export function sportTypeToLeagueSport(sportType: SportType): LeagueSport {
  return sportType as unknown as LeagueSport
}

/**
 * Resolve full sport config for a league (by its sport enum).
 */
export function resolveSportConfigForLeague(leagueSport: LeagueSport): SportConfig {
  const sportType = leagueSportToSportType(leagueSport)
  return getSportConfig(sportType)
}

/**
 * Resolve full sport config by string (e.g. from API or template).
 */
export function resolveSportConfig(sportTypeOrString: SportType | string): SportConfig {
  const sportType = typeof sportTypeOrString === 'string' ? toSportType(sportTypeOrString) : sportTypeOrString
  return getSportConfig(sportType)
}
