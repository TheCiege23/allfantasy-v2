/**
 * Resolves full sport default set for a given sport type.
 * Aggregates metadata, league, roster, scoring, draft, waiver, and team metadata from registries.
 */
import type { SportType, SportDefaultSet } from './types'
import { getSportMetadata } from './SportMetadataRegistry'
import {
  getLeagueDefaults,
  getRosterDefaults,
  getScoringDefaults,
  getDraftDefaults,
  getWaiverDefaults,
  getTeamMetadataDefaults,
} from './SportDefaultsRegistry'
import { toSportType } from './sport-type-utils'

/**
 * Resolve full default set for a sport (by SportType or string).
 */
export function resolveSportDefaults(sportType: SportType | string): SportDefaultSet {
  const sport = typeof sportType === 'string' ? toSportType(sportType) : sportType
  return {
    metadata: getSportMetadata(sport),
    league: getLeagueDefaults(sport),
    roster: getRosterDefaults(sport),
    scoring: getScoringDefaults(sport),
    draft: getDraftDefaults(sport),
    waiver: getWaiverDefaults(sport),
    teamMetadata: getTeamMetadataDefaults(sport),
  }
}

/**
 * Resolve only league + roster + scoring defaults (minimal set for league creation form).
 */
export function resolveLeagueCreationDefaults(sportType: SportType | string): Pick<
  SportDefaultSet,
  'metadata' | 'league' | 'roster' | 'scoring' | 'draft' | 'waiver'
> {
  const full = resolveSportDefaults(sportType)
  return {
    metadata: full.metadata,
    league: full.league,
    roster: full.roster,
    scoring: full.scoring,
    draft: full.draft,
    waiver: full.waiver,
  }
}
