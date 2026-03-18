# PROMPT 342 — AllFantasy Salary Cap League QA + Workflow Validation

## Issue list by severity

### Critical (fixed in this pass)

| # | Issue | Resolution |
|---|--------|------------|
| 1 | **League create did not support Salary Cap** — Wizard/API did not set `leagueVariant = 'salary_cap'` or call `upsertSalaryCapConfig` when `league_type` or `leagueVariant` was `salary_cap`. | `app/api/league/create/route.ts`: Added `isSalaryCap` branch; set `resolvedVariant` to `'salary_cap'`; after create, call `upsertSalaryCapConfig(league.id, { mode, ... })` with optional wizard overrides. |
| 2 | **Startup auction not wired** — `initializeStartupLedgers` was never called when draft started; `assignStartupAuctionContract` was never called after each auction win. Salaries/contracts were not created from auction. | `lib/live-draft-engine/DraftSessionService.ts`: After `initializeAuctionForSession` in `startDraftSession`, call `initializeStartupLedgers(leagueId)` when `isSalaryCapLeague(leagueId)`. `app/api/leagues/[leagueId]/draft/controls/route.ts`: After `resolve_auction` with `result.sold`, fetch latest `DraftPick` and call `assignStartupAuctionContract(leagueId, pickId, contractYears)` with `contractYears` from config (default `contractMaxYears` or 4). |

### High (fixed or documented)

| # | Issue | Resolution |
|---|--------|------------|
| 3 | **Trade cap validation not integrated** — `SalaryCapTradeValidator.validateTradeCap` was not called from any trade-accept flow. | Added `POST /api/leagues/[leagueId]/salary-cap/validate-trade` so clients (or any future trade-execution API) can validate before accepting. Any player-for-player trade execution must call this (or the validator directly) and block if `!fromLegal` or `!toLegal`. Draft-pick-only trades do not move contracts; no cap check required there. |
| 4 | **Roster save had no salary cap context** — No guard or documentation for salary cap when roster mutations are implemented. | `app/api/leagues/roster/save/route.ts`: Added comment that when persisting roster changes for salary_cap leagues, call `validateTradeCap` for trades and enforce cap legality before adds/drops. |

### Medium (fixed in this pass)

| # | Issue | Resolution |
|---|--------|------------|
| 5 | **No commissioner API routes for config, offseason, extension, tag, cut, lottery** — Backend services existed but no HTTP API. | Added: `GET .../salary-cap/config`; `POST .../salary-cap/offseason/expiration`; `POST .../salary-cap/offseason/rollover`; `POST .../salary-cap/offseason/advance`; `POST .../salary-cap/extension`; `POST .../salary-cap/franchise-tag`; `POST .../salary-cap/cut`; `POST .../salary-cap/validate-trade`; `POST .../salary-cap/lottery`; `GET .../salary-cap/lottery/[capYear]`. All return 404 when `!isSalaryCapLeague(leagueId)`. Commissioner-only for offseason and lottery run; extension/tag/cut allowed for league members (owner of roster or commissioner). |

### Low / verified

| # | Item | Status |
|---|------|--------|
| 6 | **Team size 4–32** | League create already enforces `leagueSize` 4–32 in schema; salary cap does not override. |
| 7 | **Best ball scoring** | Backend: no change in salary-cap engine; use existing best ball path when `mode === 'bestball'`. Frontend: show best ball UI when config.mode is bestball (per PROMPT 340). |
| 8 | **Waiver/FA contract bidding** | `ContractBidService.processWinningContractBid` exists; not yet wired to waiver processing (no waiver-award API in codebase for salary cap). Document as future integration. |

---

## File-by-file fix plan (implemented)

| File | Change |
|------|--------|
| `app/api/league/create/route.ts` | Add `isSalaryCap`; set `resolvedVariant` to `'salary_cap'` when applicable; call `upsertSalaryCapConfig` with mode and optional wizard overrides. |
| `lib/live-draft-engine/DraftSessionService.ts` | In `startDraftSession`, after `initializeAuctionForSession`, if `isSalaryCapLeague(leagueId)` call `initializeStartupLedgers(leagueId)`. |
| `app/api/leagues/[leagueId]/draft/controls/route.ts` | Import `prisma`. After `resolve_auction` with `result.sold`, if `isSalaryCapLeague(leagueId)` get latest pick and call `assignStartupAuctionContract(leagueId, pickId, contractYears)`. |
| `app/api/leagues/roster/save/route.ts` | Add comment documenting salary cap: validate trades and cap legality when persisting roster changes. |
| `app/api/leagues/[leagueId]/salary-cap/config/route.ts` | **NEW** — GET config; 404 when not salary cap. |
| `app/api/leagues/[leagueId]/salary-cap/validate-trade/route.ts` | **NEW** — POST validate trade; body: fromRosterId, toRosterId, movingToReceiver[], movingToSender[]. |
| `app/api/leagues/[leagueId]/salary-cap/offseason/expiration/route.ts` | **NEW** — POST run expiration (commissioner); body: capYear. |
| `app/api/leagues/[leagueId]/salary-cap/offseason/rollover/route.ts` | **NEW** — POST run rollover (commissioner); body: fromCapYear. |
| `app/api/leagues/[leagueId]/salary-cap/offseason/advance/route.ts` | **NEW** — POST advance to new season (commissioner); body: newCapYear. |
| `app/api/leagues/[leagueId]/salary-cap/extension/route.ts` | **NEW** — POST apply extension; body: contractId, newYears, newSalary; refresh ledger. |
| `app/api/leagues/[leagueId]/salary-cap/franchise-tag/route.ts` | **NEW** — POST apply franchise tag; body: contractId; refresh ledger. |
| `app/api/leagues/[leagueId]/salary-cap/cut/route.ts` | **NEW** — POST cut/release; body: contractId, capYear; refresh ledger. |
| `app/api/leagues/[leagueId]/salary-cap/lottery/route.ts` | **NEW** — POST run weighted lottery (commissioner); body: slots[], seed. |
| `app/api/leagues/[leagueId]/salary-cap/lottery/[capYear]/route.ts` | **NEW** — GET lottery result for cap year. |

---

## Final QA checklist

- [ ] **Create Salary Cap Dynasty league** — Wizard/API with `league_type` or `leagueVariant` = `salary_cap` creates league with `leagueVariant = 'salary_cap'` and `SalaryCapLeagueConfig` row (mode dynasty).
- [ ] **Create Salary Cap BestBall league** — Same with mode bestball (e.g. via settings.mode or wizard).
- [ ] **Team size 4–32** — League create accepts and persists leagueSize in range; salary cap config does not restrict.
- [ ] **Configure startup auction** — Draft settings allow auction; for salary cap, startup draft type can be auction (config.startupDraftType).
- [ ] **Run startup auction** — Start draft (auction) initializes auction state and, for salary cap, calls `initializeStartupLedgers`; each resolve_auction win creates a `PlayerContract` via `assignStartupAuctionContract`.
- [ ] **Salaries/contracts save correctly** — Contract rows have correct salary (DraftPick.amount), years (config.contractMaxYears or default), source `startup_auction`.
- [ ] **Current and future cap** — Summary and ledger show correct totalCapHit, deadMoneyHit, capSpace; future projection matches contracts + dead money by year.
- [ ] **Future acquisition mode** — Config futureDraftType (linear, auction, weighted_lottery) is read and used where draft order is determined (e.g. lottery API).
- [ ] **Offseason transitions** — Commissioner can run expiration, rollover, advance via new API routes; contract year decrement and expiration run correctly.
- [ ] **Extensions** — Extension API applies extension; eligibility and min salary enforced; ledger refreshed.
- [ ] **Franchise tag** — Franchise tag API applies tag; one per roster; ledger refreshed.
- [ ] **Rookie contracts/options** — RookieContractService exists; options applied per config; no duplicate processing.
- [ ] **Trades with cap review** — POST validate-trade returns fromLegal/toLegal; any trade execution must call it and block if illegal.
- [ ] **Cuts/releases and dead money** — Cut API applies dead money per config; ledger updated; no duplicate events.
- [ ] **Weighted lottery** — Same seed + slots produces same order; result stored with seed; GET lottery/[capYear] returns result.
- [ ] **Best ball scoring** — When mode = bestball, best ball lineup/scoring path used; no AI for lineup.
- [ ] **AI recommendations** — Salary cap AI panel and POST .../salary-cap/ai return strategy/explanation only; no AI for legality, lottery, or bestball.
- [ ] **Entitlement gates** — Premium AI gated by salary_cap_ai or ai_chat; no broken monetization.
- [ ] **No dead buttons/routes** — Summary and AI return 404 for non–salary cap leagues; config and validate-trade same.
- [ ] **No stale cap data** — Ledger refreshed after extension, tag, cut (getOrCreateLedger); startup auction updates ledger per pick.
- [ ] **No duplicate contract processing** — Single assignStartupAuctionContract per resolve_auction win; expiration/advance idempotent where designed.
- [ ] **No AI-generated legal outcomes** — AI is advisory only; legality from ContractValidationEngine and SalaryCapTradeValidator.
- [ ] **Mobile/desktop UX** — Salary cap views (OverviewTab SalaryCapHome, etc.) responsive; no dead buttons.

---

## Manual testing checklist

1. **Create league**  
   - Create league with type/variant salary_cap (Dynasty and BestBall).  
   - Confirm league.leagueVariant = 'salary_cap' and SalaryCapLeagueConfig exists with correct mode.

2. **Team size**  
   - Create leagues with leagueSize 4, 12, 32; confirm accepted and displayed.

3. **Startup auction**  
   - Create salary cap league with draft type auction; add rosters; start draft.  
   - Confirm ledgers exist (GET salary-cap/summary or DB).  
   - Resolve auction for a nominated player (commissioner resolve_auction).  
   - Confirm PlayerContract created with salary = bid amount and correct years; ledger totalCapHit updated.

4. **Cap and projection**  
   - GET salary-cap/summary; confirm config, ledger, contracts, futureProjection, events.  
   - Change contracts (e.g. run extension/cut via API); confirm summary and projection update.

5. **Offseason**  
   - As commissioner: POST offseason/expiration (capYear); POST offseason/rollover; POST offseason/advance (newCapYear).  
   - Confirm phase and contract years/expirations as expected.

6. **Extension**  
   - POST salary-cap/extension with contractId, newYears, newSalary (at or above eligibility price).  
   - Confirm new contract and ledger refresh.

7. **Franchise tag**  
   - POST salary-cap/franchise-tag with contractId (final-year contract).  
   - Confirm contract status tagged and ledger updated.

8. **Cut**  
   - POST salary-cap/cut with contractId, capYear.  
   - Confirm contract status cut, deadMoneyRemaining set, ledger updated.

9. **Validate trade**  
   - POST salary-cap/validate-trade with fromRosterId, toRosterId, movingToReceiver, movingToSender.  
   - Confirm fromLegal, toLegal, errors in response; block actual trade if illegal (when trade execution exists).

10. **Lottery**  
    - POST salary-cap/lottery with slots and seed; GET salary-cap/lottery/[capYear].  
    - Run twice with same seed/slots; confirm same order.

11. **AI and entitlements**  
    - Open salary cap league; open AI panel; request advice.  
    - With entitlement off, confirm gating; with entitlement on, confirm response is advisory only (no “legal” outcome).

12. **Non–salary cap**  
    - GET salary-cap/summary, config, ai for non–salary cap league; expect 404.

13. **Mobile/desktop**  
    - Load league page (salary cap) on narrow and wide viewport; confirm no dead buttons or broken layout.

---

## Automated test recommendations

Project uses **Vitest** (`npm run test`). Recommendations:

1. **League create**  
   - Integration test: POST league create with league_type = 'salary_cap', assert leagueVariant and SalaryCapLeagueConfig row (mode dynasty or bestball from body).

2. **Startup ledger init**  
   - Unit or integration: mock/create salary cap league + draft session (auction); call `startDraftSession(leagueId)`; assert `initializeStartupLedgers` called (or assert ledger rows created).

3. **Assign startup contract**  
   - After creating a draft pick with amount and rosterId, call `assignStartupAuctionContract(leagueId, pickId, years)`; assert PlayerContract exists, ledger totalCapHit updated.

4. **Cap calculation**  
   - Unit: given config + contracts + dead money, assert `getTotalCapHitForRoster` and `getOrCreateLedger` return expected totalCapHit, deadMoneyHit, capSpace.

5. **Validate trade**  
   - Unit: `validateTradeCap(leagueId, input)` with known ledgers; assert fromLegal/toLegal and errors when over cap.

6. **Offseason**  
   - Unit: `runExpirationPhase`, `runRolloverPhase`, `advanceToNewSeason` with test league/contracts; assert contract statuses and ledger/phase changes.

7. **Weighted lottery**  
   - Unit: `runWeightedLottery(leagueId, slots, seed)` twice with same args; assert same order; assert stored result has seed.

8. **API routes**  
   - For salary-cap routes: GET/POST with valid league (salary cap) and invalid (non–salary cap); assert 200 vs 404 and body shape (e.g. config, validate-trade result).

9. **Entitlement gate**  
   - Mock entitlement API; POST salary-cap/ai; assert 403 or restricted when feature not granted, 200 when granted (and response not “legal” outcome).

Suggested file locations: `tests/salary-cap-league-create.test.ts`, `tests/salary-cap-auction-startup.test.ts`, `tests/salary-cap-validate-trade.test.ts`, `tests/salary-cap-offseason.test.ts`, `tests/salary-cap-lottery.test.ts`, and route tests under `app/api/leagues/[leagueId]/salary-cap/` if route-level tests are used.

---

*End of PROMPT 342 deliverable. All listed code fixes are merged; use the checklists above for sign-off and regression.*
