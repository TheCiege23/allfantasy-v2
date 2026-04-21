/**
 * Resolves sport + variant into a normalized context for league creation and defaults.
 * Ensures football IDP (NFL + NCAAF) is treated as a first-class variant and Soccer as a first-class sport.
 */
import type { LeagueSport } from '@prisma/client'
import { SUPPORTED_SPORTS, DEFAULT_SPORT, supportsIdpLeagueSport } from '@/lib/sport-scope'

export { SUPPORTED_SPORTS }

export interface SportVariantContext {
  sport: LeagueSport
  variant: string | null
  /** Format type for roster/scoring resolution (e.g. 'IDP' for NFL IDP). */
  formatType: string
  /** True when variant is IDP or DYNASTY_IDP for IDP-supported football sports. */
  isFootballIdp?: boolean
  /** True when variant is IDP or DYNASTY_IDP for IDP-supported football sports (legacy field name). */
  isNflIdp: boolean
  /** True when sport is Soccer. */
  isSoccer: boolean
  /** Display label for UI (e.g. 'NFL', 'NFL IDP', 'Soccer'). */
  displayLabel: string
}

function toLeagueSport(sport: LeagueSport | string): LeagueSport {
  const normalized = String(sport ?? '')
    .trim()
    .toUpperCase() as LeagueSport
  return SUPPORTED_SPORTS.includes(normalized) ? normalized : DEFAULT_SPORT
}

function normalizeVariant(variant?: string | null): string | null {
  const raw = String(variant ?? '').trim()
  if (!raw) return null

  const upper = raw.toUpperCase()
  if (upper === 'DEVY' || upper === 'DEVY_DYNASTY') return 'devy_dynasty'
  if (upper === 'C2C' || upper === 'MERGED_DEVY_C2C') return 'merged_devy_c2c'
  if (upper === 'IDP' || upper === 'DYNASTY_IDP') return upper
  if (upper === 'STANDARD' || upper === 'PPR' || upper === 'HALF_PPR' || upper === 'SUPERFLEX') return upper
  if (upper === 'NO_PLAYOFF') return 'NO_PLAYOFF'
  return raw
}

/**
 * Resolve sport and optional variant into a single context for defaults and initialization.
 */
export function resolveSportVariantContext(
  sport: LeagueSport | string,
  variant?: string | null
): SportVariantContext {
  const s = toLeagueSport(sport)
  const v = normalizeVariant(variant)
  const upperV = v?.toUpperCase() ?? ''
  const isFootballIdp = supportsIdpLeagueSport(s) && (upperV === 'IDP' || upperV === 'DYNASTY_IDP')
  const formatType = isFootballIdp ? 'IDP' : (v ?? 'STANDARD')
  const isSoccer = s === 'SOCCER'

  let displayLabel: string
  if (isFootballIdp && s === 'NFL') displayLabel = 'NFL IDP'
  else if (isFootballIdp && s === 'NCAAF') displayLabel = 'NCAAF IDP'
  else if (s === 'SOCCER') displayLabel = 'Soccer'
  else if (s === 'NCAAF') displayLabel = 'NCAA Football'
  else if (s === 'NCAAB') displayLabel = 'NCAA Basketball'
  else displayLabel = s

  return {
    sport: s,
    variant: v,
    formatType,
    isFootballIdp,
    isNflIdp: isFootballIdp,
    isSoccer,
    displayLabel,
  }
}
