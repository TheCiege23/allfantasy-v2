/**
 * Env / query helpers for the Create League flow (same UI as `/create-league`).
 *
 * Canonical route: **`/create-league`**. The old `/create-league/v2` path
 * permanently redirects there with query strings preserved.
 *
 * These toggles are still useful for experiments or client-side nudges:
 *   - `NEXT_PUBLIC_CREATE_LEAGUE_V2=1`
 *   - `CREATE_LEAGUE_V2=1`
 *   - `?v2=1` on the URL
 */

export const CREATE_LEAGUE_V2_FLAG_NAME = 'create_league_v2'

export function isCreateLeagueV2EnabledFromEnv(): boolean {
  // NEXT_PUBLIC_* is inlined at build time and works on client+server.
  if (process.env.NEXT_PUBLIC_CREATE_LEAGUE_V2 === '1') return true
  if (process.env.CREATE_LEAGUE_V2 === '1') return true
  return false
}

/**
 * Server-side check — honor both env and a `?v2=1` query override so
 * reviewers can preview the flow on any branch without a redeploy.
 */
export function isCreateLeagueV2EnabledForRequest(
  searchParams: Record<string, string | string[] | undefined> | null | undefined,
): boolean {
  if (isCreateLeagueV2EnabledFromEnv()) return true
  const raw = searchParams?.v2
  const value = Array.isArray(raw) ? raw[0] : raw
  return value === '1' || value === 'true'
}
