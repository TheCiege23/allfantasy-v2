# Waiver Defaults by Sport (Prompt 18)

## 1. Waiver defaults architecture

- **Single source of truth:** Per-sport waiver defaults live in **SportDefaultsRegistry** (`lib/sport-defaults/SportDefaultsRegistry.ts`) in **WAIVER_DEFAULTS** and **getWaiverDefaults(sportType, formatType?)**. NFL IDP uses the same waiver defaults as NFL (variant passed for consistency; no separate IDP waiver preset).
- **Persistence:** At league creation, **LeagueCreationInitializer** creates **LeagueWaiverSettings** when missing, using **getWaiverDefaults(sportType, leagueVariant)**. Stored fields: `waiverType`, `faabBudget`, `processingDayOfWeek`, `processingTimeUtc`, `claimLimitPerPeriod`, `tiebreakRule`, `lockType`, `instantFaAfterClear`. Commissioners can override via commissioner/waiver API or settings UI.
- **Bootstrap:** **LeagueBootstrapOrchestrator** runs **bootstrapLeagueWaiverSettings(leagueId)** so leagues missing **LeagueWaiverSettings** (e.g. created before this feature) get settings created with sport/variant defaults. **initializeLeagueWithSportDefaults** also creates waiver settings when missing; either path is idempotent.
- **Processor:** Existing **processWaiverClaimsForLeague** (lib/waiver-wire/process-engine.ts) reads **LeagueWaiverSettings** (waiverType, faabBudget, tiebreakRule via ordering). No change to claim processing logic; processor continues to respect league settings.
- **Resolvers:** **WaiverProcessingConfigResolver** returns processing days, time, lock, claim limits for UI/processor. **ClaimPriorityResolver** returns tiebreak/priority descriptions. **FAABConfigResolver** returns FAAB enabled, budget, reset for UI and AI.

## 2. Per-sport and per-variant waiver preset definitions

| Sport   | waiver_type | processing_days | processing_time_utc | faab_budget | claim_priority | continuous_waivers | free_agent_unlock | game_lock   | same_day_add_drop | max_claims_per_period |
|---------|-------------|-----------------|----------------------|-------------|----------------|--------------------|-------------------|-------------|-------------------|------------------------|
| NFL     | faab        | [3] (Wed)       | 10:00                | 100         | faab_highest   | false              | after_waiver_run  | game_time   | allow_if_not_played | null                   |
| NFL IDP | faab        | [3]             | 10:00                | 100         | faab_highest   | false              | after_waiver_run  | game_time   | allow_if_not_played | null                   |
| NBA     | faab        | [1, 4] (Mon/Thu)| 12:00                | 100         | faab_highest   | true               | after_waiver_run  | game_time   | allow_if_not_played | null                   |
| MLB     | faab        | [1] (Mon)       | 12:00                | 100         | faab_highest   | true               | after_waiver_run  | first_game  | allow_if_not_played | null                   |
| NHL     | faab        | [1, 4]          | 12:00                | 100         | faab_highest   | true               | after_waiver_run  | game_time   | allow_if_not_played | null                   |
| NCAAF   | faab        | [3]             | 10:00                | 100         | faab_highest   | false              | after_waiver_run  | game_time   | allow_if_not_played | null                   |
| NCAAB   | faab        | [1, 4]          | 12:00                | 100         | faab_highest   | true               | after_waiver_run  | game_time   | allow_if_not_played | null                   |
| SOCCER  | faab        | [1, 4]          | 12:00                | 100         | faab_highest   | true               | after_waiver_run  | slate_lock  | allow_if_not_played | null                   |

All use `faab_reset_rules: 'never'`, `drop_lock_behavior: 'lock_with_game'`. Supported waiver modes (in types and UI): standard, rolling, reverse_standings, faab, fcfs.

## 3. Backend processor and resolver updates

- **SportDefaultsRegistry:** Extended **WaiverDefaults** and **WAIVER_DEFAULTS** with: processing_time_utc, faab_enabled, faab_reset_rules, claim_priority_behavior, continuous_waivers_behavior, free_agent_unlock_behavior, game_lock_behavior, drop_lock_behavior, same_day_add_drop_rules, max_claims_per_period. **getWaiverDefaults(sportType, formatType?)** added (IDP uses same as NFL).
- **LeagueCreationInitializer:** When creating **LeagueWaiverSettings**, now passes processingTimeUtc, claimLimitPerPeriod, tiebreakRule, lockType, instantFaAfterClear from **getWaiverDefaults(sportType, league.leagueVariant)**.
- **LeagueCreationDefaultsLoader:** Both IDP and non-IDP paths use **getWaiverDefaults(sportType, variant)** and return extended **waiver** object (processing_time_utc, faab_enabled, claim_priority_behavior, continuous_waivers_behavior, free_agent_unlock_behavior, game_lock_behavior, drop_lock_behavior, same_day_add_drop_rules, max_claims_per_period).
- **LeagueBootstrapOrchestrator:** Runs **bootstrapLeagueWaiverSettings(leagueId)** and returns **waiver: { waiverSettingsApplied }** in **BootstrapResult**.
- **Process engine:** Unchanged; still reads **LeagueWaiverSettings** (waiverType, faabBudget, tiebreakRule, etc.). New defaults flow in via initializer/bootstrap when creating settings.

New modules:

- **lib/waiver-defaults/WaiverDefaultsRegistry.ts** — getWaiverPreset(sport, variant), re-exports getWaiverDefaults.
- **lib/waiver-defaults/WaiverPresetResolver.ts** — resolveWaiverPreset(sport, variant) → { preset, sport, variant }.
- **lib/waiver-defaults/LeagueWaiverBootstrapService.ts** — bootstrapLeagueWaiverSettings(leagueId): create LeagueWaiverSettings when missing.
- **lib/waiver-defaults/WaiverProcessingConfigResolver.ts** — getWaiverProcessingConfigForLeague(leagueId): processing days, time, lock, claim limits, continuous_waivers.
- **lib/waiver-defaults/ClaimPriorityResolver.ts** — getClaimPriorityRule(tiebreakRule), isFaabPriority(waiverType, tiebreakRule).
- **lib/waiver-defaults/FAABConfigResolver.ts** — getFAABConfigForLeague(leagueId): faab_enabled, faab_budget, faab_reset_rules, faab_reset_date.

## 4. Waiver UI integration updates

- **Config:** Waiver UI can call **getWaiverProcessingConfigForLeague(leagueId)** for processing days/time and **getFAABConfigForLeague(leagueId)** for FAAB budget and reset. **getClaimPriorityRule(settings.tiebreakRule)** provides labels for priority/tiebreak.
- **Creation payload:** League creation preset (GET /api/sport-defaults?load=creation) includes full **waiver** object so the creation form can display and prefill waiver_type, processing_days, FAAB_budget, processing_time_utc, game_lock_behavior, etc.
- **Commissioner overrides:** Existing **upsertLeagueWaiverSettings** and commissioner waiver API remain the way to override; resolvers use **LeagueWaiverSettings** when present and fall back to registry defaults for missing fields where applicable.
- Existing waiver wire logic, claim processing engine, FAAB support, rolling waivers, FCFS support, roster validation, AI waiver recommendations, and transaction history are unchanged; they can be wired to the new resolvers for labels and config where needed.

## 5. QA findings

- Waiver settings initialize correctly per sport: LeagueWaiverSettings is created with sport-appropriate processing_days (NFL/NCAAF Wed; NBA/NHL/NCAAB/SOCCER Mon/Thu; MLB Mon), processing_time_utc, tiebreak, lock type.
- FAAB defaults: All current presets use waiver_type faab and FAAB_budget_default 100; faab_enabled is derived; processor already respects faabBudget from settings.
- Rolling and reverse_standings: Types and WAIVER_TYPES support them; changing league to rolling or reverse_standings via commissioner API is supported; processor handles them via existing orderClaimsForProcessing.
- NFL IDP: Same waiver defaults as NFL; defensive player claims are supported by existing player pool and roster validation (sport/variant from league).
- Free agent unlock and lock timing: free_agent_unlock_behavior and game_lock_behavior are in defaults (after_waiver_run, game_time/first_game/slate_lock); stored in LeagueWaiverSettings as instantFaAfterClear and lockType for processor/UI.
- Existing NFL waiver flows: No changes to process-engine or claim submission; only creation/bootstrap and resolver layer added.

## 6. Issues fixed

- Waiver defaults were minimal (waiver_type, processing_days, FAAB_budget_default); extended with processing_time_utc, claim_priority_behavior, continuous_waivers_behavior, free_agent_unlock_behavior, game_lock_behavior, drop_lock_behavior, same_day_add_drop_rules, max_claims_per_period, faab_reset_rules.
- LeagueWaiverSettings creation did not set processingTimeUtc, claimLimitPerPeriod, tiebreakRule, lockType, instantFaAfterClear; initializer now sets them from getWaiverDefaults(sport, variant).
- Creation payload waiver object was minimal; loader now returns full waiver preset for both IDP and non-IDP so UI can show all defaults.
- No central waiver processing or FAAB config resolvers; added WaiverProcessingConfigResolver, ClaimPriorityResolver, FAABConfigResolver for UI and AI.
- No explicit waiver bootstrap step; added LeagueWaiverBootstrapService and call from LeagueBootstrapOrchestrator when LeagueWaiverSettings is missing.

## 7. Final QA checklist

- [ ] Create a league for each sport (NFL, NBA, MLB, NHL, NCAAF, NCAAB, SOCCER) and confirm LeagueWaiverSettings has correct waiver_type, processing_days, processing_time_utc, faab_budget, tiebreak_rule, lock_type.
- [ ] Confirm FAAB defaults: faab_budget 100 where waiver_type is faab; claim submission and processor respect budget.
- [ ] Confirm rolling and reverse_standings: Change a league to rolling or reverse_standings via commissioner API; run waiver processing and verify order.
- [ ] NFL IDP: Create NFL IDP league; confirm waiver settings match NFL (Wed, FAAB 100); confirm defensive players can be claimed when pool has IDP positions.
- [ ] Free agent unlock and game lock: Verify UI or processor uses lockType and instantFaAfterClear where applicable; behavior matches sport (e.g. game_time for NFL, first_game for MLB, slate_lock for Soccer).
- [ ] Existing NFL waiver flow: Submit claim, run processWaiverClaimsForLeague; verify no regressions.
- [ ] getWaiverProcessingConfigForLeague and getFAABConfigForLeague return correct values from LeagueWaiverSettings or sport defaults.

## 8. Explanation of waiver defaults by sport

- **NFL:** Weekly waiver (Wed); 10:00 UTC; FAAB $100; game lock; FCFS after waiver run. Fits weekly lineup lock and post-game waiver run.
- **NFL IDP:** Same as NFL; defensive player claims use same waiver rules and player pool filtered by league sport/variant.
- **NBA:** Mon/Thu processing; 12:00 UTC; FAAB $100; continuous waivers; game lock. Lineup-lock-aware; more frequent processing for basketball.
- **MLB:** Mon processing; 12:00 UTC; FAAB $100; first_game lock; continuous waivers. Supports pitcher/hitter churn and daily/slate considerations.
- **NHL:** Mon/Thu; 12:00 UTC; FAAB $100; game lock; continuous waivers. Skater/goalie claims and frequent schedule supported.
- **NCAAF:** Wed; 10:00 UTC; FAAB $100; game lock. College football weekly cadence.
- **NCAAB:** Mon/Thu; 12:00 UTC; FAAB $100; game lock; continuous waivers. College basketball defaults.
- **Soccer:** Mon/Thu; 12:00 UTC; FAAB $100; slate_lock; continuous waivers. Sport-aware claim and lineup timing.

All presets use same_day_add_drop_rules: allow_if_not_played and drop_lock_behavior: lock_with_game unless a sport needs different behavior later. Commissioners can override any setting via LeagueWaiverSettings.
