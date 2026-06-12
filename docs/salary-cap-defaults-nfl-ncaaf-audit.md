# Salary Cap Defaults — NFL + NCAAF Audit

## What Was Found

### Already Implemented (pre-Phase 1)

| Component | Status | Notes |
|-----------|--------|-------|
| `lib/salary-cap/constants.ts` | Exists | Sport-specific startup cap, cap growth, contract years, rollover max by sport |
| `lib/salary-cap/types.ts` | Exists | `SalaryCapConfig`, `ContractStatus`, `ContractSource`, `SalaryCapMode` |
| `lib/salary-cap/SalaryCapLeagueConfig.ts` | Exists | `getSalaryCapConfig`, `upsertSalaryCapConfig` — creates DB row after league creation |
| `lib/salary-cap/AuctionStartupService.ts` | Exists | Auction startup engine for salary cap drafts |
| `lib/salary-cap/ContractLifecycleService.ts` | Exists | Contract CRUD operations |
| `lib/salary-cap/FranchiseTagService.ts` | Exists | Franchise tag workflows (not fully wired) |
| `lib/salary-cap/DeadMoneyService.ts` | Exists | Dead money calculations (not fully wired) |
| `lib/league/format-engine.ts` | Exists | `salary_cap` format registered, `draftTypes: ['auction']` enforced |
| `lib/draft-types/draftTypeRegistry.ts` | Exists | `DRAFT_TYPES_BY_LEAGUE_FORMAT.salary_cap = ['auction']` |
| Prisma schema | Exists | `SalaryCapLeagueConfig`, `SalaryCapTeamLedger`, `PlayerContract`, `SalaryCapEventLog`, `SalaryCapLotteryResult` |

### What Was Missing (fixed in Phase 1)

| Gap | Fix |
|-----|-----|
| No `salaryCapDefaults.ts` | Created `lib/league-concepts/salaryCapDefaults.ts` |
| No salary cap seeds in `conceptPresetCatalog.ts` | Added NFL + NCAAF seeds |
| No salary cap branch in `resolveConceptPreset.ts` | Wired `buildSalaryCapSettingsSnapshot` + `normalizeSalaryCapSettingsSnapshot` |
| `salaryCurve` wizard field not persisted | Now seeded in settings snapshot as `salary_curve` / `salaryCurve` |
| `maxSalary` / `minSalary` wizard fields not mapped | Now seeded in settings snapshot as `max_salary` / `min_salary` |
| No canonical defaults test coverage | `__tests__/salary-cap-defaults-nfl-ncaaf.test.ts` — 49 tests |

---

## Files Changed

| File | Change |
|------|--------|
| `lib/league-concepts/salaryCapDefaults.ts` | **NEW** — canonical Phase 1 defaults |
| `lib/league-concepts/conceptPresetCatalog.ts` | Added NFL + NCAAF `salary_cap` seeds |
| `lib/league-concepts/resolveConceptPreset.ts` | Wired salary cap into `buildSettingsSnapshot`, `resolveConceptPreset`, `mergeConceptPresetSettings` |
| `__tests__/salary-cap-defaults-nfl-ncaaf.test.ts` | **NEW** — 49 tests |
| `docs/salary-cap-defaults-nfl-ncaaf-audit.md` | **NEW** — this doc |

---

## Final NFL Salary Cap Defaults

```
sport:                          NFL
league_type:                    salary_cap
salary_cap_enabled:             true
cap_phase:                      setup
draft_type:                     auction
teams:                          12
scoring_preset_id:              fb_half_ppr

Roster:
  QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, K: 1, DST: 1  (9 starters)
  bench_slots:                  7
  ir_slots:                     2
  taxi_slots:                   0

Player pool:                    nfl_active_fantasy_players
Queue limit:                    60
Ranking source:                 auction_values_adp_fallback

Cap Settings:
  total_cap:                    200
  auction_budget_per_team:      200
  max_salary:                   100
  min_salary:                   1
  salary_curve:                 linear
  default_contract_years:       1
  max_contract_years:           4
  cap_growth_percent:           5
  auction_holdback:             50

Franchise tag:
  franchise_tag_enabled:        true
  franchise_tag_limit:          1

Dead money:
  dead_money_enabled:           true
  dead_money_pct:               0.5

Cap rollover:
  cap_rollover_enabled:         true
  cap_rollover_max:             25

Cap floor:
  cap_floor_enabled:            true
  cap_floor_pct:                0.75

Trade cap:
  trade_cap_validation_enabled: true
  commissioner_cap_override:    true

Automation statuses (all pending Phase 2):
  contract_system_status:       pending
  salary_ledger_status:         pending
  dead_money_ledger_status:     pending
  contract_extension_status:    pending
  franchise_tag_status:         pending
  offseason_phase:              setup

Tabs:
  salary_cap:                   enabled
  auction_draft:                enabled
  contracts:                    pending (visible, labeled "coming soon")
  overview, teams, rosters,
  standings, matchups, waivers,
  trade_center, settings:       enabled
  commissioner_tools:           commissioner-only
```

---

## Final NCAAF Salary Cap Defaults

```
sport:                          NCAAF
league_type:                    salary_cap
salary_cap_enabled:             true
cap_phase:                      setup
draft_type:                     auction
teams:                          12
scoring_preset_id:              ncaaf_half_ppr

Roster:
  QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, K: 1, DEF: 1  (9 starters)
  bench_slots:                  7
  ir_slots:                     2
  taxi_slots:                   0

Player pool:                    ncaaf_active_college_fantasy_players
Queue limit:                    70
Ranking source:                 ncaaf_auction_values_adp_fallback

Cap Settings:
  total_cap:                    200
  auction_budget_per_team:      200
  max_salary:                   100
  min_salary:                   1
  salary_curve:                 linear
  default_contract_years:       1
  max_contract_years:           3        (shorter — college careers)
  cap_growth_percent:           0        (NCAAF resets seasonally)
  auction_holdback:             50

Franchise tag:
  franchise_tag_enabled:        false    (not realistic for college)
  franchise_tag_limit:          0

Dead money:
  dead_money_enabled:           false    (pending contract system)

Cap rollover:
  cap_rollover_enabled:         false    (NCAAF cap resets each season)
  cap_rollover_max:             0

Cap floor:
  cap_floor_enabled:            true
  cap_floor_pct:                0.75

Trade cap:
  trade_cap_validation_enabled: true
  commissioner_cap_override:    true

Automation statuses (all pending Phase 2):
  [same as NFL — all pending]
```

---

## Auction Behavior

- Salary cap is **always auction**. Snake/linear drafts are rejected by `normalizeSalaryCapDraftType` and enforced by `normalizeSalaryCapSettingsSnapshot`.
- `auction_budget_per_team` equals `total_cap` (200 for both NFL and NCAAF).
- Nomination order enabled, bid validation enabled, min bid enforces `min_salary`.
- Max bid validates against `max_salary` and remaining roster slots.
- Mock auction does not mutate real salary/contract ledger (`doesNotMutateRealSalaries: true`).
- Offline auction persists commissioner-entered bids when `offline_mode_enabled`.
- Auto auction respects budget (`budgetValidationEnabled: true`).

---

## Contract / Dead Money / Cap Rollover Defaults

All contract-system automation is **pending Phase 2**. The `SalaryCapLeagueConfig` DB row (created by `upsertSalaryCapConfig` after league creation) has its own defaults from `lib/salary-cap/constants.ts`. The settings snapshot (from this file) seeds `League.settings` only. Both sources are required for a complete salary cap league.

**Guardrails enforced by normalizer:**
- `dynasty`, `keeper_enabled`, `devy`, `taxi`, `best_ball`, `guillotine`, `survivor`, `tournament` — always `false`
- `dynasty_carryover`, `full_roster_carryover`, `future_rookie_picks` — always `false`
- `contract_system_status`, `salary_ledger_status`, `dead_money_ledger_status` — always `'pending'`

---

## Tests Run (Phase 1)

| Suite | Tests | Result |
|-------|-------|--------|
| `salary-cap-defaults-nfl-ncaaf.test.ts` | 49 | PASS |
| `survivor-phase2-engines.test.ts` | 24 | PASS |
| TypeScript `tsc --noEmit` | — | PASS (no new errors) |

---

## Phase 2 Remaining Work

1. **Contract ledger** — player salary records created from auction result
2. **Salary assignment on draft pick** — `auctionResultCreatesContractRecord` pending
3. **Dead money ledger** — release/cut workflows writing dead money entries
4. **Release/buyout workflows** — release penalty calculation and cap hit
5. **Franchise tag workflow** — commissioner assigns tag, validates limit
6. **Contract extension workflow** — `contractExtensionsEnabled` currently `false`
7. **Cap validation on trades** — `tradeCapValidationStatus: 'pending'`
8. **Cap validation on waivers** — FAAB + cap space cross-validation
9. **Offseason salary rollover** — carry unused cap space to next season
10. **Contract expiration processing** — expire year-1 contracts at season end
11. **Salary-cap dashboard UI polish** — cap space breakdown, team ledger view
12. **Commissioner cap adjustment UI** — manual override with audit log
13. **Auction value import / AI recommendations** — seed auction values from `cap_advisor` AI feature
14. **Franchise tag status → 'active'** — after tag workflow is complete
15. **Contract system status → 'active'** — after ledger and release workflows are live
16. **NCAAF multi-year contracts** — currently `maxContractYears: 3`; validate if product wants shorter
