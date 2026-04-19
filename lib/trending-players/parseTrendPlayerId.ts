/** Client-safe id parsing for trending / roster matching (`SPORT:id` vs plain id). */

function normId(raw: string): string {
  return String(raw).trim()
}

/** Extract platform id segment from `SPORT:id` or return full string. */
export function parseTrendPlayerId(playerId: string): { sportHint: string | null; platformId: string } {
  const s = normId(playerId)
  const idx = s.indexOf(':')
  if (idx > 0) {
    return { sportHint: s.slice(0, idx).toUpperCase(), platformId: s.slice(idx + 1) }
  }
  return { sportHint: null, platformId: s }
}
