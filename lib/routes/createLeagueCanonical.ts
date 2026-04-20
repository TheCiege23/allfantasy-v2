/**
 * Single canonical Create League route for the Sports app.
 * Legacy paths (`/create-league/v2`, `/leagues/create`) redirect here with query preserved.
 */
export const CREATE_LEAGUE_CANONICAL_PATH = '/create-league' as const

export function buildCreateLeagueCanonicalHref(
  sp: Record<string, string | string[] | undefined>,
): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(sp)) {
    if (value === undefined) continue
    if (Array.isArray(value)) {
      for (const v of value) params.append(key, v)
    } else {
      params.append(key, value)
    }
  }
  const s = params.toString()
  return s ? `${CREATE_LEAGUE_CANONICAL_PATH}?${s}` : CREATE_LEAGUE_CANONICAL_PATH
}
