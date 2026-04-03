# Player images & Rolling Insights

## Headshot priority

1. **Rolling Insights** — `headshot_url` when synced from DataFeeds REST or GraphQL NFL roster (`ROLLING_INSIGHTS_RSC_TOKEN` or `ROLLING_INSIGHTS_API_KEY`, or OAuth client credentials for GraphQL fallback).
2. **ESPN CDN** — `https://a.espncdn.com/i/headshots/{sport}/players/full/{espn_id}.png` using `espn_id` from Sleeper player payloads (`/api/sleeper/players`).
3. **Official league CDNs** — NBA / MLB / NHL when `ri_id` is present on `EnrichedPlayer`.
4. **Sleeper** — `https://sleepercdn.com/content/nfl/players/thumb/{sleeper_id}.jpg` (NFL-focused; other sports may still use this path as a generic fallback in `resolveHeadshot`).
5. **UI fallback** — `PlayerImage` shows a position-colored circle with initials when all URLs fail.

## Env

- `ROLLING_INSIGHTS_RSC_TOKEN` — DataFeeds REST `RSC_token` (preferred for `rest.datafeeds.rolling-insights.com`).
- `ROLLING_INSIGHTS_API_KEY` — Used as token fallback if RSC token is unset.
- Optional: `ROLLING_INSIGHTS_REST_BASE` — override REST host (default `https://rest.datafeeds.rolling-insights.com`).

## API routes

- `POST /api/players/sync?sport=NFL` — Refreshes cached RI map (`revalidateTag('ri-players')`) and returns `{ synced, sport }`.
- `GET /api/players/ri?sport=NFL` — Cached player map: `{ [ri_id]: { name, headshot_url, position, team } }`.

## Rolling Insights response shape (discovered in implementation)

- **REST**: Response parsed flexibly (array, `{ players: [] }`, or object map). Per-player fields accepted include: `id`, `full_name` / `player` / `name`, `headshot_url`, `HeadshotUrl`, `image`, `img`, `photo`, `position`, `team` or nested `team.abbrv`.
- **GraphQL fallback (NFL only)**: Uses `fetchNFLRoster` from `lib/rolling-insights.ts`; headshot is the `img` field on each player; map key is Rolling Insights `id`.
