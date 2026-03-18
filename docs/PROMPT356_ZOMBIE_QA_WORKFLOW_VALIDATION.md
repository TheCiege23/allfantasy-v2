# PROMPT 356 — Zombie League QA + Workflow Validation Deliverable

## Issue list by severity

### Critical (fixed in this deliverable)

| # | Issue | Location | Fix |
|---|-------|----------|-----|
| 1 | **Zombie summary route returns undefined `myResources`** — response referenced `myResources` but it was never defined, causing runtime error or broken UI. | `app/api/leagues/[leagueId]/zombie/summary/route.ts` | Compute `myResources` from `getSerumBalance`, `getAmbushBalance`, and weapon ledger sum for `myRosterId`; return `{ serums: 0, weapons: 0, ambush: 0 }` when user has no roster. |

### High (missing API / workflow wiring — fixed)

| # | Issue | Location | Fix |
|---|-------|----------|-----|
| 2 | **No HTTP route to attach league to universe** — `attachLeagueToUniverse` existed in lib but no API called it; commissioners could not link a league to a universe/level. | N/A (missing) | **Added** `POST /api/leagues/[leagueId]/zombie/attach-universe` with body `{ universeId, levelId, name?, orderInLevel? }`; creates or updates `ZombieLeague` and syncs `ZombieLeagueConfig.universeId`. |
| 3 | **No route to trigger movement projection refresh** — `refreshMovementProjections` existed but was never invoked from any route; universe standings page showed stale movement watch. | N/A (missing) | **Added** `POST /api/zombie-universe/[universeId]/refresh?season=` to call `refreshMovementProjections(universeId, season)`. |

### Medium (stubs / not yet implemented — documented; no code change in this pass)

| # | Issue | Location | Notes |
|---|-------|----------|--------|
| 4 | **Stat correction reversal** — Config flag exists; no engine or route reverts infection when matchup result is corrected. | `lib/zombie/ZombieLeagueConfig.ts`, types | Implement: recompute matchups for week, if loser was infected and corrected result flips winner, call status revert (Survivor) and audit. |
| 5 | **Serum timing enforcement** — `serumUseBeforeLastStarter` is config only; no service/route enforces “before last starter locks”. | `lib/zombie/ZombieSerumEngine.ts` | Add check (e.g. vs lock times or “lineup locked” flag) before `useSerumToRevive`; reject if past window. |
| 6 | **Weapon top-two rule / bomb / transfers** — Config and types exist; no engine applies “top two active” or bomb one-time override or weapon transfers. | `lib/zombie/ZombieWeaponEngine.ts` | Implement application of top-two and bomb in matchup resolution or finalization; add transfer API if needed. |
| 7 | **Survivor bashing / zombie mauling** — No deterministic engine for who bashes/mauls and resulting serum awards. | `lib/zombie/ZombieResultFinalizationService.ts` | Define rules (e.g. matchup loser bashed by winner; maul when zombie beats survivor); award serum per config; call from finalization. |
| 8 | **Whisperer conversion** — `setWhisperer` exists; no API or UI for vacancy fill or conversion options. | `lib/zombie/ZombieOwnerStatusService.ts` | Add commissioner route (e.g. POST set-whisperer) and optional UI. |
| 9 | **Ambush illegal after player start** — Ambush rules (balance, per-week limit) exist; no check that ambush is blocked after first game of week. | `lib/zombie/ZombieAmbushEngine.ts` | Add “lock time” or “first game started” check in `canUseAmbush` or at call site. |
| 10 | **No-waiver free agency enforcement** — Config `noWaiverFreeAgency` exists; waiver/trade flow does not check it. | Waiver/trade routes | Gate waiver processing or trade by `getZombieLeagueConfig(leagueId).noWaiverFreeAgency` and apply free-agent rules. |
| 11 | **Dangerous drop value always 0** — `evaluateDangerousDrops` uses `value = 0`, so no drop ever exceeds threshold. | `lib/zombie/ZombieValuableDropGuard.ts` | Replace with real player value (e.g. from projections or roster value service) before comparing to `dangerousDropThreshold`. |
| 12 | **Weekly league update generation** — No dedicated route or content for “weekly board update” or forum post. | N/A | Add route or cron that builds summary (board + infections + chompin block) and optionally posts to forum. |
| 13 | **Zombie-specific draft order randomization** — Policy lists it; no zombie-specific randomization or startup draft flow. | League create / draft | Optional: add zombie draft order randomization step and ensure startup draft uses it. |

### Low / informational

| # | Issue | Notes |
|---|-------|--------|
| 14 | **AI entitlement gate bypassed** | `ALLOW_WHEN_ENTITLEMENTS_OPEN = true` in league and universe AI routes; by design for dev. Set to `false` when enforcing subscription. |
| 15 | **Chompin' Block candidates empty** | `getWeeklyBoardData` returns `chompinBlockCandidates: []`; caller can fill from lowest weekly scores if desired. |

---

## File-by-file fix plan (applied)

| File | Change |
|------|--------|
| `app/api/leagues/[leagueId]/zombie/summary/route.ts` | **FIXED.** Import `getSerumBalance`, `getAmbushBalance`; after building `rosterDisplayNames`, compute `myResources` (serums, weapons from ledger sum, ambush) for `myRosterId`; return it in JSON. If no `myRosterId`, return `{ serums: 0, weapons: 0, ambush: 0 }`. |
| `app/api/zombie-universe/[universeId]/refresh/route.ts` | **NEW.** POST handler: auth, validate universe, optional `?season=`, call `refreshMovementProjections(universeId, season)`, return `{ ok, universeId, season }`. |
| `app/api/leagues/[leagueId]/zombie/attach-universe/route.ts` | **NEW.** POST handler: auth, draft access, zombie league check; body `universeId`, `levelId`, optional `name`, `orderInLevel`; validate universe and level; if `ZombieLeague` exists for leagueId update it, else `attachLeagueToUniverse`; then `upsertZombieLeagueConfig(leagueId, { universeId })`; return `{ ok, leagueId, universeId, levelId, attached }`. |

---

## Full merged code (summary of changes)

- **Summary route:** See above; full file now includes `getSerumBalance`, `getAmbushBalance`, prisma ledger query for weapons, and `myResources` object in response.
- **Refresh route:** New file as described.
- **Attach-universe route:** New file as described.

---

## Final QA checklist

- [ ] **Create Zombie league** — League creation with zombie variant; config exists after creation.
- [ ] **Configure league level** — PUT zombie config; attach league to universe via `POST /api/leagues/[leagueId]/zombie/attach-universe` with valid `universeId` and `levelId`.
- [ ] **Whisperer selection** — Whisperer set via `selectAndSetWhisperer` or equivalent; GET summary shows correct `whispererRosterId`.
- [ ] **Draft order / startup draft** — Draft order and startup draft run (no zombie-specific randomization unless added).
- [ ] **Start season** — Season start flow works for zombie league.
- [ ] **Weekly matchups** — Matchup results present (from sync or manual); finalize uses them.
- [ ] **Finalize and infect** — POST finalize runs infection for week; survivors losing to Whisperer/Zombie (per config) become Zombie; status and infection log updated.
- [ ] **Weekly winnings** — Finalize records winnings for matchup winner/loser; ledger reflects.
- [ ] **Serum by high score** — Finalize awards serum to high-score roster(s); balance increases.
- [ ] **Serum revive** — Use serum to revive (Zombie → Survivor) when balance ≥ config.serumReviveCount; status and ledger updated.
- [ ] **Weapon awards** — Finalize awards weapons by score thresholds; Zombies do not receive.
- [ ] **Zombie trade block** — GET `can-trade?rosterId=` returns `canTrade: false` when config.zombieTradeBlocked and status is Zombie.
- [ ] **Summary route** — GET zombie summary returns valid `myResources` (serums, weapons, ambush) for current user; no undefined.
- [ ] **Universe standings** — GET universe standings returns aggregated leagues/levels; filter/search works on standings page.
- [ ] **Movement watch** — After POST universe refresh, movement projections updated; standings page shows movement/reason.
- [ ] **Universe forum** — Forum tab and weekly threads open; no broken routes.
- [ ] **AI gates** — League and universe AI panels show upgrade when no entitlement; when `ALLOW_WHEN_ENTITLEMENTS_OPEN` is false, API returns 403 without entitlement.
- [ ] **No dead buttons** — All visible actions (Finalize, Refresh, Attach, Generate AI) either work or show clear error/upsell.
- [ ] **No duplicate result processing** — Finalize is idempotent or guarded so double-finalize does not double-apply infection/winnings.
- [ ] **No AI-generated legal outcomes** — AI responses are narrative only; no engine uses AI output for infection, serum/weapon/ambush legality, or trade.

---

## Manual testing checklist

1. **League creation and config**  
   Create a league with zombie variant (or convert). Confirm zombie config GET/PUT. Call `POST /api/leagues/[leagueId]/zombie/attach-universe` with a valid universe and level; confirm league appears in universe standings.

2. **Whisperer and statuses**  
   Set Whisperer (via existing tool or DB). GET summary; confirm `whispererRosterId`, `survivors`, `zombies`, `myRosterId`, and **`myResources`** (serums, weapons, ambush) are present and valid.

3. **Finalize flow**  
   Ensure matchup facts and team performance exist for a week. POST finalize with that week. Confirm infection count, serum awards, weapon awards; check statuses and winnings ledger.

4. **Can-trade**  
   Set a roster to Zombie (e.g. after finalize). GET `can-trade?rosterId=`. Confirm `canTrade: false` when zombie trade blocked.

5. **Universe standings and refresh**  
   Open universe standings page; note movement data. POST `api/zombie-universe/[universeId]/refresh`. Reload standings; confirm movement projections updated (or unchanged if no rank change).

6. **Universe forum and AI**  
   Open Forum tab; open AI tab; run one universe AI type. Confirm deterministic summary and narrative appear; no 500.

7. **League AI**  
   Open league zombie AI panel; pick a topic; Generate. Confirm deterministic block then AI narrative; with entitlement off, confirm upsell; with entitlement on, confirm response.

8. **Mobile vs desktop**  
   Smoke-test key pages (league zombie home, universe home, standings, forum, AI) on narrow and wide viewports; no broken layout or dead taps.

---

## Automated test recommendations (Vitest)

- **Zombie summary route**  
  - Mock auth, `canAccessLeagueDraft`, `isZombieLeague`, config, statuses, whisperer, board, rosters, teams; mock `getSerumBalance`, `getAmbushBalance`, prisma `zombieResourceLedger.findMany`.  
  - Assert response includes `myResources` with `serums`, `weapons`, `ambush` (numeric); when `myRosterId` is null, assert `myResources` is `{ serums: 0, weapons: 0, ambush: 0 }`.

- **Zombie finalization**  
  - Mock config, `getRosterTeamMap`, `runInfectionForWeek`, prisma matchup/teamPerformance; call `finalizeWeek`.  
  - Assert `runInfectionForWeek` called once; assert `recordWinnings` called for winner and loser; assert serum/weapon awards when conditions met (e.g. high score).

- **Infection engine**  
  - Given matchups (winner = Zombie, loser = Survivor) and config `infectionLossToZombie: true`, run `runInfectionForWeek` (with mocks for DB); assert loser status set to Zombie and infection log entry.

- **Can-trade route**  
  - Mock config `zombieTradeBlocked: true` and status Zombie; GET can-trade with rosterId; assert `canTrade: false`.

- **Attach-universe route**  
  - Mock auth, draft access, isZombieLeague, prisma universe/level; POST with `universeId`, `levelId`; assert `ZombieLeague` created or updated and config updated.

- **Universe refresh route**  
  - Mock auth, prisma zombieUniverse, `refreshMovementProjections`; POST refresh; assert `refreshMovementProjections` called with correct universeId and optional season.

Place tests under `tests/` (e.g. `tests/zombie-summary.test.ts`, `tests/zombie-finalize.test.ts`, `tests/zombie-can-trade.test.ts`, `tests/zombie-attach-universe.test.ts`, `tests/zombie-universe-refresh.test.ts`) and run with `npm run test`.
