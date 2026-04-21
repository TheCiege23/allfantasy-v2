/**
 * Season year shown in My Leagues / dashboard rail.
 *
 * `League.season` is the canonical row year but can lag behind a renewed redraft year
 * or Sleeper history rows. We take the max of known signals so a renewed league shows
 * the current season year; a league that was not renewed keeps the last year present
 * in data (no automatic bump to the calendar year).
 */
export function resolveLeagueListSeasonYear(input: {
  leagueSeason?: number | null
  maxRedraftSeason?: number | null
  maxLeagueHistorySeason?: number | null
}): number {
  const candidates: number[] = []
  for (const n of [
    input.leagueSeason,
    input.maxRedraftSeason,
    input.maxLeagueHistorySeason,
  ]) {
    if (typeof n === 'number' && Number.isFinite(n) && n > 0) {
      candidates.push(n)
    }
  }
  if (candidates.length === 0) {
    return new Date().getFullYear()
  }
  return Math.max(...candidates)
}
