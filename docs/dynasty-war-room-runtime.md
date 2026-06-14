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
- **Engines** (pure): team-direction (contention window, pick-capital aware), roster-needs,
  buy/sell/hold (pick-aware note), trade analyze/find (age-adjusted, picks priced by tier),
  waivers, lineup, pick-value (real future picks).
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

- **Real future pick capital** (`future_draft_picks`, migrated 2026-06-14): the member
  (contender) holds only **late** picks (2027 R3, 2028 R3/R4 → 0 early picks); the
  commissioner (rebuilder) holds **strong, early** capital (own 2027 R1 + 2027 R2 + 2028
  R1 + 2029 R1) **plus the member's traded-away 2027 R1 + R2** (a real traded-pick
  scenario, `traded=true`). Pick seeding is wrapped to skip gracefully (P2021) in any env
  lacking the migration — it never fabricates.
- A **rookie draft window** (`rookie_draft_windows`): 2027, status `pending`, `max_pf` order.

Run directly: `node --import tsx scripts/seed-dynasty-war-room-runtime.ts`.

## E2E — `e2e/dynasty-war-room-runtime.spec.ts` (`@db`, 4 tests, all passing)

1. **Routes enforce auth/privacy/scope (DB-backed)** — 401 unauthenticated; member
   gets a grounded context for THEIR team with `playerValues/playerAges/freeAgentPool`
   **and `futurePicks` available** (`pickValue` feature on, ≥1 rookie window), a classified
   `direction.window='contend'` with `earlyPickCount=0` (weak picks), `projections=missing`;
   every player carries a real age and the member sees their **own real picks**. Other
   teams' players **and picks** are stripped for members (no cross-roster leak). All seven
   action routes return 200 for the member's own roster; targeting another roster is 403;
   `ask` is 402 (no entitlement). Commissioner sees league-wide rosters AND is classified
   `rebuild` with `earlyPickCount>0` (strong picks).
2. **Member UI click-through** — opens the panel, confirms the **pick capital card** renders
   real picks (not provider-limited), clicks Buy/Sell/Hold, Waivers, Lineup, Trade analyzer,
   Trade finder (each verified to call its consolidated route), and confirms the gated `ask`
   shows the upgrade note (402).
3. **Entitled commissioner ask degrades safely** — 200; renders an answer, or the
   "AI temporarily unavailable — grounded facts" note when the model is down.
4. **Mobile dark-mode smoke** — the panel + a primary tool stay rendered/usable on a
   390×844 viewport inside a valid i18n/theme shell.

## Honesty / data states observed at runtime

- `futurePicks` is now **`available`** with real seeded picks; picks are priced by a
  deterministic structural **tier** (round + years out), labeled as such in UI/prompt —
  never a fabricated market value. The three truthful states are exercised by unit tests:
  `available` (rows), `available_empty` (table enabled, no rows), `missing` (table absent
  → `needsProviderIntegration`, no crash).
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
