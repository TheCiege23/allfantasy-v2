/**
 * Reads commissioner Schedule panel JSON (`settings.scheduleSettings`) and merges with
 * legacy top-level `regular_season_length` for schedule/matchup resolvers.
 */

const MIN_WEEKS = 1
const MAX_WEEKS = 24

function clampWeeks(n: number): number {
  if (!Number.isFinite(n)) return MIN_WEEKS
  return Math.min(MAX_WEEKS, Math.max(MIN_WEEKS, Math.floor(n)))
}

export function resolveRegularSeasonLengthWeeks(
  settings: Record<string, unknown> | null | undefined,
  fallback: number,
): number {
  const root = settings ?? {}
  const slice = root.scheduleSettings
  if (slice && typeof slice === 'object' && slice !== null && !Array.isArray(slice)) {
    const w = (slice as Record<string, unknown>).regularSeasonWeeks
    if (typeof w === 'number' && Number.isFinite(w)) {
      return clampWeeks(w)
    }
  }
  const top = root.regular_season_length
  if (typeof top === 'number' && Number.isFinite(top)) {
    return clampWeeks(top)
  }
  return clampWeeks(fallback)
}
