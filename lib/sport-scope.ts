/**
 * Single source of truth for supported sports across the app.
 * Use this for sport-aware abstractions, resolvers, templates, and filters.
 *
 * SPORT SCOPE: Always support these sports unless explicitly told otherwise:
 * - NFL, NHL, NBA, MLB, NCAA Basketball (NCAAB), NCAA Football (NCAAF), Soccer
 */
import type { LeagueSport } from '@prisma/client'

/** All supported league sports (order matches common display; values match Prisma LeagueSport). */
export const SUPPORTED_SPORTS: LeagueSport[] = [
  'NFL',
  'NHL',
  'NBA',
  'MLB',
  'NCAAF',
  'NCAAB',
  'SOCCER',
]

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
