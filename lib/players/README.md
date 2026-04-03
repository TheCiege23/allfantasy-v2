# Player images & Rolling Insights

## Headshot priority

1. **Rolling Insights** — `headshot_url` from DataFeeds GraphQL roster (`img` → `RIPlayer.headshot_url`), merged into `EnrichedPlayer` via `buildEnrichedPlayer` / `PlayerImage` props.
2. **ESPN CDN** — `https://a.espncdn.com/i/headshots/{sport}/players/full/{espn_id}.png` using `espn_id` from Sleeper player payloads (`/api/sleeper/players`).
3. **Official league CDNs** — NBA / MLB / NHL when `ri_id` is present on `EnrichedPlayer`.
4. **Sleeper** — `https://sleepercdn.com/content/nfl/players/thumb/{sleeper_id}.jpg` (NFL-focused; other sports may still use this path as a generic fallback in `resolveHeadshot`).
5. **UI fallback** — `PlayerImage` shows a position-colored circle with initials when all URLs fail.

## Env

- `ROLLING_INSIGHTS_CLIENT_ID` / `ROLLING_INSIGHTS_CLIENT_SECRET` — OAuth client credentials, **set 1 (NFL)**.
- `ROLLING_INSIGHTS_CLIENT_ID2` / `ROLLING_INSIGHTS_CLIENT_SECRET2` — **set 2** (NBA, MLB, NHL, Soccer, NCAABB, NCAAFB).

Optional legacy vars (`ROLLING_INSIGHTS_API_KEY`, `ROLLING_INSIGHTS_RSC_TOKEN`) are not used by the GraphQL player sync.

## API routes

- `POST /api/players/sync?sport=NFL` — Fetches RI players + teams, `revalidateTag('ri-players-{sport}')`, returns counts, samples, and image field checks.
- `GET /api/players/ri?sport=NFL` — Cached RI player list: `{ players: RIPlayer[], total, sport, cached: true }`.

## Rolling Insights shape (GraphQL)

- Roster: `nflRoster(season: "YYYY-YYYY") { id player position img status team { id team abbrv mascot img } }` (sport-specific prefix: `nba`, `mlb`, etc.).
- Teams: `nflTeams { id team abbrv mascot img }`.

## Team logos

- **Client / static fallbacks**: `getTeamLogoUrl` / `getTeamLogoCandidates` in `teamLogos.ts`.
- **RI logos (server-only)**: `getRITeamLogoUrl` in `ri-team-logos-server.ts`.
