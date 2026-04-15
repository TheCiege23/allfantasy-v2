import { DEFAULT_SPORT, isSupportedSport, normalizeToSupportedSport, type SupportedSport } from '@/lib/sport-scope'

/** Prisma-backed sports plus optimizer-first extensions (not all are LeagueSport yet). */
export type ExtendedLineupSport = SupportedSport | 'GOLF' | 'NASCAR'

export function resolveExtendedLineupSport(raw?: string | null): ExtendedLineupSport {
  const u = raw?.trim().toUpperCase() ?? ''
  if (u === 'PGA' || u === 'GOLF') return 'GOLF'
  if (u === 'CUP' || u === 'NASCAR') return 'NASCAR'
  if (isSupportedSport(u)) return u as SupportedSport
  return normalizeToSupportedSport(raw)
}

export function isExtendedLineupSport(s: string): s is ExtendedLineupSport {
  return isSupportedSport(s) || s === 'GOLF' || s === 'NASCAR'
}

export function displaySportLabel(sport: string): string {
  if (sport === 'GOLF') return 'Golf'
  if (sport === 'NASCAR') return 'NASCAR'
  return sport
}

/** When sport is unknown/future, default roster template uses flexible utility slots. */
export function futureSportFallbackSlots(): string[] {
  return ['FLEX', 'FLEX', 'FLEX', 'FLEX', 'FLEX', 'FLEX', 'UTIL']
}

export { DEFAULT_SPORT }
