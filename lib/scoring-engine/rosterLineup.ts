/**
 * Resolve starter vs bench from roster JSON for weekly scoring (starters count toward team total).
 */

export type RosterPlayerEntry = { id: string; slot?: string | null; position?: string | null }

const BENCH_SLOTS = new Set(['BN', 'BENCH', 'BE', 'IR', 'TAXI', 'TAXI_SQUAD', 'RES', 'NA', 'PUP', 'SUSP'])

function normalizeEntries(playerData: unknown): RosterPlayerEntry[] {
  if (playerData == null) return []
  if (Array.isArray(playerData)) {
    return (playerData as unknown[]).map((p) => {
      if (typeof p === 'string') return { id: p, slot: null }
      const o = p as Record<string, unknown>
      const id = String(o.id ?? o.player_id ?? o.playerId ?? '')
      return { id, slot: typeof o.slot === 'string' ? o.slot : typeof o.rosterSlot === 'string' ? o.rosterSlot : null, position: typeof o.position === 'string' ? o.position : typeof o.pos === 'string' ? o.pos : null }
    }).filter((e) => e.id.length > 0)
  }
  const players = (playerData as Record<string, unknown>)?.players
  if (Array.isArray(players)) return normalizeEntries(players)
  return []
}

function isBenchSlot(slot: string | null | undefined): boolean {
  if (!slot) return false
  const u = String(slot).toUpperCase().trim()
  if (BENCH_SLOTS.has(u)) return true
  if (u.startsWith('BENCH')) return true
  return false
}

/**
 * Returns player IDs that count toward the weekly score (starters + flex in non-bench slots).
 * If no slot metadata exists, all rostered players are treated as starters (legacy flat lists).
 */
export function getStarterPlayerIdsForScoring(playerData: unknown): string[] {
  const entries = normalizeEntries(playerData)
  if (entries.length === 0) return []

  const anySlot = entries.some((e) => e.slot != null && String(e.slot).length > 0)
  if (!anySlot) {
    return entries.map((e) => e.id)
  }

  return entries.filter((e) => !isBenchSlot(e.slot)).map((e) => e.id)
}

/** Bench / IR / taxi — used for matchup tiebreakers and audits. */
export function getBenchPlayerIdsForScoring(playerData: unknown): string[] {
  const entries = normalizeEntries(playerData)
  if (entries.length === 0) return []
  const anySlot = entries.some((e) => e.slot != null && String(e.slot).length > 0)
  if (!anySlot) return []
  return entries.filter((e) => isBenchSlot(e.slot)).map((e) => e.id)
}

/**
 * Deterministic duplicate handling: first occurrence wins; later dupes should score 0.
 * Returns sorted list of player ids that appear more than once.
 */
export function findDuplicatePlayerIds(allIds: string[]): string[] {
  const seen = new Set<string>()
  const dupes = new Set<string>()
  for (const id of allIds) {
    if (seen.has(id)) dupes.add(id)
    seen.add(id)
  }
  return [...dupes].sort((a, b) => a.localeCompare(b))
}
