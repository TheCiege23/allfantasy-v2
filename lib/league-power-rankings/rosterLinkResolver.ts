/**
 * Canonical link to league roster tab (Prompt 132 — team row opens roster page).
 */

/** Base path for app league pages. */
const APP_LEAGUE_BASE = '/app/league';

/**
 * Href for the league's Roster tab. Use for "view roster" from power rankings.
 * Optionally pass rosterId if the app later supports viewing a specific team's roster.
 */
export function getLeagueRosterTabHref(leagueId: string, _rosterId?: number): string {
  const q = new URLSearchParams({ tab: 'Roster' });
  if (_rosterId != null) q.set('rosterId', String(_rosterId));
  return `${APP_LEAGUE_BASE}/${encodeURIComponent(leagueId)}?${q.toString()}`;
}
