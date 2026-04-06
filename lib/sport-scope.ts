/**
 * Single source of truth for supported sports across the app.
 * Use this for sport-aware abstractions, resolvers, templates, and filters.
 *
 * SPORT SCOPE: Always support these sports unless explicitly told otherwise:
 * - NFL, NHL, NBA, MLB, NCAA Basketball (NCAAB), NCAA Football (NCAAF), Soccer
 */
import type { LeagueSport } from '@prisma/client'

/**
 * All supported league sports (values match Prisma `LeagueSport`).
 * Order: major US leagues, then NCAA, then soccer (EURO / UEFA in product UI).
 */
export const SUPPORTED_SPORTS: LeagueSport[] = [
  'NFL',
  'NBA',
  'NHL',
  'MLB',
  'NCAAF',
  'NCAAB',
  'SOCCER',
]

/** Rolling Insights / DataFeeds imports only these league sports (same seven as `SUPPORTED_SPORTS`). */
export const ROLLING_INSIGHTS_LEAGUE_SPORTS = SUPPORTED_SPORTS

/** Default sport when league/context has no sport (first in list; do not hardcode one sport). */
export const DEFAULT_SPORT: LeagueSport = SUPPORTED_SPORTS[0]!

/** Type for supported sport string (aligns with LeagueSport). */
export type SupportedSport = LeagueSport

export function isSupportedSport(s: string | null | undefined): s is LeagueSport {
  if (s == null || typeof s !== 'string') return false
  return (SUPPORTED_SPORTS as readonly string[]).includes(s.toUpperCase())
}

/** Normalize unknown sport to a supported value; use when you must have a fallback. */
export function normalizeToSupportedSport(sport: string | null | undefined): LeagueSport {
  const u = sport?.trim().toUpperCase()
  if (u && (SUPPORTED_SPORTS as readonly string[]).includes(u)) return u as LeagueSport
  return DEFAULT_SPORT
}
