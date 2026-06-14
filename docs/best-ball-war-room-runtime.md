# Best Ball AF War Room — Runtime Verification

_DB-backed runtime QA for the native Best Ball War Room. Mirrors the redraft/dynasty/keeper
runtime docs. Verified 2026-06-14 against live Neon + the dev server via Playwright (`@db`)._

## What the runtime proves

The Best Ball War Room is grounded in the league's OWN data (no fabrication). Best ball is
DRAFT-ONLY with an AUTOMATIC optimal lineup — there is NO manual start/sit anywhere.

- **Context builder** (`lib/best-ball-war-room/bestBallWarRoomContext.ts`) — the only
  DB-touching file. Roster from legacy `Roster.playerData` (draft-only), best-ball profile
  (`getBestBallSportProfile` → auto-lineup slots + recommended sizes) + `normalizeBestBallSettings`,
  redraft ADP for value, real `weeklyScore` for spike-week ceiling, `SportsPlayer` for
  position/team enrichment (team → stack correlation), injuries/news. Sets honest flags.
- **Engines** (pure): roster-construction, depth (fragility), upside (spike-week ceiling),
  draft-plan, stack/correlation (same-team), risk, waiver (only if enabled), trade (only if
  enabled). NO start/sit engine.
- **Routes**: `GET /api/leagues/[leagueId]/best-ball-war-room` + consolidated
  `POST .../[action]` (roster-construction, depth, upside, draft-plan, stacks, risk, waivers,
  trade-analyze, trade-find, ask). Two files — no route bloat (budget GREEN 1684). There is
  NO `lineup`/`start-sit` action — it 404s by design.
- **Global Chimmy grounding**: `buildBestBallContextForChimmy` injected into
  `app/api/chat/chimmy/route.ts` for best-ball leagues only (redraft/dynasty/keeper unaffected).
- **Frontend**: `BestBallWarRoomPanel` mounted in `WarRoomTab` for `bestBallMode` leagues —
  with an explicit AUTOMATIC-LINEUP explainer and NO start/sit button.

## Data path (see docs/best-ball-war-room-audit.md)

Detection `League.bestBallMode`. Roster = legacy `Roster.playerData`; value = redraft ADP;
ceiling = real `weeklyScore` max; stacks = `SportsPlayer.team` groupings. Waivers/trades from
`settings.best_ball_settings` (default OFF). NO future picks.

## Seed

`scripts/seed-best-ball-war-room-runtime.ts` (idempotent, fixed ids) creates an NFL standard
best-ball league (draft-only: waivers/trades OFF) with:

- Two legacy `Roster`s (member + commissioner) — draft rosters in `playerData` (both
  `players[]` and `lineup_sections` shapes), plus `LeagueTeam` rows.
- A member roster that is THIN at QB/TE, HEAVY at WR, with a real **BUF QB+WR stack** and a
  **Week-7 bye cluster** (5 players) — so construction/depth/stacks/risk all have signal.
- `SportsPlayer` rows (position/team), `AllFantasyAdpSnapshot` (leagueType=`redraft`) ADP,
  and 4 weeks of `weeklyScore` (real spike-week ceiling → upside confidence `high`).
- The commissioner holds the **AF War Room** entitlement (ask → 200); the member lacks it (402).

Run directly: `node --import tsx scripts/seed-best-ball-war-room-runtime.ts`.

## E2E — `e2e/best-ball-war-room-runtime.spec.ts` (`@db`, 4 tests, all passing)

1. **Routes enforce auth/privacy/scope (DB-backed)** — 401 unauthenticated; member gets a
   grounded context with `playerValues/weeklyScores/teamData` available, `waivers`/`trades`
   feature flags FALSE (draft-only), `upside`/`stacks` TRUE, QB under-invested, fragile
   positions present, players carry team. Construction action routes 200; waivers/trades 200
   with a truthful DISABLED state (not a crash); **a `lineup` action 404s (no start/sit)**;
   `ask` 402 (no entitlement); targeting another roster 403. Commissioner sees league-wide.
2. **Member UI click-through** — opens the panel, confirms the **automatic-lineup explainer**
   + construction render, asserts there is **no start/sit/lineup button**, clicks Upside,
   Draft plan, Stacks, Risk (each calls its route), confirms Waivers + Trade buttons are
   DISABLED (truthful), and the gated `ask` shows the upgrade note (402).
3. **Entitled commissioner ask degrades safely** — 200; answer or grounded-facts note.
4. **Mobile dark-mode smoke** — panel + auto-lineup explainer stay usable on 390×844.

## Honest / limited states

- No start/sit anywhere — the AI rules forbid it and the prompt explains the auto lineup;
  if a user asks "who do I start", Chimmy pivots to construction/depth/ceiling.
- Waivers/trades surface ONLY when `settings.best_ball_settings` enables them; otherwise a
  truthful disabled state (buttons disabled with tooltip copy).
- Upside uses REAL max weekly scores when present (`high` confidence) or an ADP PROXY
  (`low`, flagged) pre-season — never a fabricated ceiling.
- Stack/correlation requires player team data (`limited` otherwise); bye clustering requires
  bye data on the roster entries (`limited` otherwise). Neither is fabricated.

## How to run locally

```
node --import tsx scripts/seed-best-ball-war-room-runtime.ts
npx playwright test e2e/best-ball-war-room-runtime.spec.ts --project=chromium
```
