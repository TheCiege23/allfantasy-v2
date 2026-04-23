/**
 * Helpers for filtering draft pool rows against a resolved set of allowed positions
 * (see `getEffectiveLeagueRosterTemplate` → `allowedPositions`).
 */

import { normalizePositionToken } from '@/lib/auto-sub-lineup-engine/normalize-position'

export function rosterFingerprintFromEligible(eligible: Set<string> | null): string {
  if (!eligible) return 'all'
  return [...eligible].sort().join('|')
}

/** Normalize incoming player positions (PK→K; DEF/ST→DST) before comparing with eligible set. */
export function normalizedPlayerPositionForDraftFilter(raw: string | undefined | null): string {
  const compact = normalizePositionToken(String(raw ?? '').trim()).toUpperCase()
  if (!compact) return ''
  return compact === 'DEF' || compact === 'D/ST' ? 'DST' : compact === 'GK' ? 'GKP' : compact
}

export function draftPoolRowMatchesEligiblePositions(
  playerPositionRaw: string | undefined | null,
  eligible: Set<string> | null,
): boolean {
  if (!eligible?.size) return true
  const norm = normalizedPlayerPositionForDraftFilter(playerPositionRaw)
  if (!norm) return false
  if (eligible.has(norm)) return true
  if (norm === 'DST' && eligible.has('DEF')) return true
  return false
}
