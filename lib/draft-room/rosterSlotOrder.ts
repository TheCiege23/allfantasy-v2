/**
 * D.6 — canonical roster-slot ordering for the Results / Roster panel.
 *
 * Default offensive order (per user spec):
 *   QB | RB | RB | WR | WR | TE | FLEX | SF | DEF | K
 *
 * IDP-enabled order (per user spec):
 *   QB | RB | RB | WR | WR | TE | FLEX | SF | DL | LB | DB | IDP FLEX | DEF | K
 *
 * Pure module — no React, no Prisma. The Results panel feeds it the league's
 * actual `starterSlots` map (`{ QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, SF: 0, K: 1, DEF: 1, ... }`)
 * and the helper expands it into an ORDERED list of slot labels with
 * occurrence indices so the UI can render `RB1, RB2, FLEX, SF, DEF, K, BN1, BN2, …`.
 *
 * If a league has zero of a given position, it is omitted from the result —
 * we never force SF / IDP / K when the league setting is 0.
 *
 * If a commissioner has custom slots not in the canonical map, they're appended
 * after the canonical block in alphabetical order (preserving exotic configs).
 */

/** Position keys we know how to order. Anything outside this set is "custom". */
const CANONICAL_OFFENSE_ORDER = ['QB', 'RB', 'WR', 'TE', 'FLEX', 'SF'] as const
const CANONICAL_IDP_ORDER = ['DL', 'LB', 'DB', 'IDP FLEX'] as const
const CANONICAL_TAIL_ORDER = ['DEF', 'K'] as const

const CANONICAL_KEYS = new Set<string>([
  ...CANONICAL_OFFENSE_ORDER,
  ...CANONICAL_IDP_ORDER,
  ...CANONICAL_TAIL_ORDER,
  'BN', // bench is always last
])

export interface RosterSlotEntry {
  /** "QB" | "RB" | "WR" | "TE" | "FLEX" | "SF" | "DL" | "LB" | "DB" | "IDP FLEX" | "DEF" | "K" | "BN" | <custom> */
  position: string
  /** 1-based occurrence index when count > 1 (RB1, RB2). 1 when count == 1. */
  occurrence: number
  /** Display label — "QB", "RB1", "FLEX", "BN3". */
  label: string
  /** "starter" | "bench" | "custom" — drives the panel's grouping. */
  kind: 'starter' | 'bench' | 'custom'
}

export interface RosterSlotOrderInput {
  /** Map of position → count (e.g. `{ QB: 1, RB: 2, WR: 2, FLEX: 1, K: 1, DEF: 1 }`). */
  starterSlots: Record<string, number> | null | undefined
  /** Bench size (0 omits the BN block). */
  benchSlots?: number | null
  /** When true, IDP positions land between SF and DEF/K. */
  idpEnabled?: boolean
}

/**
 * Expand the league's slot config into the canonical ordered list. Numbered
 * occurrences (RB1, RB2) when count > 1; bare label when count == 1.
 *
 * Zero-count positions are dropped — we never force a slot the league doesn't have.
 */
export function buildOrderedRosterSlots(input: RosterSlotOrderInput): RosterSlotEntry[] {
  const slots = (input.starterSlots ?? {}) as Record<string, number>
  const out: RosterSlotEntry[] = []

  const expandPosition = (position: string, kind: 'starter' | 'custom') => {
    const count = Math.max(0, Math.floor(Number(slots[position] ?? 0)))
    for (let i = 1; i <= count; i++) {
      out.push({
        position,
        occurrence: i,
        label: count > 1 ? `${position}${i}` : position,
        kind,
      })
    }
  }

  // Canonical offense block (QB, RB, WR, TE, FLEX, SF).
  for (const pos of CANONICAL_OFFENSE_ORDER) expandPosition(pos, 'starter')

  // IDP block — only when explicitly enabled. Even if the league's `starterSlots`
  // happens to contain DL/LB/DB counts, we keep the canonical insertion point
  // gated on the flag so a non-IDP league isn't surprised.
  if (input.idpEnabled) {
    for (const pos of CANONICAL_IDP_ORDER) expandPosition(pos, 'starter')
  }

  // Tail (DEF, K) — always after IDP.
  for (const pos of CANONICAL_TAIL_ORDER) expandPosition(pos, 'starter')

  // Custom commissioner slots — anything in `starterSlots` that isn't canonical
  // gets appended in alphabetical order so exotic configs stay deterministic.
  const customPositions = Object.keys(slots)
    .filter((k) => !CANONICAL_KEYS.has(k.toUpperCase()) && (slots[k] ?? 0) > 0)
    .sort((a, b) => a.localeCompare(b))
  for (const pos of customPositions) expandPosition(pos, 'custom')

  // Bench — always last. Numbered when count > 1.
  const benchCount = Math.max(0, Math.floor(Number(input.benchSlots ?? 0)))
  for (let i = 1; i <= benchCount; i++) {
    out.push({
      position: 'BN',
      occurrence: i,
      label: benchCount > 1 ? `BN${i}` : 'BN',
      kind: 'bench',
    })
  }

  return out
}

/**
 * Match a drafted pick to its slot. First fills exact-position starters in order,
 * then FLEX (RB/WR/TE), then SF (QB/RB/WR/TE), then bench. Used by the Results
 * panel to render `Bijan Robinson` next to the right slot label.
 *
 * Picks are placed in the order received — caller is responsible for sorting
 * (typically by overall pick).
 */
export function assignPicksToSlots<P extends { position: string; playerName?: string }>(
  picks: readonly P[],
  slotOrder: readonly RosterSlotEntry[],
): Array<{ slot: RosterSlotEntry; pick: P | null }> {
  const result: Array<{ slot: RosterSlotEntry; pick: P | null }> = slotOrder.map((slot) => ({
    slot,
    pick: null,
  }))

  const isStillEmpty = (idx: number) => result[idx]!.pick == null

  const tryPlace = (pick: P, predicate: (slot: RosterSlotEntry) => boolean) => {
    for (let i = 0; i < result.length; i++) {
      if (!isStillEmpty(i)) continue
      if (predicate(result[i]!.slot)) {
        result[i] = { slot: result[i]!.slot, pick }
        return true
      }
    }
    return false
  }

  for (const pick of picks) {
    const pos = String(pick.position ?? '').toUpperCase()

    // 1. Exact match on the same position name.
    if (tryPlace(pick, (s) => s.position === pos)) continue

    // 2. FLEX accepts RB/WR/TE.
    if ((pos === 'RB' || pos === 'WR' || pos === 'TE') && tryPlace(pick, (s) => s.position === 'FLEX')) continue

    // 3. SF (Superflex) accepts QB/RB/WR/TE.
    if (
      (pos === 'QB' || pos === 'RB' || pos === 'WR' || pos === 'TE') &&
      tryPlace(pick, (s) => s.position === 'SF')
    )
      continue

    // 4. IDP FLEX accepts DL/LB/DB.
    if ((pos === 'DL' || pos === 'LB' || pos === 'DB') && tryPlace(pick, (s) => s.position === 'IDP FLEX')) continue

    // 5. Fallback: bench.
    tryPlace(pick, (s) => s.kind === 'bench')
    // If even bench is full, the pick is dropped from this view (taxi/IR isn't surfaced here).
  }

  return result
}
