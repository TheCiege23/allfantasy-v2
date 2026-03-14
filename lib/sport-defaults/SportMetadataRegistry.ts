/**
 * Central registry of sport metadata: display name, short name, icon, logo strategy, season type.
 * Used by SportDefaultsResolver and UI for labels/logos.
 */
import type { SportType, SportMetadata } from './types'
import { SPORT_TYPES } from './types'

const METADATA: Record<SportType, SportMetadata> = {
  NFL: {
    sport_type: 'NFL',
    display_name: 'NFL',
    short_name: 'NFL',
    icon: '🏈',
    logo_strategy: 'sleeper',
    default_season_type: 'regular',
  },
  NBA: {
    sport_type: 'NBA',
    display_name: 'NBA',
    short_name: 'NBA',
    icon: '🏀',
    logo_strategy: 'sleeper',
    default_season_type: 'regular',
  },
  MLB: {
    sport_type: 'MLB',
    display_name: 'MLB',
    short_name: 'MLB',
    icon: '⚾',
    logo_strategy: 'sleeper',
    default_season_type: 'regular',
  },
  NHL: {
    sport_type: 'NHL',
    display_name: 'NHL',
    short_name: 'NHL',
    icon: '🏒',
    logo_strategy: 'sleeper',
    default_season_type: 'regular',
  },
  NCAAF: {
    sport_type: 'NCAAF',
    display_name: 'NCAA Football',
    short_name: 'NCAAF',
    icon: '🏈',
    logo_strategy: 'sleeper',
    default_season_type: 'regular',
  },
  NCAAB: {
    sport_type: 'NCAAB',
    display_name: 'NCAA Basketball',
    short_name: 'NCAAB',
    icon: '🏀',
    logo_strategy: 'sleeper',
    default_season_type: 'regular',
  },
  SOCCER: {
    sport_type: 'SOCCER',
    display_name: 'Soccer',
    short_name: 'SOCCER',
    icon: '⚽',
    logo_strategy: 'espn',
    default_season_type: 'regular',
  },
}

export function getSportMetadata(sportType: SportType): SportMetadata {
  return METADATA[sportType] ?? METADATA.NFL
}

export function getAllSportMetadata(): SportMetadata[] {
  return SPORT_TYPES.map(getSportMetadata)
}

export function getSportDisplayName(sportType: SportType): string {
  return getSportMetadata(sportType).display_name
}

export function getSportIcon(sportType: SportType): string {
  return getSportMetadata(sportType).icon
}
