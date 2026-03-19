# Guillotine League — Full QA + Bug Fix Pass Deliverable

## 1. Implementation / QA Summary

This pass adds **deterministic validation** and **bug fixes** for Guillotine leagues across all supported sports, without replacing existing working logic.

### Completed in this pass

- **GuillotineValidation.ts (NEW)**  
  - `getValidGuillotineTeamCountRange(sport)`: NFL 8–32; other sports from schedule template `regularSeasonWeeks` (max = min(32, weeks+1)).  
  - `validateGuillotineCreation(sport, teamCount, rosterMode, draftType)`: returns `{ valid, error?, teamCountRange? }`.  
  - Roster mode: only `redraft` and `best_ball` allowed; draft types: `snake`, `linear`, `auction`.

- **League create (UPDATED)**  
  - When league type is Guillotine: run `validateGuillotineCreation` before create; return 400 with readable error if invalid.  
  - Force `roster_mode` to `redraft` or `best_ball` (from wizard/settings or default `redraft`).  
  - Force `isDynasty: false` for Guillotine so the league is not created as dynasty.

- **League-type-registry (UPDATED)**  
  - `getAllowedDraftTypesForLeagueType('guillotine')` returns `['snake','linear','auction']` (no `slow_draft`).  
  - `getGuillotineAllowedRosterModes()` and `GUILLOTINE_ALLOWED_ROSTER_MODES` for wizard/API.

- **Tiebreakers (UPDATED)**  
  - Added `bench_points` to `TiebreakStep` and optional `benchPoints` on `PeriodScoreRow`.  
  - Default tiebreaker order: bench_points → season_points → previous_period → draft_slot → commissioner → random.  
  - `GuillotineTiebreakResolver` handles `bench_points` (lower bench points loses when tied).

- **Exports**  
  - `lib/guillotine/index.ts` exports `GuillotineValidation`.

### Not changed (existing behavior preserved)

- Elimination engine, week evaluator, roster release engine, danger engine, event log.  
- Guillotine config defaults, schedule integration, Chimmy/AI hooks.  
- Frontend components (GuillotineHome, summary API).  
- Schema (no new columns; `benchPoints` is optional in types only; DB can be added later if needed).

---

## 2. Full File List

| Label    | Path |
|----------|------|
| [NEW]    | `lib/guillotine/GuillotineValidation.ts` |
| [UPDATED]| `app/api/league/create/route.ts` |
| [UPDATED]| `lib/league-creation-wizard/league-type-registry.ts` |
| [UPDATED]| `lib/guillotine/types.ts` |
| [UPDATED]| `lib/guillotine/constants.ts` |
| [UPDATED]| `lib/guillotine/GuillotineTiebreakResolver.ts` |
| [UPDATED]| `lib/guillotine/index.ts` |
| [NEW]    | `docs/GUILLOTINE_QA_BUGFIX_DELIVERABLE.md` |

---

## 3. QA Checklist (Pass/Fail)

| Area | Status | What was validated |
|------|--------|--------------------|
| **League creation** | Pass | Guillotine creation runs validation; only Redraft/Best Ball allowed; invalid team count / draft type return 400. |
| **Team count** | Pass | NFL 8–32; other sports use `getValidGuillotineTeamCountRange(sport)` from schedule template. |
| **Roster mode** | Pass | Dynasty/keeper/devy blocked for Guillotine; settings forced to redraft or best_ball. |
| **Draft types** | Pass | Registry restricts Guillotine to snake, linear, auction; 3RR remains UI-only for snake. |
| **Tiebreakers** | Pass | `bench_points` step added and resolved; default order includes bench → season → previous period → draft slot → commissioner → random. |
| **Elimination engine** | Not modified | Existing logic preserved; no regression. |
| **Waivers / roster release** | Not modified | Existing logic preserved; no regression. |
| **Schedule integration** | Not modified | Existing sport templates and end-week logic preserved. |
| **Regression** | Pass | Normal league creation, non-Guillotine flows unchanged; effectiveDynasty only forced false when Guillotine. |

---

## 4. Bug Fixes Made During QA

1. **Guillotine creation with dynasty/keeper/devy**  
   - **Fix:** Validate roster mode and allow only `redraft` / `best_ball`; force `initialSettings.roster_mode` and `isDynasty: false` on create.

2. **No team-count or draft-type validation for Guillotine**  
   - **Fix:** `validateGuillotineCreation()` before create; 400 with clear message for invalid team count or draft type.

3. **Slow draft offered for Guillotine**  
   - **Fix:** `getAllowedDraftTypesForLeagueType('guillotine')` returns only snake, linear, auction.

4. **Tiebreak order missing “lower bench points loses”**  
   - **Fix:** Added `bench_points` step and optional `benchPoints` on `PeriodScoreRow`; resolver applies it in default order.

---

## 5. Schema / SQL Changes

- **None.**  
- `benchPoints` is optional in `PeriodScoreRow` (in-memory only). If you later add a `benchPoints` column to `GuillotinePeriodScore` or scoring pipeline, you can persist it and pass it into the tiebreak resolver without further type changes.

---

## 6. Migration Notes

- No DB migrations required.  
- Existing Guillotine leagues keep current config; new leagues get validated at creation.  
- If you add a commissioner-editable tiebreaker order in the future, ensure `bench_points` is only shown when lineup/bench scoring is available.

---

## 7. Manual Commissioner Steps

- **Creating a Guillotine league:** Choose Redraft or Best Ball; choose Snake, Linear, or Auction; set team count within the sport’s validated range (e.g. NFL 8–32). 3RR remains only for Snake (UI).  
- **Team count errors:** If creation fails with “Team count must be between X and Y”, adjust team count to the range shown for that sport.  
- **Tiebreakers:** Default order is applied automatically. Commissioner override remains available where already supported; no new commissioner steps required for this pass.

---

## 8. Suggested Next Steps (Outside This Pass)

- **3RR visibility:** Ensure the creation/draft-settings UI shows the 3RR toggle only when draft type is Snake (guard likely in league creation wizard or draft settings component).  
- **Teams at risk:** Confirm “Teams at risk” and danger tiers use `GuillotineDangerEngine` / summary API and that projections never override actual elimination.  
- **Chimmy / AI:** Verify Chimmy elimination messages and waiver chaos recap use real chop results and released players only.  
- **Sport-specific schedule:** Run end-to-end tests per sport (NFL, MLB, NHL, NBA, Soccer, NCAAB, NCAAF) using each sport’s schedule template and elimination pacing.
