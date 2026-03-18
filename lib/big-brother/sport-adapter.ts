/**
 * [NEW] lib/big-brother/sport-adapter.ts
 * Multi-sport support for Big Brother: challenge themes, roster/scoring remain sport-aware.
 * Elimination, nomination, voting, jury logic stay sport-agnostic.
 * PROMPT 5.
 */

import { SUPPORTED_SPORTS, normalizeToSupportedSport } from '@/lib/sport-scope'
import type { LeagueSport } from '@prisma/client'

/** Human-readable sport label for AI challenge themes and UI. */
const SPORT_LABELS: Record<string, string> = {
  NFL: 'NFL football',
  NHL: 'NHL hockey',
  NBA: 'NBA basketball',
  MLB: 'MLB baseball',
  NCAAF: 'college football',
  NCAAB: 'college basketball',
  SOCCER: 'soccer',
}

export function getChallengeThemeSportLabel(sport: string | null | undefined): string {
  const s = normalizeToSupportedSport(sport)
  return SPORT_LABELS[s] ?? s
}

/** Sport-specific HOH challenge theme hints for AI generator (no outcome logic). */
export function getHOHChallengeThemeHints(sport: string | null | undefined): string[] {
  const s = normalizeToSupportedSport(sport)
  const hints: Record<string, string[]> = {
    NFL: ['touchdowns', 'yards', 'QB rating', 'fantasy points', 'game day'],
    NHL: ['goals', 'assists', 'plus/minus', 'saves', 'power play'],
    NBA: ['points', 'rebounds', 'assists', 'three-pointers', 'double-double'],
    MLB: ['home runs', 'RBIs', 'strikeouts', 'batting average', 'innings'],
    NCAAF: ['rushing yards', 'passing TDs', 'college rivalry', 'bowl season'],
    NCAAB: ['March Madness', 'bracket', 'Cinderella', 'conference', 'three-pointer'],
    SOCCER: ['goals', 'assists', 'clean sheet', 'fantasy points', 'matchday'],
  }
  return hints[s] ?? ['fantasy points', 'weekly performance']
}

/** Sport-specific Veto challenge theme hints. */
export function getVetoChallengeThemeHints(sport: string | null | undefined): string[] {
  const s = normalizeToSupportedSport(sport)
  const hints: Record<string, string[]> = {
    NFL: ['clutch performance', 'bench stars', 'waiver wire', 'lineup lock'],
    NHL: ['backup goalie', 'OT hero', 'plus/minus battle'],
    NBA: ['sixth man', 'blocks and steals', 'free throws'],
    MLB: ['closer', 'pinch hit', 'defensive gems'],
    NCAAF: ['special teams', 'fourth quarter', 'rivalry week'],
    NCAAB: ['bubble', 'seed', 'upset'],
    SOCCER: ['substitute impact', 'set piece', 'clean sheet'],
  }
  return hints[s] ?? ['power to save', 'strategy', 'tension']
}

/** Supported sports for Big Brother (all app-supported). */
export function getBigBrotherSupportedSports(): LeagueSport[] {
  return [...SUPPORTED_SPORTS]
}
