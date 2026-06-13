# C2C (Campus-to-Canton) Defaults — NFL + NCAAF Audit

## What Was Found

### Already Implemented (pre-Phase 1)

| Component | Status | Notes |
|-----------|--------|-------|
| `lib/merged-devy-c2c/constants.ts` | Exists | Pro lineup, college lineup, bench/IR/taxi sizes, draft rounds — all authoritative constants |
| `lib/merged-devy-c2c/types.ts` | Exists | `C2CSportAdapterId`, `getC2CAdapterForSport`, `StartupFormat`, `StandingsModel`, `C2CDraftPhase`, `C2CCommissionerSettings` |
| `lib/merged-devy-c2c/` (services) | Exists | `C2CLeagueService`, `C2CTransferService`, `C2CIdentityService`, `C2CPlayerPoolService` |
| `lib/c2c/` | Exists | Scoring engines, roster engines, draft engine foundations |
| Prisma schema | Exists | `C2CLeagueConfig`, `C2CCollegeRoster`, `C2CProRoster`, `C2CDraftPick`, `C2CPlayerMapping`, `C2CPromotionEvent`, `C2CStandingsEntry` |
| Draft type registry | Exists | `c2c_snake`, `c2c_linear`, `c2c_auction` all registered in `draftTypeRegistry.ts` |
| Existing beta NCAAF preset | Existed | `af:v2|concept=c2c|sport=NCAAF|scoring=ncaaf_c2c_ppr|draft=snake` — beta_only, `['snake', 'linear']` only |

### What Was Missing (fixed in Phase 1)

| Gap | Fix |
|-----|-----|
| No `c2cDefaults.ts` | Created `lib/league-concepts/c2cDefaults.ts` |
| No NFL C2C preset | Added NFL C2C seed (launch_ready, public) |
| Old NCAAF C2C preset was beta with wrong draft type aliases | Replaced with `ncaaf_half_ppr` scoring, `['c2c_snake', 'c2c_linear', 'c2c_auction', ...]`, launch_ready |
| No C2C branch in `resolveConceptPreset.ts` | Wired `buildC2CSettingsSnapshot` + `normalizeC2CSettingsSnapshot` |
| No C2C wiring in `mergeConceptPresetSettings` | Added C2C block |
| No test coverage | `__tests__/c2c-defaults-nfl-ncaaf.test.ts` — 103 tests |
| Duplicate NFL salary_cap seed in catalog | Removed stub (lines 311–329); canonical seed retained at bottom |

---

## Files Changed

| File | Change |
|------|--------|
| `lib/league-concepts/c2cDefaults.ts` | **NEW** — canonical Phase 1 defaults |
| `lib/league-concepts/conceptPresetCatalog.ts` | Added NFL C2C seed; replaced NCAAF beta with launch_ready; removed duplicate salary_cap stub |
| `lib/league-concepts/resolveConceptPreset.ts` | Wired C2C into `buildSettingsSnapshot`, ternary normalizer chain, `mergeConceptPresetSettings` |
| `__tests__/c2c-defaults-nfl-ncaaf.test.ts` | **NEW** — 103 tests |
| `docs/c2c-defaults-nfl-ncaaf-audit.md` | **NEW** — this doc |

---

## Sport Mapping

Both NFL and NCAAF C2C leagues use the same underlying adapter:

```
getC2CAdapterForSport('NFL')   → 'nfl_c2c'
getC2CAdapterForSport('NCAAF') → 'nfl_c2c'
```

NFL C2C: pro-first view (NFL starters + NCAAF campus roster)
NCAAF C2C: campus-first view (same engine, same pools, NCAAF primary scoring)

---

## Final NFL C2C Defaults

```
sport:                          NFL
league_type:                    c2c
c2c_enabled:                    true
c2c_adapter_id:                 nfl_c2c
roster_mode:                    c2c
teams:                          12
scoring_preset_id:              fb_half_ppr
college_scoring_preset_id:      ncaaf_half_ppr

Pro (Canton) Roster:
  QB:1, RB:2, WR:2, TE:1, FLEX:2, SUPER_FLEX:1  (9 starters)
  bench_slots:                  12
  ir_slots:                     3
  taxi_slots:                   4
  startup_draft_rounds:         25 (9 starters + 12 bench + 4 taxi)

Campus (College) Roster:
  QB:1, RB:2, WR:3, TE:1, FLEX:2  (9 active)
  college_roster_size:          20
  startup_college_draft_rounds: 6

Draft:
  draft_type (engine core):     snake (for c2c_snake)
  requested_draft_type:         c2c_snake
  timer_seconds:                90
  slow_timer_seconds:           28800
  auction_budget_per_team:      null (200 for c2c_auction)

Draft phases:
  startup_pro_draft:            25 rounds, snake/linear/auction, nfl pro pool
  startup_college_draft:        6 rounds, snake/linear/auction, ncaaf college pool
  rookie_draft:                 4 rounds, linear, reverse standings, future picks tied
  college_draft:                6 rounds, linear, reverse standings, future picks tied
  supplemental_draft:           1 round, commissioner-triggered

C2C settings:
  startup_format:               separate
  standings_model:              hybrid
  hybrid_pro_weight:            0.6
  hybrid_college_weight:        0.4
  rookie_draft_rounds:          4
  college_draft_rounds:         6
  taxi_size:                    4
  promotion_timing:             manager_choice_before_rookie_draft
  return_to_school_handling:    restore_rights

Player pools:
  pro_pool:                     nfl_active_fantasy_players
  college_pool:                 ncaaf_active_college_c2c_players
  rookie_pool:                  nfl_rookie_only
  (pools are phase-aware and isolated — pro pool excludes college, college pool excludes NFL)

Automation statuses (all pending Phase 2):
  promotion_engine_status:      pending
  graduation_processing_status: pending
  identity_linking_status:      pending
  hybrid_standings_status:      pending
  merged_startup_draft_status:  pending
  offseason_phase:              setup

Guardrails (always disabled):
  devy:                         false
  keeper:                       false
  best_ball:                    false
  guillotine:                   false
  survivor:                     false
  tournament:                   false
  salary_cap:                   false
```

---

## Final NCAAF C2C Defaults

```
sport:                          NCAAF
league_type:                    c2c
c2c_enabled:                    true
c2c_adapter_id:                 nfl_c2c  (same adapter — NCAAF campus-first view)
scoring_preset_id:              ncaaf_half_ppr
college_scoring_preset_id:      ncaaf_half_ppr

All other settings:             identical to NFL C2C (same adapter, same roster model,
                                same pool sizes, same draft round counts)
```

---

## Draft Type Resolution

| Input | Normalized | Engine Core | Auction Budget |
|-------|-----------|-------------|----------------|
| `c2c_snake` | `c2c_snake` | `snake` | null |
| `snake` | `c2c_snake` | `snake` | null |
| `c2c_linear` | `c2c_linear` | `linear` | null |
| `linear` | `c2c_linear` | `linear` | null |
| `c2c_auction` | `c2c_auction` | `auction` | 200 |
| `auction` | `c2c_auction` | `auction` | 200 |
| `mock_draft` | `mock_draft` | `snake` | null |
| `mock` | `mock_draft` | `snake` | null |
| `offline` | `offline` | `snake` | null |
| `auto` | `auto` | `snake` | null |
| unknown | `c2c_snake` | `snake` | null (safe default) |

Plain `devy_*` types are not accepted — C2C uses its own pool system independent of devy.

---

## Pool Isolation

The canonical invariant enforced by `validateC2CStructure`:
- **Pro pool** (`nfl_active_fantasy_players`) → `includeCollegePlayers: false`, `excludeCollegePool: true`
- **College pool** (`ncaaf_active_college_c2c_players`) → `includeNflPlayers: false`, `excludeNflPool: true`, `excludeGraduatedPlayers: true`
- **Rookie pool** (`nfl_rookie_only`) → `rookieOnly: true`, current-season NFL rookies only

C2C explicitly separates college from pro player identification. This is different from devy (which uses `af_ncaaf_devy_players` — the same college player identity mapped to a different pipeline). C2C uses `C2CPlayerMapping` DB records to link a college player's identity to their eventual NFL player record upon graduation.

---

## Devy vs C2C — Mutual Exclusion

| Feature | Devy | C2C |
|---------|------|-----|
| College pool | `af_ncaaf_devy_players` | `ncaaf_active_college_c2c_players` |
| Draft types | `devy_snake`, `devy_linear`, `devy_auction` | `c2c_snake`, `c2c_linear`, `c2c_auction` |
| Roster model | Single roster + devy slots | Dual roster (pro + campus) |
| Standings | Pro-only (dynasty) | Hybrid (pro 60% + campus 40%) |
| Promotion | N/A | Promotion engine (pending) |
| Settings flag | `devy_enabled: true` | `c2c_enabled: true` |

In C2C defaults, `disabledSettings.devy = false` (meaning devy is not active). In devy defaults, `disabledSettings.c2c = false`. They are mutually exclusive at league level.

---

## Tabs Enabled

| Tab | Status |
|-----|--------|
| overview, teams | enabled |
| canton_roster | enabled |
| campus_roster | enabled |
| rosters, roster | enabled |
| taxi, future_picks | enabled |
| standings, matchups, schedule | enabled |
| startup_pro_draft | enabled |
| startup_college_draft | enabled |
| college_draft, rookie_draft | enabled |
| live_draft, waivers, free_agents | enabled |
| trade_center, trades, scoring | enabled |
| settings | commissioner-only |
| commissioner_tools | commissioner-only |
| mock_draft | enabled (if mock_draft type) / pending otherwise |
| promotion_center | pending (Phase 2) |
| hybrid_standings | pending (Phase 2) |

---

## Tests Run (Phase 1)

| Suite | Tests | Result |
|-------|-------|--------|
| `c2c-defaults-nfl-ncaaf.test.ts` | 103 | PASS |
| `salary-cap-defaults-nfl-ncaaf.test.ts` | 49 | PASS |
| `survivor-phase2-engines.test.ts` | 24 | PASS |
| TypeScript `tsc --noEmit` (c2c files) | — | PASS (no new errors) |

---

## Phase 2 Remaining Work

1. **Promotion engine** — `C2CPromotionEvent` records created when manager promotes a college player to pro roster
2. **Graduation processing** — college players who declare for the NFL draft are flagged, rights return to the manager
3. **Identity linking** — `C2CPlayerMapping` DB rows linking ncaaf player identity to NFL player identity on declaration
4. **Hybrid standings engine** — weighted (60/40) standings calculation combining pro and campus scores each week
5. **Merged startup draft** — `startup_format: 'merged'` alternate flow (single combined draft of pro + college players in one queue)
6. **College FAAB processing** — separate college free agent budget runs independent of pro FAAB
7. **Return-to-school handling** — player returns to school, manager retains rights for the following season
8. **Early declare behavior** — commissioner approval flow for early declarations
9. **Max promotions per year limit** — optional cap on how many players can be promoted in a single offseason
10. **College IDP** — `c2cCollegeExcludeKDST: true` is enforced; if K/DST is ever needed for college side, separate flag
11. **Hybrid standings tiebreaker** — `hybridChampionshipTieBreaker: 'pro_first'` needs playoff bracket wiring
12. **NBA C2C** — `nba_c2c` adapter exists in types but no preset or defaults yet; separate Phase
13. **C2C mock draft** — `doesNotMutateCollegeAssets: true` and `doesNotMutateRookiePicks: true` need Phase 2 enforcement
14. **Supplemental draft flow** — commissioner-triggered, commissioner-pick-entry, wired in Phase 2
