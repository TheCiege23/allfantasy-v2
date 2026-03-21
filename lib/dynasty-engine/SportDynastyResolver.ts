/**
 * SportDynastyResolver — sport-aware dynasty horizon and aging logic.
 * Different sports have different peak ages and dynasty relevance.
 */

import { DYNASTY_SPORTS, normalizeSportForDynasty, type DynastySport } from './types'

export function getDynastySports(): readonly DynastySport[] {
  return DYNASTY_SPORTS
}

export function resolveSportForDynasty(sport: string): DynastySport {
  return normalizeSportForDynasty(sport)
}

/** Peak age range by position (sport-aware; default NFL). */
export function getPeakAgeRange(
  sport: string,
  position: string
): { peakStart: number; peakEnd: number; hardCliff: number } {
  const pos = position.toUpperCase()
  const nfl: Record<string, { peakStart: number; peakEnd: number; hardCliff: number }> = {
    QB: { peakStart: 27, peakEnd: 33, hardCliff: 38 },
    RB: { peakStart: 23, peakEnd: 26, hardCliff: 29 },
    WR: { peakStart: 25, peakEnd: 30, hardCliff: 33 },
    TE: { peakStart: 26, peakEnd: 30, hardCliff: 33 },
    K: { peakStart: 26, peakEnd: 32, hardCliff: 38 },
    DEF: { peakStart: 24, peakEnd: 28, hardCliff: 32 },
  }
  const nba: Record<string, { peakStart: number; peakEnd: number; hardCliff: number }> = {
    PG: { peakStart: 26, peakEnd: 31, hardCliff: 35 },
    SG: { peakStart: 26, peakEnd: 31, hardCliff: 35 },
    SF: { peakStart: 26, peakEnd: 31, hardCliff: 35 },
    PF: { peakStart: 27, peakEnd: 32, hardCliff: 36 },
    C: { peakStart: 27, peakEnd: 32, hardCliff: 36 },
  }
  const s = normalizeSportForDynasty(sport)
  if (s === 'NBA') return nba[pos] ?? nba.PG
  if (s === 'NHL' || s === 'MLB') {
    return { peakStart: 25, peakEnd: 30, hardCliff: 36 }
  }
  if (s === 'NCAAB' || s === 'NCAAF' || s === 'SOCCER') {
    return { peakStart: 22, peakEnd: 28, hardCliff: 32 }
  }
  return nfl[pos] ?? { peakStart: 25, peakEnd: 29, hardCliff: 32 }
}

/** Whether the sport/format is typically dynasty-oriented (long-term roster value). */
export function isDynastyRelevant(sport: string): boolean {
  const s = normalizeSportForDynasty(sport)
  return DYNASTY_SPORTS.includes(s)
}
