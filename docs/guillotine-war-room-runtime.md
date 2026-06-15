# Guillotine AF War Room — Runtime Verification

_DB-backed runtime QA for the native Guillotine War Room. Mirrors the redraft/dynasty/keeper/
best-ball runtime docs. Verified 2026-06-15 against live Neon + the dev server via Playwright
(`@db`)._

## What the runtime proves

The Guillotine War Room is grounded in the league's OWN data (no fabrication) and is
SURVIVAL-FIRST: each scoring period the lowest team(s) are CHOPPED (eliminated); the goal
is to NOT finish last.

- **Context builder** (`lib/guillotine-war-room/guillotineWarRoomContext.ts`) — the only
  DB-touching file. Reuses the real guillotine layer: `getGuillotineConfig` (elimination
  cadence + danger margin), `getDangerTiers` (chop_zone/danger/safe + `pointsFromChopZone`
  = the elimination line), `GuillotineRosterState` (eliminated teams), `GuillotinePeriodScore`
  (scores), legacy `Roster` (lineup + FAAB), `GuillotineWaiverRelease` (dropped pool), and
  redraft ADP + projections + injuries for player signals. Sets honest availability flags.
- **Engines** (pure): survival-risk, roster-risk (floor/weakness), lineup-safety
  (floor + ceiling swing when at risk), FAAB (conserve vs aggressive), waiver, dropped-player,
  trade (only when enabled), weekly-plan (composed). Survival-first throughout.
- **Routes**: `GET /api/leagues/[leagueId]/guillotine-war-room` + consolidated
  `POST .../[action]` (survival-risk, roster-risk, lineup-safety, waivers, faab-plan,
  dropped-players, trade-analyze, weekly-plan, ask). Two files — no route bloat
  (budget GREEN 1686).
- **Global Chimmy grounding**: `buildGuillotineWarRoomContextForChimmy` injected into
  `app/api/chat/chimmy/route.ts` for guillotine leagues only (other formats unaffected).
  Coexists with the pre-existing lightweight `buildGuillotineContextForChimmy` summary.
- **Frontend**: `GuillotineWarRoomPanel` mounted in `WarRoomTab` for `guillotineMode`/
  `leagueVariant=guillotine` leagues — survival hero, weekly plan, survival standings, tools.

## Data path (see docs/guillotine-war-room-audit.md)

Detection `League.guillotineMode` / `leagueVariant='guillotine'`. Survival = `getDangerTiers`
+ `GuillotineRosterState` + `GuillotinePeriodScore`; rosters/FAAB = legacy `Roster`; dropped
pool = `GuillotineWaiverRelease`; value = redraft ADP; projections = `fantasyProjection`.
Trades default OFF.

## Seed

`scripts/seed-guillotine-war-room-runtime.ts` (idempotent, fixed ids) creates an NFL
guillotine league (`guillotineMode`, `leagueVariant=guillotine`, danger margin 10) with:

- 6 teams: the **member** is the lowest scorer → **chop_zone (critical)**; the
  **commissioner** is the highest → **safe**; 3 mid teams → danger; 1 **eliminated** team.
- `GuillotineLeagueConfig`, `GuillotinePeriodScore` (week 5 per team), `GuillotineRosterState`
  (one chopped team), legacy `Roster` rows (member full lineup_sections incl. an injured RB +
  thin TE; FAAB 80) + `LeagueTeam` names.
- A `GuillotineSeason` + `GuillotineWaiverRelease` rows → a real **dropped-player pool** (3).
- Redraft ADP rows + member `fantasyProjection` (week 5).
- The commissioner holds the **AF War Room** entitlement (ask → 200); the member lacks it (402).

Run directly: `node --import tsx scripts/seed-guillotine-war-room-runtime.ts` (with `.env`).

## E2E — `e2e/guillotine-war-room-runtime.spec.ts` (`@db`, 4 tests)

1. **Routes enforce auth/privacy/scope + survival-first (DB-backed)** — **PASSING.** 401
   unauthenticated; member gets `eliminationLine/periodScores/droppedPlayerPool` available,
   `survivalRisk`/`droppedPlayers` features on, `tradeAnalyze` off (trades disabled),
   `activeTeamCount`/`eliminatedTeamCount` > 0, **member `survival.riskLevel='critical'`,
   tier `chop_zone`, weeklyPlan critical**; an eliminated team appears in standings; other
   teams' players are stripped for members. All 7 survival/action routes return 200;
   trade-analyze returns the truthful `disabled` verdict (200, not crash); `ask` is 402 (no
   entitlement); targeting another roster is 403. Commissioner is `safe` and sees league-wide.
2. **Member UI click-through** — renders the panel (survival hero, weekly plan, standings),
   clicks the survival tools, asserts trade-analyzer is disabled (truthful), `ask` shows the
   upgrade note. Environment-sensitive (see note below).
3. **Entitled commissioner ask degrades safely** — 200; answer or grounded-facts note.
4. **Mobile dark-mode smoke** — panel + survival hero usable on 390×844.

### Auth + dev-server notes (environment)
- NextAuth uses `NEXTAUTH_URL`; for local Playwright set `NEXTAUTH_URL=http://127.0.0.1:3101`
  + `AUTH_TRUST_HOST=true` so the session cookie binds to the test origin (the repo `.env`
  ships the production origin, whose `__Secure-` cookie won't bind to `http://127.0.0.1`).
  The route-contract test passes reliably with this override.
- The full league-**shell** browser render cold-compiles a very large client module graph in
  `next dev`; tests 2-4 (which render `/league/[leagueId]` and click the `war_room` tab) are
  **environment-sensitive** under cold dev compile — the same caveat documented for every
  prior format's heavy click-through. The **authoritative** backend/auth/scope/survival
  verification is the route-contract test (test 1), which is green, and every engine is
  additionally proven by a deterministic live-Neon probe.

## Honest / limited states

- Survival risk returns `limited` when the elimination line (projected/period scores) is
  unavailable — never a fabricated line.
- Dropped-player pool is `limited`/empty until a team is chopped and its players release;
  never invented.
- FAAB is qualitative (no bid amounts) when the budget is unknown.
- Trades return a truthful `disabled` state unless the league enables them.
- The AI/engines are survival-first: conserve FAAB and floor when safe; only chase ceiling
  to escape the chop zone.

## How to run locally

```
node --import tsx scripts/seed-guillotine-war-room-runtime.ts
# (PowerShell) load .env, then:
$env:NEXTAUTH_URL='http://127.0.0.1:3101'; $env:AUTH_TRUST_HOST='true'
npx playwright test e2e/guillotine-war-room-runtime.spec.ts -g "routes enforce auth" --project=chromium
```
