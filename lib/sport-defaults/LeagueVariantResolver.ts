/**
 * Canonical resolver for sport + league variant context used by defaults services.
 * Keeps variant handling centralized across initialization and preview paths.
 */
import type { SportType } from './types'
import { toSportType } from './sport-type-utils'
import { getFormatTypeForVariant, isIdpVariant } from './LeagueVariantRegistry'

export interface LeagueVariantResolution {
  sportType: SportType
  variant: string | null
  formatType: string
  isNflIdp: boolean
  isSoccer: boolean
}

export function resolveLeagueVariant(
  sport: SportType | string,
  variant?: string | null
): LeagueVariantResolution {
  const sportType = typeof sport === 'string' ? toSportType(sport) : sport
  const normalizedVariant = variant?.trim() ? variant.trim() : null
  const formatType = getFormatTypeForVariant(sportType, normalizedVariant)
  const isNflIdp = sportType === 'NFL' && isIdpVariant(normalizedVariant)
  return {
    sportType,
    variant: normalizedVariant,
    formatType,
    isNflIdp,
    isSoccer: sportType === 'SOCCER',
  }
}
