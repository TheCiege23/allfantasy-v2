/** Deterministic pseudo-projection for rows that don't have a live projection wire yet. */
export function placeholderBaselineProjection(playerId: string): number {
  const n = playerId.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return Math.round(((n % 220) / 10 + 4) * 10) / 10
}
