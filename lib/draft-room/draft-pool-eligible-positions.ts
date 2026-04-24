/**
 * Helpers for filtering draft pool rows against starter-eligible positions
 * (`getDraftEligiblePositionsFromPayload` / `starterEligiblePlayerPositionsFromTemplate`), not the full bench/IR union.
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

/**
 * Draft queue / autopick: preserve order; drop entries whose position is not starter-eligible.
 * When `draftEligiblePositions` is null, undefined, or empty, returns a copy of `entries` (no gate).
 */
export function filterEntriesByDraftEligiblePositions<T extends { position?: string | null }>(
  entries: readonly T[],
  draftEligiblePositions: Set<string> | null | undefined,
): T[] {
  if (!draftEligiblePositions?.size) return [...entries]
  return entries.filter((e) => draftPoolRowMatchesEligiblePositions(e.position, draftEligiblePositions))
}
