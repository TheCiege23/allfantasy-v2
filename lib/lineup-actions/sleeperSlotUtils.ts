/** Map Sleeper `roster_positions` to active-starter slot labels (excludes BN/IR/TAXI). */
const NON_STARTER_SLOTS = new Set(
  [
    'BN',
    'BENCH',
    'IR',
    'TAXI',
    'RESERVE',
    'RES',
    'P',
    'OP',
    // some imports use these
    'BE',
  ].map((s) => s.toUpperCase())
)

export function sleeperStarterSlotLabels(rosterPositions: string[]): string[] {
  const out: string[] = []
  for (const raw of rosterPositions) {
    const slot = String(raw ?? '').trim().toUpperCase()
    if (!slot || NON_STARTER_SLOTS.has(slot)) continue
    out.push(slot)
  }
  return out
}

/**
 * Conservative legality check: fixed offensive slots must match player position;
 * FLEX / SUPER_FLEX / IDP flex slots allow their usual positions.
 */
export function isSleeperPlayerLegalInSlot(slot: string, playerPosition: string | null | undefined): boolean {
  const s = slot.toUpperCase()
  const pos = (playerPosition ?? '').toUpperCase()
  if (!pos) return true

  if (s === 'FLEX' || s === 'W/R/T' || s === 'R/W/T' || s === 'W/R') {
    return pos === 'RB' || pos === 'WR' || pos === 'TE'
  }
  if (s === 'SUPER_FLEX' || s === 'SFLX' || s === 'SUPERFLEX') {
    return pos === 'QB' || pos === 'RB' || pos === 'WR' || pos === 'TE'
  }
  if (s === 'QB' || s === 'RB' || s === 'WR' || s === 'TE' || s === 'K') {
    return pos === s
  }
  if (s === 'DEF' || s === 'DST') {
    return pos === 'DEF' || pos === 'DST'
  }
  const idp = new Set(['DL', 'DE', 'DT', 'LB', 'DB', 'CB', 'S', 'IDP', 'DP'])
  if (idp.has(s) && idp.has(pos)) return true

  // Unknown slot naming — do not flag
  return true
}
