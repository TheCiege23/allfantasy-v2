# PROMPT 339 — Salary Cap League Backend Deliverable

## Label and path summary

| Label   | Relative path |
|---------|----------------|
| [UPDATED] | `prisma/schema.prisma` (Salary Cap section added) |
| [NEW]   | `lib/salary-cap/types.ts` |
| [NEW]   | `lib/salary-cap/constants.ts` |
| [NEW]   | `lib/salary-cap/SalaryCapLeagueConfig.ts` |
| [NEW]   | `lib/salary-cap/CapCalculationService.ts` |
| [NEW]   | `lib/salary-cap/FutureCapProjectionService.ts` |
| [NEW]   | `lib/salary-cap/DeadMoneyService.ts` |
| [NEW]   | `lib/salary-cap/ContractLifecycleService.ts` |
| [NEW]   | `lib/salary-cap/ContractValidationEngine.ts` |
| [NEW]   | `lib/salary-cap/SalaryCapTradeValidator.ts` |
| [NEW]   | `lib/salary-cap/ExtensionService.ts` |
| [NEW]   | `lib/salary-cap/FranchiseTagService.ts` |
| [NEW]   | `lib/salary-cap/RookieContractService.ts` |
| [NEW]   | `lib/salary-cap/ContractBidService.ts` |
| [NEW]   | `lib/salary-cap/AuctionStartupService.ts` |
| [NEW]   | `lib/salary-cap/WeightedLotteryService.ts` |
| [NEW]   | `lib/salary-cap/SalaryCapOffseasonCalendar.ts` |
| [NEW]   | `lib/salary-cap/CompPickService.ts` |
| [NEW]   | `lib/salary-cap/index.ts` |

---

## Schema changes

- **League**: added `salaryCapConfig SalaryCapLeagueConfig?`.
- **SalaryCapLeagueConfig**: 1:1 with League when `leagueVariant = 'salary_cap'`. Fields: mode, startupCap, capGrowthPercent, contractMin/MaxYears, rookieContractYears, minimumSalary, deadMoney*, rollover*, capFloor*, extensionsEnabled, franchiseTagEnabled, rookieOptionEnabled, startupDraftType, futureDraftType, auctionHoldback, weightedLotteryEnabled, lotteryOddsConfig, compPick*, offseasonPhase, offseasonPhaseEndsAt.
- **SalaryCapTeamLedger**: per roster, per cap year. totalCapHit, deadMoneyHit, rolloverUsed, capSpace. Unique (configId, rosterId, capYear).
- **PlayerContract**: rosterId, playerId, salary, yearsTotal, yearSigned, contractYear, status (active|expired|cut|traded|tagged|option_exercised), source, franchiseTagAt, optionExercisedAt, cutAt, deadMoneyRemaining (Json).
- **SalaryCapEventLog**: append-only; eventType, metadata.
- **SalaryCapLotteryResult**: configId, capYear, seed, order (Json). Unique (configId, capYear).

Run: `npx prisma generate` (and `prisma migrate dev` when ready).

---

## Event / job / background task requirements

| Task | When | Action |
|------|------|--------|
| **Cap update after move** | On every contract add/drop/trade/cut/extend/tag | Call `getOrCreateLedger(config, rosterId, capYear)` (or equivalent) so ledger stays current. |
| **Contract expiration** | Offseason transition | Call `SalaryCapOffseasonCalendar.runExpirationPhase(leagueId, capYear)`. |
| **Rollover** | After expiration, before draft | Call `SalaryCapOffseasonCalendar.runRolloverPhase(leagueId, fromCapYear)`. |
| **New season advance** | After draft/FA | Call `SalaryCapOffseasonCalendar.advanceToNewSeason(leagueId, newCapYear)`. |
| **Best ball lineup** | Weekly (when mode = bestball) | Existing best ball logic; use legal roster slots only. No change in salary-cap engine. |
| **Startup ledger init** | When auction draft starts | Call `AuctionStartupService.initializeStartupLedgers(leagueId)`. |
| **Startup pick → contract** | After each auction pick | Call `AuctionStartupService.assignStartupAuctionContract(leagueId, draftPickId, contractYears)`. |
| **Waiver/FA bid win** | When waiver processing awards player | Call `ContractBidService.processWinningContractBid(leagueId, bid, playerName, position)`. |
| **Trade pre-accept** | Before trade accept | Call `SalaryCapTradeValidator.validateTradeCap(leagueId, input)`; block if !fromLegal or !toLegal. |

---

## Route list (recommended)

Implement when wiring API layer; backend engine is callable from these routes.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/leagues/[leagueId]/salary-cap/config` | Return league config (or 404). |
| GET | `/api/leagues/[leagueId]/salary-cap/ledger` | Cap state per roster (optional rosterId, capYear). |
| GET | `/api/leagues/[leagueId]/salary-cap/contracts` | Contracts for roster or league. |
| GET | `/api/leagues/[leagueId]/salary-cap/projection?rosterId=&capYears=` | Future cap projection. |
| GET | `/api/leagues/[leagueId]/salary-cap/legality?rosterId=` | Current cap legality. |
| POST | `/api/leagues/[leagueId]/salary-cap/validate-bid` | Validate waiver/FA contract bid. |
| POST | `/api/leagues/[leagueId]/salary-cap/validate-trade` | Validate trade cap impact. |
| POST | `/api/leagues/[leagueId]/salary-cap/cut` | Apply cut (commissioner or owner); body: contractId. |
| POST | `/api/leagues/[leagueId]/salary-cap/extension` | Apply extension; body: contractId, newYears, newSalary. |
| POST | `/api/leagues/[leagueId]/salary-cap/franchise-tag` | Apply franchise tag; body: contractId. |
| GET | `/api/leagues/[leagueId]/salary-cap/offseason-phase` | Current offseason phase. |
| POST | `/api/leagues/[leagueId]/salary-cap/offseason/expiration` | Run expiration (commissioner). |
| POST | `/api/leagues/[leagueId]/salary-cap/offseason/rollover` | Run rollover (commissioner). |
| POST | `/api/leagues/[leagueId]/salary-cap/lottery` | Run weighted lottery; body: slots, seed. |
| GET | `/api/leagues/[leagueId]/salary-cap/lottery/[capYear]` | Get lottery result. |

---

## QA checklist (mandatory)

- [ ] **No illegal cap states persist** — After any contract add/cut/trade, run `checkCapLegality` for affected rosters; fix any ledger/cache so illegal states are not stored.
- [ ] **Contract years decrement correctly** — Run `decrementContractYears` for a test league; assert contractYear advances and expired contracts marked.
- [ ] **Future cap projections consistent** — For a roster with known contracts, assert `getFutureCapProjection` matches sum of contract salaries + dead money by year.
- [ ] **Startup auction creates valid contracts** — Run `initializeStartupLedgers`, then `assignStartupAuctionContract` for a pick; assert contract exists and ledger totalCapHit updated.
- [ ] **Future draft mode settings work** — Config futureDraftType = linear | auction | weighted_lottery is read and used by draft/order logic.
- [ ] **Weighted lottery deterministic and auditable** — Run `runWeightedLottery` twice with same seed and slots; assert same order; assert result stored with seed.
- [ ] **Best ball scoring** — When league mode = bestball, lineup optimization uses only legal roster slots; no change to cap engine (existing best ball path).
- [ ] **No dead backend routes** — Any route that calls salary-cap engine must return 404 when `!isSalaryCapLeague(leagueId)`.

---

*End of PROMPT 339 deliverable. Merge with existing league create (set leagueVariant and upsertSalaryCapConfig when type = salary_cap) and waiver/trade flows as needed.*
