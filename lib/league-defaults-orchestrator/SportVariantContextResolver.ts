/**
 * Resolves sport + variant into a normalized context for league creation and defaults.
 * Ensures NFL IDP is treated as an NFL variant and Soccer as a first-class sport.
 */
import type { LeagueSport } from '@prisma/client'
import { SUPPORTED_SPORTS, DEFAULT_SPORT } from '@/lib/sport-scope'

export { SUPPORTED_SPORTS }

export interface SportVariantContext {
  sport: LeagueSport
  variant: string | null
  /** Format type for roster/scoring resolution (e.g. 'IDP' for NFL IDP). */
  formatType: string
  /** True when variant is IDP or DYNASTY_IDP for NFL. */
  isNflIdp: boolean
  /** True when sport is Soccer. */
  isSoccer: boolean
  /** Display label for UI (e.g. 'NFL', 'NFL IDP', 'Soccer'). */
  displayLabel: string
}

/**
 * Resolve sport and optional variant into a single context for defaults and initialization.
 */
export function resolveSportVariantContext(
  sport: LeagueSport | string,
  variant?: string | null
): SportVariantContext {
  const s = (typeof sport === 'string' ? sport : sport) as LeagueSport
  const v = variant?.trim() || null
  const upperV = v?.toUpperCase() ?? ''
  const isNflIdp = s === 'NFL' && (upperV === 'IDP' || upperV === 'DYNASTY_IDP')
  const formatType = isNflIdp ? 'IDP' : (v ?? 'STANDARD')
  const isSoccer = s === 'SOCCER'

  let displayLabel: string
  if (s === 'NFL' && isNflIdp) displayLabel = 'NFL IDP'
  else if (s === 'SOCCER') displayLabel = 'Soccer'
  else if (s === 'NCAAF') displayLabel = 'NCAA Football'
  else if (s === 'NCAAB') displayLabel = 'NCAA Basketball'
  else displayLabel = s

  return {
    sport: SUPPORTED_SPORTS.includes(s) ? s : DEFAULT_SPORT,
    variant: v,
    formatType,
    isNflIdp,
    isSoccer,
    displayLabel,
  }
}
