# CURSOR PROMPT 1 OF 5 — MASTER INSTRUCTIONS + DYNASTY PRODUCT DEFINITION

## Implementation Plan (No Code — Planning Only)

---

## 1. IMPLEMENTATION PLAN

### 1.1 Objective

Build a **Dynasty core settings layer** that:

- Serves as the single source of truth for long-term league behavior (roster, scoring, playoff, taxi, draft order, automation/AI boundaries).
- **Devy** and **Merged Devy / C2C** inherit from this layer and add only devy-specific and C2C-specific options (devy slots, college roster, promotion rules, etc.).
- Keeps league creation and commissioner settings deterministic first; AI explains and advises, never enforces.

### 1.2 High-Level Phases

| Phase | Scope | Outcome |
|-------|--------|---------|
| **1 – Dynasty core engine** | Define and resolve “Dynasty settings” from existing League.settings + optional new store; no duplicate logic. | One shared resolver/service that returns dynasty league settings, roster defaults, playoff defaults, taxi defaults. Devy/C2C configs overlay on top. |
| **2 – Dynasty league settings** | League-level toggles (roster mode, trade deadline, tiebreakers, etc.) that apply to all dynasty-like leagues. | Same settings surface for pure dynasty and for devy/C2C; Devy/C2C panels show “Dynasty base” + their own section. |
| **3 – Dynasty roster settings** | Roster slots, starter/bench/IR/taxi counts, flex rules—backed by existing LeagueRosterConfig + RosterTemplate. | Clear inheritance: Dynasty defaults → Devy adds devy slots/taxi rules → C2C adds college roster. |
| **4 – Dynasty scoring settings** | Scoring presets and overrides—backed by existing ScoringTemplate, LeagueScoringOverride, bootstrap. | Dynasty scoring resolver; Devy/C2C scoring presets (existing) continue to reference or extend dynasty defaults. |
| **5 – Dynasty playoff settings** | Playoff teams, bracket, seeding, tiebreakers—backed by League.settings + playoff-defaults. | Single playoff config resolver that dynasty/devy/C2C all use; variant can adjust only where allowed. |
| **6 – Devy positions/settings** | Devy slot count, devy draft rounds, eligibility, promotion timing—already in DevyLeagueConfig. | Expose as “Devy overlay” in UI; validation that devy settings are consistent with dynasty base (e.g. taxi size). |
| **7 – C2C positions/settings** | College roster, pro/college lineup, standings model, promotion—already in C2CLeagueConfig. | Expose as “C2C overlay”; inherit dynasty playoff/roster defaults where applicable. |
| **8 – Taxi positions and rules** | Taxi slot count, taxi eligibility, taxi scoring (best ball), lock rules. | Single source: Dynasty default taxi size/rules; DevyLeagueConfig.taxiSize / C2CLeagueConfig.taxiSize override. Validation and roster guards use this. |
| **9 – Automation & AI boundaries** | What automation (e.g. draft order, waiver) and AI (e.g. trade explain, orphan AI) are allowed per league type. | Documented boundaries; optional flags in League.settings or config; AI/automation services check before acting. |
| **10 – QA and delivery** | Full pass: creation, settings panels, draft order, playoff, scoring, roster, devy/C2C flows. | QA checklist; bug fixes; final deliverable. |

### 1.3 Design Principles

- **Do not restart or replace** existing systems: League.settings, DevyLeagueConfig, C2CLeagueConfig, playoff-defaults, roster/scoring bootstrap, specialty league registry.
- **Merge and extend**: Add a “Dynasty core” resolver that reads from League + (when present) Devy/C2C config and exposes a unified shape. Devy and C2C UIs show “Dynasty base” + “Devy/C2C” sections.
- **Deterministic first**: All roster, scoring, playoff, and draft-order logic remains deterministic; AI is advisory only.
- **Inheritance**: Devy = Dynasty + devy slots + devy draft + promotion. C2C = Dynasty + college roster + pro/college lineups + promotion + standings model. Taxi and playoff base come from Dynasty.

---

## 2. ARCHITECTURE MAP

### 2.1 Current Architecture (Relevant Parts)

```
League (Prisma)
├── isDynasty, leagueVariant, settings (JSON)
├── devyConfig? → DevyLeagueConfig
├── c2cConfig?  → C2CLeagueConfig
├── (no DynastyLeagueConfig; “dynasty” implied by isDynasty + settings)
│
League.settings (current keys used for dynasty-like behavior)
├── roster_mode, playoff_team_count, playoff_structure
├── regular_season_length, schedule_*, waiver_mode, trade_review_mode
├── standings_tiebreakers, lock_time_behavior, injury_slot_behavior
├── superflex, te_premium, best_ball, etc. (feature flags validated by sport)
│
DevyLeagueConfig (when leagueVariant = devy_dynasty)
├── devySlotCount, taxiSize, rookieDraftRounds, devyDraftRounds
├── rookiePickOrderMethod, devyPickOrderMethod, promotionTiming, …
│
C2CLeagueConfig (when leagueVariant = merged_devy_c2c)
├── collegeRosterSize, collegeActiveLineupSlots, taxiSize
├── rookieDraftRounds, collegeDraftRounds, standingsModel, …
│
Bootstrap / Resolvers
├── LeagueDefaultSettingsService → getDefaultLeagueSettings(sport)
├── DefaultPlayoffConfigResolver (sport-defaults)
├── PlayoffBracketConfigResolver, LeaguePlayoffBootstrapService
├── attachRosterConfigForLeague, getRosterTemplate, LeagueRosterConfig
├── bootstrapLeagueScoring, ScoringTemplate, LeagueScoringOverride
├── buildSettingsPreview, getInitialSettingsForCreation (creation)
└── LeagueSettingsValidator (devy/c2c rounds, auction budget, etc.)
```

### 2.2 Target Architecture (After Implementation)

```
Dynasty Core Layer (NEW – logical layer)
├── DynastySettingsService (or DynastyCoreResolver)
│   ├── getDynastySettings(leagueId) → union of League.settings (dynasty slice) + Devy/C2C overlay when present
│   ├── getDynastyRosterDefaults(leagueId) → from LeagueRosterConfig + template; taxi from Devy/C2C or settings
│   ├── getDynastyPlayoffDefaults(leagueId) → from League.settings + DefaultPlayoffConfigResolver
│   └── getDynastyScoringDefaults(leagueId) → from bootstrap/scoring template + overrides
│
├── Optional: DynastyLeagueConfig table (only if we want explicit storage for “pure” dynasty)
│   └── If omitted: continue using League.settings with a documented “dynasty” key contract
│
Devy Layer (EXISTING – extend)
├── DevyLeagueConfig unchanged
├── Devy settings panel: “Dynasty base” (from DynastySettingsService) + “Devy” (devy slots, draft, promotion)
└── Validation: devy slots/taxi/rookie rounds consistent with dynasty base
│
C2C Layer (EXISTING – extend)
├── C2CLeagueConfig unchanged
├── C2C settings panel: “Dynasty base” + “C2C” (college roster, standings, promotion)
└── Validation: college/pro lineup and roster sizes consistent with dynasty base
│
League Creation (EXISTING – extend)
├── When league type = dynasty: set isDynasty, roster_mode = dynasty, apply dynasty defaults from same resolver
├── When league type = devy: set leagueVariant = devy_dynasty, upsertDevyConfig, dynasty defaults first then devy
├── When league type = c2c: set leagueVariant = merged_devy_c2c, upsertC2CConfig, dynasty defaults first then c2c
└── Presets: “Dynasty default”, “Devy default”, “C2C default” all pull from Dynasty core + variant overlay
```

### 2.3 Data Flow

- **Read path**: League → League.settings + (if devy) DevyLeagueConfig + (if c2c) C2CLeagueConfig → **DynastySettingsService** → unified DTO for UI/API.
- **Write path (commissioner)**:
  - Pure dynasty: PATCH League.settings (dynasty keys) and/or optional DynastyLeagueConfig.
  - Devy: PUT /api/leagues/[leagueId]/devy/config (existing); dynasty base can be updated via same Dynasty API or General/Roster/Playoff panels.
  - C2C: PUT /api/leagues/[leagueId]/merged-devy-c2c/config (existing); same as above.
- **Creation**: buildSettingsPreview(sport, variant) already supports roster_mode and overrides; extend so “dynasty” and “devy”/“c2c” presets pull from the same Dynasty core defaults.

---

## 3. REUSABLE FILES / MODULES TO EXTEND

| Area | File(s) | How to reuse / extend |
|------|---------|------------------------|
| **Dynasty detection** | `League.isDynasty`, `leagueVariant`; `lib/devy/DevyLeagueConfig.ts` (`isDevyLeague`), `lib/merged-devy-c2c/C2CLeagueConfig.ts` (`isC2CLeague`) | Add `isDynastyLeague(leagueId)` (isDynasty true or devy/c2c); use in settings tab and resolver. |
| **League settings** | `lib/sport-defaults/LeagueDefaultSettingsService.ts` | Already provides getDefaultLeagueSettings(sport). Dynasty resolver can use it and merge League.settings. |
| **Playoff** | `lib/playoff-defaults/PlayoffBracketConfigResolver.ts`, `LeaguePlayoffBootstrapService.ts`, `lib/sport-defaults/DefaultPlayoffConfigResolver.ts` | Resolvers already sport/variant aware. Dynasty layer calls them; no duplication. |
| **Roster** | `lib/multi-sport/RosterTemplateService.ts`, `LeagueRosterConfig`, `lib/sport-defaults/SportDefaultsRegistry.ts` (ROSTER_DEFAULTS) | getRosterTemplate(sport, format); attachRosterConfigForLeague. Dynasty resolver returns roster defaults; Devy/C2C add taxi/devy slots from their config. |
| **Scoring** | `lib/scoring-defaults/LeagueScoringBootstrapService.ts`, `ScoringTemplate`, `LeagueScoringOverride` | Bootstrap and overrides stay; Dynasty resolver can return “effective” scoring source (template + overrides). |
| **Superflex / TEP** | `League.settings.superflex`, `te_premium`; `lib/league-defaults-orchestrator/LeagueSettingsPreviewBuilder.ts` (CreationOverrides) | Already in creation and settings. Dynasty layer exposes these as part of league settings. |
| **Taxi** | `lib/devy/DevyLeagueConfig.ts` (taxiSize), `lib/devy/constants.ts` (DEFAULT_TAXI_*), `lib/merged-devy-c2c/C2CLeagueConfig.ts` (taxiSize) | Centralize “effective taxi config” in Dynasty resolver: from DevyLeagueConfig or C2CLeagueConfig when present, else from League.settings or sport default. |
| **Devy board / eligibility** | `lib/devy/eligibility/DevyEligibilityService.ts`, `lib/devy/pool/DevyPoolSeparation.ts` | Keep; ensure they read devy slot count and taxi from DevyLeagueConfig / Dynasty resolver. |
| **League creation** | `lib/league-defaults-orchestrator/LeagueDefaultsOrchestrator.ts`, `LeagueSettingsPreviewBuilder.ts`, `app/api/league/create/route.ts` | When variant is dynasty/devy/c2c, ensure initial settings include dynasty defaults (roster_mode, playoff_team_count, etc.) from same source as resolver. |
| **Settings validation** | `lib/league-settings-validation/LeagueSettingsValidator.ts` | Already validates devy rounds, c2c college rounds, auction. Extend for dynasty-specific rules (e.g. taxi max, playoff_team_count range). |
| **Specialty registry** | `lib/specialty-league/registry.ts` | Devy and merged_devy_c2c already registered. Do not add “dynasty” as a specialty; dynasty is the base mode. Optionally add a “dynasty core” capability or label used by devy/c2c. |
| **Settings UI** | `components/app/tabs/LeagueSettingsTab.tsx`, `GeneralSettingsPanel`, `RosterSettingsPanel`, `ScoringSettingsPanel`, `PlayoffSettingsPanel`, `DevySettingsPanel`, `MergedDevyC2CCommissionerSettings` | Add “Dynasty Settings” subtab when isDynasty && !isDevy && !isC2C, or fold “Dynasty base” into Devy/C2C panels as read-only or editable block. |

---

## 4. LIKELY NEW FILES NEEDED

| Purpose | Likely path | Description |
|---------|-------------|-------------|
| **Dynasty settings resolver** | `lib/dynasty-core/DynastySettingsService.ts` or `DynastyCoreResolver.ts` | Aggregates League.settings (dynasty slice) + DevyLeagueConfig/C2CLeagueConfig when present. Returns unified DTO (roster, scoring, playoff, taxi, draft order method, automation/AI boundaries). |
| **Dynasty types** | `lib/dynasty-core/types.ts` | DTOs for dynasty settings, roster defaults, playoff defaults, taxi rules, and (optional) automation/AI flags. |
| **Dynasty settings API** | `app/api/leagues/[leagueId]/dynasty-settings/route.ts` | GET: return effective dynasty settings for league. PUT/PATCH: update League.settings dynasty keys (and optionally validate). Used by Dynasty Settings panel. |
| **Dynasty Settings panel (UI)** | `components/dynasty/DynastySettingsPanel.tsx` | Mobile-first panel: league-level (roster mode, playoff teams, tiebreakers), roster summary, playoff summary, taxi summary (if any), automation/AI toggles. Shown when isDynasty && !isDevy && !isC2C, or as “Dynasty base” in Devy/C2C. |
| **Dynasty creation presets** | Extend `lib/league-defaults-orchestrator` or `lib/sport-defaults` | Optional: `getDynastyCreationDefaults(sport)` used when league type is dynasty/devy/c2c so creation uses same defaults as resolver. |
| **Taxi rules validator** | `lib/dynasty-core/taxiRules.ts` or inside DynastySettingsService | Validate taxi size vs roster template; ensure lineup/roster guards (e.g. existing RosterFitValidation) use effective taxi from Dynasty resolver. |
| **Automation/AI boundaries** | `lib/dynasty-core/automationBoundaries.ts` or in types | Document and optionally enforce which automation (draft order, waiver) and AI (trade explain, orphan AI) are allowed per league type; referenced by AI and automation services. |
| **QA / tests** | `tests/dynasty-settings.test.ts` or under `__tests__` | Unit tests for DynastySettingsService; integration for creation + settings load for dynasty, devy, c2c. |

---

## 5. MIGRATION STRATEGY

- **No breaking changes**: All changes are additive. Existing League.settings, DevyLeagueConfig, and C2CLeagueConfig remain the source of truth; the Dynasty layer is a reader/aggregator plus an optional write path for “pure” dynasty settings.
- **Optional new table**: If product wants explicit “Dynasty league config” (e.g. for Max PF draft order, anti-tank rules), add `DynastyLeagueConfig` (leagueId, rookiePickOrderMethod, useMaxPfForRookieOrder, …) and migrate existing leagues by leaving it null and falling back to League.settings. Otherwise, keep using only League.settings with a documented key set for dynasty.
- **Backfill**: Not required for Phase 1. Leagues with isDynasty true already have settings; resolver merges defaults with existing keys.
- **Devy/C2C**: No migration of DevyLeagueConfig or C2CLeagueConfig; they are extended only by being “overlays” in the resolver and in UI copy ( “Dynasty base” + “Devy/C2C” ).

---

## 6. RISKS / EDGE CASES

| Risk | Mitigation |
|------|------------|
| **Duplicate or conflicting settings** | Dynasty resolver must define a clear precedence: League.settings (dynasty keys) overridden by DevyLeagueConfig/C2CLeagueConfig for overlapping fields (e.g. taxi). Document which keys are “dynasty base” vs “devy/c2c only”. |
| **League created as redraft then switched to dynasty** | If we add a “Convert to dynasty” flow later, it must merge in dynasty defaults without wiping existing settings. For Prompt 1 scope, assume creation-time choice; conversion can be a follow-up. |
| **Sleeper/import dynasty leagues** | Imported leagues may have isDynasty true and different settings shape. Resolver should tolerate missing keys and fall back to sport defaults. |
| **Taxi in pure dynasty** | Today taxi is primarily in DevyLeagueConfig/C2CLeagueConfig. If “pure” dynasty leagues support taxi, add taxi_slots or taxi_size to League.settings (dynasty slice) and have resolver return it when no devy/c2c config. |
| **Rookie draft order / Max PF** | Existing code has rookiePickOrderMethod in DevyLeagueConfig. Max PF / anti-tank may live in League.settings or a future DynastyLeagueConfig. Resolver should expose “rookie draft order method” and “use Max PF” from one place so draft order logic and UI stay consistent. |
| **UI clutter** | Adding “Dynasty Settings” plus existing Roster/Scoring/Playoff could confuse. Prefer: (a) “Dynasty Settings” as a single panel for pure dynasty, or (b) keep Roster/Scoring/Playoff but have them call the Dynasty resolver for defaults and show a small “Dynasty base” badge when applicable. |
| **AI / automation boundaries** | If we add flags like “allow_ai_trade_explain” or “allow_orphan_ai”, ensure they are read by the AI and automation services; document default (e.g. true) and any entitlement tie-in. |

---

## 7. QA PLAN

| # | Area | Checks |
|---|------|--------|
| 1 | **Dynasty detection** | isDynasty true or leagueVariant devy_dynasty/merged_devy_c2c → league is treated as dynasty; resolver returns combined settings. |
| 2 | **League creation** | Create dynasty league → isDynasty true, roster_mode dynasty, playoff/scoring/roster defaults applied. Create devy → devy_dynasty + upsertDevyConfig; create c2c → merged_devy_c2c + upsertC2CConfig. |
| 3 | **Dynasty settings read** | GET dynasty-settings for dynasty/devy/c2c league returns roster, playoff, scoring, taxi (from correct source); no regression for redraft. |
| 4 | **Dynasty settings write** | PATCH dynasty-settings (pure dynasty) updates League.settings; validation rejects invalid values. |
| 5 | **Devy overlay** | Devy panel shows Dynasty base + Devy section; saving devy config does not overwrite dynasty base unless intended. |
| 6 | **C2C overlay** | C2C panel shows Dynasty base + C2C section; same as above. |
| 7 | **Taxi** | Taxi size and rules come from resolver; roster validation and lineup logic use same source; devy/c2c taxi overrides apply. |
| 8 | **Playoff** | Playoff config (teams, bracket, tiebreakers) resolved from League.settings + sport defaults; dynasty/devy/c2c all use same playoff resolver. |
| 9 | **Scoring** | Scoring template and overrides unchanged; dynasty resolver exposes “effective” source; devy/c2c scoring presets still work. |
| 10 | **Automation / AI** | If boundaries are added, verify AI and automation services respect them; no dead buttons; mobile layout. |
| 11 | **Regression** | Existing specialty leagues (guillotine, survivor, zombie, salary cap, etc.), draft, waiver, and trade flows unchanged. |

---

## 8. SUMMARY

- **One shared Dynasty settings engine** will be implemented as a resolver/service that reads **League.settings** (and optionally a future DynastyLeagueConfig) and, when present, **DevyLeagueConfig** and **C2CLeagueConfig**, and returns a unified dynasty view (roster, scoring, playoff, taxi, draft order, automation/AI boundaries).
- **Devy and C2C** will be clearly separated in UI and config but **inherit** Dynasty defaults; their panels will show “Dynasty base” + “Devy/C2C” sections.
- **Taxi** will be configurable and rule-enforced via the same resolver and existing roster/lineup guards.
- **Playoff** remains flexible and deterministic using existing playoff-defaults and bracket resolvers.
- **AI** will explain and advise only; enforcement stays deterministic (validation and guards).
- **Reusable modules** are all existing: LeagueDefaultSettingsService, playoff-defaults, RosterTemplateService, scoring bootstrap, LeagueSettingsValidator, DevyLeagueConfig, C2CLeagueConfig, buildSettingsPreview, specialty league registry.
- **New pieces** are: DynastySettingsService (or DynastyCoreResolver), optional DynastyLeagueConfig table, dynasty-settings API route, DynastySettingsPanel (or “Dynasty base” block in existing panels), optional dynasty creation presets, taxi/automation boundary helpers, and QA tests.

No implementation code is produced in this chunk; the next prompts will implement according to this plan.
