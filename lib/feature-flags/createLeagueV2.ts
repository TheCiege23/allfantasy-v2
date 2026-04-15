/**
 * Feature flag for the premium Create League v2 flow.
 *
 * Enabled when any of the following is true:
 *   - `NEXT_PUBLIC_CREATE_LEAGUE_V2=1` (global rollout, visible to client)
 *   - `CREATE_LEAGUE_V2=1` (server-only toggle, useful for smoke tests)
 *   - URL has `?v2=1` (per-request override, for internal preview)
 *
 * Keep the check cheap — it runs on every request to `/create-league/v2`
 * and inside any component that wants to show a "Try the new flow" nudge.
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
