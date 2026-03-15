/**
 * SportDramaResolver — sport-aware normalization for the League Drama Engine.
 */

import type { DramaSport } from './types'
import { DRAMA_SPORTS } from './types'

const MAP: Record<string, DramaSport> = {
  NFL: 'NFL',
  NHL: 'NHL',
  NBA: 'NBA',
  MLB: 'MLB',
  NCAAB: 'NCAAB',
  'NCAA BASKETBALL': 'NCAAB',
  NCAAF: 'NCAAF',
  'NCAA FOOTBALL': 'NCAAF',
  SOCCER: 'SOCCER',
}

export function normalizeSportForDrama(sport: string | null | undefined): DramaSport | null {
  const u = (sport ?? '').toString().trim().toUpperCase()
  if (!u) return null
  return MAP[u] ?? null
}

export function getDramaSportLabel(sport: string | null | undefined): string {
  const s = normalizeSportForDrama(sport)
  if (!s) return 'Unknown'
  const labels: Record<DramaSport, string> = {
    NFL: 'NFL',
    NHL: 'NHL',
    NBA: 'NBA',
    MLB: 'MLB',
    NCAAB: 'NCAA Basketball',
    NCAAF: 'NCAA Football',
    SOCCER: 'Soccer',
  }
  return labels[s]
}

export function isSupportedDramaSport(sport: string | null | undefined): boolean {
  return normalizeSportForDrama(sport) != null
}

export { DRAMA_SPORTS }
