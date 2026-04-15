/**
 * Draft brain sport coverage: Prisma-backed leagues + extended fantasy verticals.
 * Use `normalizeDraftBrainSport` for scoring adapters; do not assume NFL-only.
 */

import { SUPPORTED_SPORTS, type SupportedSport, normalizeToSupportedSport } from '@/lib/sport-scope'

/** Sports with first-class league data in AllFantasy (Prisma LeagueSport). */
export const DRAFT_BRAIN_LEAGUE_SPORTS = SUPPORTED_SPORTS

/** Additional draft-room verticals (best ball, tournament, specialty). */
export const DRAFT_BRAIN_EXTENDED_SPORTS = ['GOLF', 'NASCAR'] as const

export type DraftBrainExtendedSport = (typeof DRAFT_BRAIN_EXTENDED_SPORTS)[number]

export type DraftBrainSportId = SupportedSport | DraftBrainExtendedSport | (string & {})

export function isExtendedDraftSport(s: string): s is DraftBrainExtendedSport {
  return (DRAFT_BRAIN_EXTENDED_SPORTS as readonly string[]).includes(s.toUpperCase())
}

/** Map unknown strings to a supported league sport when possible; else preserve extended id. */
export function normalizeDraftBrainSport(raw: string | null | undefined): DraftBrainSportId {
  const u = raw?.trim()
  if (!u) return normalizeToSupportedSport(null)
  const up = u.toUpperCase()
  if ((DRAFT_BRAIN_EXTENDED_SPORTS as readonly string[]).includes(up)) return up as DraftBrainExtendedSport
  return normalizeToSupportedSport(u)
}
