/**
 * Injury/inactive-only triggers for Auto-Sub Lineup Engine (not best ball).
 * Does NOT fire for Questionable, Probable, Limited, GTD, or Doubtful unless `willNotPlayConfirmed`.
 */

function normalizeStatus(raw?: string | null): string {
  return String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isExplicitlyBlocked(s: string): boolean {
  if (!s) return true
  if (s.includes('QUESTIONABLE') || (s.length === 1 && s === 'Q')) return true
  if (s.includes('PROBABLE') || (s.length === 1 && s === 'P')) return true
  if (s.includes('LIMITED')) return true
  if (s.includes('GAME TIME') || s.includes('GAMEDAY')) return true
  if (s.includes('GTD')) return true
  if (s.includes('DOUBTFUL')) return true
  return false
}

/**
 * Product-facing eligible triggers.
 * Out, IR, Injured Reserve, Suspended, Inactive, Ruled Out, Scratched,
 * Did Not Travel, Not In Squad, Not Active.
 */
export function isAutoSubEligibleTrigger(
  status: string | undefined,
  signals?: { willNotPlayConfirmed?: boolean }
): boolean {
  if (signals?.willNotPlayConfirmed) return true
  const s = normalizeStatus(status)
  if (!s) return false
  if (isExplicitlyBlocked(s)) return false

  if (s === 'OUT' || s.endsWith(' OUT') || s.startsWith('OUT ') || s.includes('RULED OUT')) return true
  if (s === 'IR' || s.includes('INJURED RESERVE')) return true
  if (s.includes('SUSPENDED')) return true
  if (s === 'INACTIVE' || s.includes('NOT ACTIVE')) return true
  if (s.includes('SCRATCH')) return true
  if (s.includes('DID NOT TRAVEL')) return true
  if (s.includes('NOT IN SQUAD') || s.includes('NOTINSQUAD')) return true

  return false
}
