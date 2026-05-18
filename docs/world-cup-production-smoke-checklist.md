# World Cup Production Smoke Checklist

Use this checklist before opening the 2026 World Cup bracket experience to production users. Do not expose provider keys or cron secrets in screenshots, logs, or shared reports.

## Provider And Data Status

- `WORLD_CUP_DATA_PROVIDER=apifootball`
- `API_FOOTBALL_WORLD_CUP_LEAGUE_ID=1`
- `API_SPORTS_KEY` or `API_FOOTBALL_KEY` is configured server-side.
- `WORLD_CUP_CRON_SECRET` is configured server-side.
- `WORLD_CUP_BEST_THIRD_MAPPING_CONFIRMED=false` until FIFA's best-third Round of 32 mapping is official.

Latest smoke result:

- API-Football returned 48 teams.
- Groups A-L each have 4 teams.
- API-Football returned 72 fixtures.
- All 72 available fixtures are group-stage fixtures.
- Knockout fixtures are not available yet.
- All 72 fixture kickoffs are present.
- Provider venue data may be incomplete; null venues should display as TBD.
- API-Football standings returned 48 pre-tournament rows with 0 played and 0 points.
- Database readiness reports group stage ready, knockout fixtures pending, best-third mapping gated, and overall partial ready.

## Admin Readiness Expectations

The World Cup admin readiness panel should show:

- Provider: API-Football / API-Sports.
- League ID: `1`.
- Data provider configured: yes.
- API key configured: yes.
- Cron secret configured: yes.
- Teams grouped: `48/48`.
- Group-stage fixtures: `72/72`.
- Knockout fixtures: pending.
- Venue coverage: venues may be TBD.
- Kickoff coverage: `72 known / 0 missing`.
- Standings rows: `48/48`.
- Standings state: pre-tournament.
- Best-third mapping: gated until official confirmation.
- Overall status: partial ready.

## Manual UI Smoke

1. Sign in as an admin or all-access user.
2. Create a World Cup pool.
3. Create a bracket entry.
4. Confirm real groups A-L display.
5. Confirm each group contains 4 real teams.
6. Confirm group-stage fixtures display with real teams and kickoff dates.
7. Confirm missing venues render as TBD, not blank.
8. Make group picks.
9. Make knockout picks as far as currently supported.
10. Open Review and confirm saved picks appear.
11. Finalize the entry.
12. Run simulation from the admin/commissioner controls.
13. Confirm pick statuses render as Correct, Wrong, or Pending where appropriate.
14. Confirm leaderboard recalculates and displays.
15. Confirm pool chat loads.
16. Sign in as a normal user and confirm the admin readiness/simulation controls are hidden.
17. Sign back in as admin and confirm the readiness panel is visible.

## Known Non-Blockers

- Knockout fixtures are pending from the provider until FIFA/API-Football publishes them.
- Best-third mapping remains gated while `WORLD_CUP_BEST_THIRD_MAPPING_CONFIRMED=false`.
- Venue data may be incomplete before launch; UI should show TBD for null venues.

## Blockers To Resolve Before Full Launch

- Any group A-L missing teams.
- Fewer than 72 group-stage fixtures.
- Missing kickoff dates for group-stage fixtures.
- Standings unavailable or fewer than 48 rows.
- Admin readiness panel showing group stage not ready.
- Normal users seeing admin readiness or simulation controls.
- Finalize, leaderboard, or chat failing in production.
