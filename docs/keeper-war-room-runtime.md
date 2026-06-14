# Keeper AF War Room — Runtime Verification

_DB-backed runtime QA for the native Keeper War Room. Mirrors the redraft/dynasty runtime
docs. Verified 2026-06-14 against live Neon + the dev server via Playwright (`@db`)._

## What the runtime proves

The Keeper War Room is grounded in the league's OWN data (no fabrication). Keeper is its
own format: single-season, but keep/cut weighs DRAFT-CAPITAL cost (round/auction).

- **Context builder** (`lib/keeper-war-room/keeperWarRoomContext.ts`) — the only DB-touching
  file. Rosters/standings/schedule from the redraft-season layer (`RedraftSeason`/
  `RedraftRoster`/`RedraftRosterPlayer`/`RedraftMatchup`); keeper COST/eligibility from
  `KeeperEligibility` (→ fallback `KeeperRecord`); keeper settings from `League` columns;
  value from redraft ADP (`AllFantasyAdpSnapshot` leagueType=`redraft`, ADP-implied round =
  ceil(adp/teamCount)); injuries/news/projections/free-agents reused from the redraft
  providers. Sets honest availability flags.
- **Engines** (pure): value (surplus), recommendation, cut-list, roster-needs-after-keepers,
  draft-plan, trade (keeper-cost-aware), trade-finder, waiver + lineup (in-season only).
- **Core signal — VALUE SURPLUS** = keeperCostRound − adpRound (positive = keep a higher-value
  player for a later/cheaper pick). Never fabricated; null when cost or ADP is missing.
- **Routes**: `GET /api/leagues/[leagueId]/keeper-war-room` + consolidated `POST .../[action]`
  (keeper-recommendations, cut-list, draft-plan, roster-needs, waivers, lineup, trade-analyze,
  trade-find, ask). Two files — no route bloat (budget GREEN 1682).
- **Global Chimmy grounding**: `buildKeeperContextForChimmy` injected into
  `app/api/chat/chimmy/route.ts` for keeper leagues only (redraft/dynasty unaffected).
- **Frontend**: `KeeperWarRoomPanel` mounted in `WarRoomTab` for keeper leagues.

## Data path (see docs/keeper-war-room-audit.md)

Keeper reuses the **redraft-season roster layer** + **KeeperEligibility/KeeperRecord costs** +
**redraft ADP**. All keeper tables (`keeper_eligibilities`, `keeper_records`,
`keeper_selection_sessions`, `keeper_pick_adjustments`, `keeper_declarations`) are already
migrated. NO dynasty future-pick capital (keeper disables future picks).

## Seed

`scripts/seed-keeper-war-room-runtime.ts` (idempotent, fixed ids) creates an NFL round-based
keeper league (max 3 keepers, −1 round penalty, 3-year max) with:

- A `RedraftSeason` (active, week 5) + two `RedraftRoster`s (member + commissioner) with
  `RedraftRosterPlayer`s, plus legacy `Roster` rows for membership resolution + `LeagueTeam`.
- A member roster spanning the full keeper spectrum: an **elite-value** keeper (Round 2 ADP,
  costs Round 8 → +6 surplus), a **strong** one (+2), a **fair** one (0), a **negative-value**
  one (−1 → avoid), an **ineligible** one (max years), and a **no-cost** one (limited).
- `KeeperEligibility` rows (the real cost source) for the member's keepers + the ineligible flag.
- `AllFantasyAdpSnapshot` (leagueType=`redraft`) rows for every seeded player + free agents.
- `fantasy_projections` + `player_weekly_scores` (season active → lineup/waivers usable).
- The commissioner holds the **AF War Room** entitlement (ask → 200); the member lacks it (402).

Run directly: `node --import tsx scripts/seed-keeper-war-room-runtime.ts`.

## E2E — `e2e/keeper-war-room-runtime.spec.ts` (`@db`, 4 tests, all passing)

1. **Routes enforce auth/privacy/scope (DB-backed)** — 401 unauthenticated; member gets a
   grounded context with `playerValues/keeperCosts/eligibility` available,
   `keeperRecommendations` feature on, `maxKeepers=3`, `costSystem=round_based`, real
   value-surplus on their players, and non-empty keeper recommendations. Other teams'
   players are stripped for members (no leak). All action routes 200 for the member's own
   roster; targeting another roster is 403; `ask` is 402 (no entitlement). Commissioner
   sees league-wide rosters.
2. **Member UI click-through** — opens the panel, confirms the keeper rules card +
   recommendations render, clicks Cut list, Draft plan, Trade analyzer, Trade finder (each
   verified to call its consolidated route), and confirms the gated `ask` shows the upgrade
   note (402).
3. **Entitled commissioner ask degrades safely** — 200; renders an answer, or the "AI
   temporarily unavailable — grounded facts" note when the model is down.
4. **Mobile dark-mode smoke** — the panel + a primary tool stay rendered/usable on a
   390×844 viewport inside a valid i18n/theme shell.

## Honest / limited-data states

- `keeperCosts=missing` (no eligibility/records) → recommendations return a limited-data
  state; cut list/needs fall back to season value. Costs are NEVER fabricated.
- Auction cost systems show the auction cost but `surplusRounds=null` (no market auction
  values are invented) — flagged.
- Waivers/lineup are gated on `seasonActive`; pre-season they return a clear "not in play
  yet" state and the buttons are disabled with truthful copy.
- No dynasty future-pick / rookie-pick logic anywhere (keeper disables future picks).

## How to run locally

```
node --import tsx scripts/seed-keeper-war-room-runtime.ts
npx playwright test e2e/keeper-war-room-runtime.spec.ts --project=chromium
```
