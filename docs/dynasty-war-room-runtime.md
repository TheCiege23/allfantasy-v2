# Dynasty AF War Room — Runtime Verification

_DB-backed runtime QA for the native Dynasty War Room. Mirrors the redraft runtime
doc. Verified 2026-06-13 against live Neon + the dev server via Playwright (`@db`)._

## What the runtime proves

The Dynasty War Room is grounded in the league's OWN data (no fabrication). The seed
+ E2E exercise the full stack end-to-end:

- **Context builder** (`lib/dynasty-war-room/dynastyWarRoomContext.ts`) — the only
  DB-touching file. Assembles rosters from legacy `Roster.playerData.lineup_sections`
  + `LeagueTeam` standings, dynasty values from `AllFantasyAdpSnapshot`
  (`leagueType='dynasty'`), ages from `SportsPlayer.age`, injuries/news from the
  provider tables. Sets honest availability flags.
- **Engines** (pure): team-direction (contention window), roster-needs, buy/sell/hold,
  trade analyze/find (age-adjusted), waivers, lineup, pick-value (provider-limited).
- **Routes**: `GET /api/leagues/[leagueId]/dynasty-war-room` + consolidated
  `POST .../[action]` (team-direction, buy-sell-hold, waivers, lineup, trade-analyze,
  trade-find, ask). Two files — no route bloat.
- **Global Chimmy grounding**: `buildDynastyWarRoomContextForChimmy` injected into
  `app/api/chat/chimmy/route.ts` for dynasty leagues only.
- **Frontend**: `DynastyWarRoomPanel` mounted in `WarRoomTab` for `isDynasty` leagues.

## Seed

`scripts/seed-dynasty-war-room-runtime.ts` (idempotent, fixed ids) creates an NFL
superflex dynasty league with:

- A **member** (contender: 8-2, mostly prime/ascending, one aging RB) and a
  **commissioner** (rebuilder: 3-7, aging vets + young WRs) — two legacy `Roster`
  rows with `lineup_sections` (starters/bench/taxi/ir) + `LeagueTeam` standings.
- `SportsPlayer` rows with **ages** for every player (drives age-trajectory).
- `AllFantasyAdpSnapshot` dynasty rows for rostered players **and** extra non-rostered
  players (drives values + a real free-agent pool).
- The commissioner holds the **AF War Room** entitlement (so `ask` returns 200; the
  member lacks it and gets 402).

`FutureDraftPick`/`RookieDraftWindow` are intentionally NOT seeded — they are not
migrated in this environment, so the runtime asserts pick capital is honestly
provider-limited rather than fabricated.

Run directly: `node --import tsx scripts/seed-dynasty-war-room-runtime.ts`.

## E2E — `e2e/dynasty-war-room-runtime.spec.ts` (`@db`, 4 tests, all passing)

1. **Routes enforce auth/privacy/scope (DB-backed)** — 401 unauthenticated; member
   gets a grounded context for THEIR team with `playerValues/playerAges/freeAgentPool`
   available, `futurePicks=missing`, `projections=missing`, and a classified
   `direction.window='contend'`; every player carries a real age. Other teams' players
   **and picks** are stripped for members (no cross-roster leak). All seven action
   routes return 200 for the member's own roster; targeting another roster is 403;
   `ask` is 402 (no entitlement). Commissioner sees league-wide rosters.
2. **Member UI click-through** — opens the panel, clicks Buy/Sell/Hold, Waivers,
   Lineup, Trade analyzer, Trade finder (each verified to call its consolidated route),
   and confirms the gated `ask` shows the upgrade note (402).
3. **Entitled commissioner ask degrades safely** — 200; renders an answer, or the
   "AI temporarily unavailable — grounded facts" note when the model is down.
4. **Mobile dark-mode smoke** — the panel + a primary tool stay rendered/usable on a
   390×844 viewport inside a valid i18n/theme shell.

## Honesty / provider-limited states observed at runtime

- `futurePicks=missing` → `pickValue` feature off; missing-data flag surfaced; the
  pick-value engine returns `needsProviderIntegration` and never invents pick values.
- `projections=missing` → dynasty lineup is explicitly **low confidence** (ranked by
  long-term value/ADP, not weekly projections) and says so.
- When dynasty ADP/ages are absent for a sport/season, value-based features degrade to
  age/roster fit and the context records the gap instead of guessing.

## How to run locally

```
# 1) seed (uses .env.local DATABASE_URL)
node --import tsx scripts/seed-dynasty-war-room-runtime.ts

# 2) E2E (Playwright auto-starts the dev server; needs DATABASE_URL + NEXTAUTH_SECRET)
npx playwright test e2e/dynasty-war-room-runtime.spec.ts --project=chromium
```
