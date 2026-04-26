/**
 * D.7 — pure predicate for the "Rookies Only" draft pool filter.
 *
 * Lives in `lib/draft-room/` rather than the PlayerPanel component so tests
 * (and any future server-side filter, e.g. autopick rookie targeting) can
 * import it without pulling React + the heavy PlayerPanel render tree
 * through Vitest's transformer.
 *
 * Rules:
 *  - NFL redraft/dynasty: include when `isRookie === true` OR `yearsExp === 0`.
 *  - Devy/C2C: also include `isDevy` rows and college class-year labels.
 *  - Otherwise (plain redraft when neither devy nor c2c is enabled, or pool
 *    rows missing rookie metadata): exclude.
 */

export type RookieFilterCandidate = {
  isRookie?: boolean
  yearsExp?: number | null
  isDevy?: boolean
  classYearLabel?: string | null
}

export type RookieFilterContext = {
  devyEnabled?: boolean
  c2cEnabled?: boolean
}

export function isRookieEligibleForFilter(
  player: RookieFilterCandidate,
  options: RookieFilterContext = {},
): boolean {
  if (player.isRookie === true) return true
  if (player.yearsExp === 0) return true
  if (options.devyEnabled || options.c2cEnabled) {
    if (player.isDevy) return true
    const yr = String(player.classYearLabel ?? '').toLowerCase()
    if (
      yr.includes('rookie') ||
      yr.includes('fr') ||
      yr.includes('so') ||
      yr.includes('jr') ||
      yr.includes('sr')
    ) {
      return true
    }
  }
  return false
}
