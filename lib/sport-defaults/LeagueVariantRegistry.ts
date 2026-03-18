/**
 * Registry of league variants (presets) per sport.
 * NFL: STANDARD, PPR, HALF_PPR, SUPERFLEX, IDP, DYNASTY_IDP.
 * Other sports: STANDARD (or sport-specific format).
 * Used by LeaguePresetResolver and league creation to resolve roster/scoring by (sport, variant).
 */
import type { SportType, NFLLeagueVariant } from './types'
import { toSportType } from './sport-type-utils'

export const NFL_VARIANTS: NFLLeagueVariant[] = [
  'STANDARD',
  'PPR',
  'HALF_PPR',
  'SUPERFLEX',
  'IDP',
  'DYNASTY_IDP',
]

export const NFL_VARIANT_LABELS: Record<NFLLeagueVariant, string> = {
  STANDARD: 'Standard',
  PPR: 'PPR',
  HALF_PPR: 'Half PPR',
  SUPERFLEX: 'Superflex',
  IDP: 'IDP',
  DYNASTY_IDP: 'Dynasty IDP',
}

/** IDP roster overlay: extra starter slots added to base NFL roster. */
export const NFL_IDP_ROSTER_OVERLAY: Record<string, number> = {
  DE: 2,
  DT: 1,
  LB: 2,
  CB: 2,
  S: 2,
}

/**
 * Map NFL variant to scoring/roster formatType (for template resolution).
 */
export function getFormatTypeForVariant(
  sportType: SportType | string,
  variant: string | null | undefined
): string {
  const sport = toSportType(typeof sportType === 'string' ? sportType : sportType)
  const v = (variant ?? 'STANDARD').toUpperCase()
  const vLower = (variant ?? '').toLowerCase()
  if (vLower === 'devy_dynasty' || vLower === 'devy') return 'devy_dynasty'
  if (sport !== 'NFL') return 'standard'
  if (v === 'IDP' || v === 'DYNASTY_IDP') return 'IDP'
  if (v === 'HALF_PPR') return 'Half PPR'
  if (v === 'PPR') return 'PPR'
  if (v === 'STANDARD') return 'standard'
  if (v === 'SUPERFLEX') return 'PPR'
  return 'PPR'
}

/**
 * Get roster overlay for variant (extra starter_slots to merge with base). Only NFL IDP adds slots.
 */
export function getRosterOverlayForVariant(
  sportType: SportType | string,
  variant: string | null | undefined
): Record<string, number> | null {
  const sport = toSportType(typeof sportType === 'string' ? sportType : sportType)
  const v = (variant ?? '').toUpperCase()
  if (sport === 'NFL' && (v === 'IDP' || v === 'DYNASTY_IDP')) return { ...NFL_IDP_ROSTER_OVERLAY }
  return null
}

/**
 * Check if variant is IDP (adds IDP slots and scoring).
 */
export function isIdpVariant(variant: string | null | undefined): boolean {
  const v = (variant ?? '').toUpperCase()
  return v === 'IDP' || v === 'DYNASTY_IDP'
}

/**
 * Check if variant is Devy Dynasty (specialty format with devy/rookie/startup drafts).
 */
export function isDevyDynastyVariant(variant: string | null | undefined): boolean {
  const v = (variant ?? '').toLowerCase()
  return v === 'devy_dynasty'
}

/**
 * Get list of variant options for a sport (for league creation UI).
 */
export function getVariantsForSport(sportType: SportType | string): { value: string; label: string }[] {
  const sport = toSportType(typeof sportType === 'string' ? sportType : sportType)
  if (sport === 'NFL') {
    return NFL_VARIANTS.map((v) => ({ value: v, label: NFL_VARIANT_LABELS[v] }))
  }
  return [{ value: 'STANDARD', label: 'Standard' }]
}
