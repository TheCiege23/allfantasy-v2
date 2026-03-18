# PROMPT 357 — Specialty League Factory Update for Zombie

Extract Zombie-specific reusable architecture so future specialty leagues can reuse the right modules. **Do not start the next league yet.**

---

## 1. Extracted reusable modules

These contracts live in **`lib/specialty-league/reusable-modules.ts`**. Implementations are league-specific (Zombie implements them in `lib/zombie/*`); new leagues (Big Brother, Tournament, etc.) can implement the same contracts.

| Module | Contract | Description | Zombie implementation |
|--------|----------|-------------|-------------------------|
| **Status transformation** | `StatusTransformationContract` | Get/set roster status (e.g. Survivor, Zombie, Whisperer); optional special-role roster. | `ZombieOwnerStatusService` (getAllStatuses, getStatus, setZombie, setRevived, setWhisperer) |
| **Resource inventory ledger** | `ResourceInventoryLedgerContract` | Balance get, award, consume by resource type (+ optional key); audit. | `ZombieSerumEngine`, `ZombieWeaponEngine`, `ZombieAmbushEngine` + `ZombieResourceLedger` |
| **One-to-many universe** | `OneToManyUniverseContract` | Create universe, add levels, attach league to universe/level, list leagues. | `ZombieUniverseConfig` (createZombieUniverse, addLevelToUniverse, attachLeagueToUniverse, getUniverseLeagues) |
| **Cross-league standings** | `CrossLeagueStandingsContract` | Aggregated standings across leagues in a scope (e.g. universe). | `ZombieUniverseStandingsService.getUniverseStandings` |
| **Promotion/relegation engine** | `PromotionRelegationEngineContract` | Get movement projections; refresh from current standings. | `ZombieMovementEngine`, `ZombieUniverseProjectionService` |
| **Weekly board generation** | `WeeklyBoardGenerationContract` | Weekly board: survivors, zombies, special role, movement watch, optional risk candidates. | `ZombieWeeklyBoardService.getWeeklyBoardData` |
| **Anti-collusion flag registry** | `AntiCollusionFlagRegistryContract` | Evaluate deterministic flags; record to audit. | `ZombieCollusionFlagService` (evaluateCollusionFlags, recordCollusionFlags) |
| **Anti-neglect / replacement** | `AntiNeglectReplacementContract` | Evaluate dangerous drops (value vs threshold); optional replacement workflow. | `ZombieValuableDropGuard`, `ZombieReplacementOwnerService` |
| **AI recap hooks** | `AIRecapHooksContract` | Build league/scope deterministic context; list league and scope prompt types. | `lib/zombie/ai` (buildZombieAIContext, buildZombieUniverseAIContext; ZombieAIType, ZombieUniverseAIType) |

**Capability flags** (in `SpecialtyLeagueCapabilities`, `lib/specialty-league/types.ts`):  
`statusTransformation`, `resourceInventoryLedger`, `oneToManyUniverse`, `crossLeagueStandings`, `promotionRelegationEngine`, `weeklyBoardGeneration`, `antiCollusionFlagRegistry`, `antiNeglectReplacementWorkflow`, `aiRecapHooks`.

**Deterministic engine categories** (in `lib/specialty-league/framework-categories.ts`):  
Added: `status_transformation`, `resource_inventory_ledger`, `universe_standings_aggregation`, `promotion_relegation`, `weekly_board_generation`, `anti_collusion_flags`, `anti_neglect_dangerous_drops`.

---

## 2. Zombie-specific extension points

Zombie is **registered** in **`lib/specialty-league/registry.ts`** with:

- **id:** `zombie`, **leagueVariant:** `zombie`, **wizardLeagueTypeId:** `zombie`
- **detect:** `isZombieLeague` (config or leagueVariant)
- **getConfig / upsertConfig:** `getZombieLeagueConfig`, `upsertZombieLeagueConfig`
- **assets:** leagueImage (empty), no first-entry/intro video
- **firstEntryModal:** undefined
- **homeComponent:** `@/components/zombie/ZombieHome`
- **summaryRoutePath:** `/api/leagues/[leagueId]/zombie/summary`
- **aiRoutePath:** `/api/leagues/[leagueId]/zombie/ai`
- **rosterGuard:** `!(config.zombieTradeBlocked && status === 'Zombie')` (can-trade semantics)
- **capabilities:** all nine Zombie-derived flags set to `true`

Zombie-specific pieces that are **not** generalized (stay in `lib/zombie`):

- **Infection rules:** Who gets infected (loss to Whisperer/Zombie) — `ZombieInfectionEngine`
- **Whisperer selection:** Mode (random / veteran_priority) — `whispererSelection.ts`
- **Serum/weapon/ambush rules:** Award and use rules, revive threshold — `ZombieSerumEngine`, `ZombieWeaponEngine`, `ZombieAmbushEngine`
- **Weekly finalization sequence:** Infection → serum awards → weapon awards → winnings — `ZombieResultFinalizationService`
- **Universe AI route:** `POST /api/zombie-universe/[universeId]/ai` (scope-scoped AI)
- **Attach-universe route:** `POST /api/leagues/[leagueId]/zombie/attach-universe`
- **Universe refresh route:** `POST /api/zombie-universe/[universeId]/refresh`

---

## 3. Common automation modules

**`lib/specialty-league/common-automation.ts`** — extended with hooks used by Zombie and future leagues:

| Hook | Purpose |
|------|--------|
| `weekly_evaluation` | Elimination, danger tier (Guillotine) |
| `period_close` | Close council, lock challenge (Survivor) |
| `token_award` | Exile top scorer (Survivor) |
| `boss_reset` | Reset tokens when commissioner wins |
| `merge_check` | Trigger merge at week or player count |
| `jury_enrollment` | Add eliminated to jury |
| `return_eligibility` | Exile return at N tokens |
| `event_log_append` | Audit / event log |
| **`weekly_finalization`** | Infection, serum/weapon awards, winnings (Zombie) |
| **`movement_refresh`** | Refresh promotion/relegation projections (Zombie universe) |
| **`weekly_board_generation`** | Chompin' Block, risk list (Zombie) |
| **`collusion_evaluation`** | Evaluate and record collusion flags |
| **`dangerous_drop_evaluation`** | Evaluate valuable drops vs threshold |
| **`replacement_workflow`** | Inactivity/replacement owner triggers |

**Policy** (unchanged): Deterministic = legal/state/outcome (no LLM). Automation = jobs/triggers that call engines.

---

## 4. Common AI modules

**`lib/specialty-league/common-ai.ts`** — extended with:

- **`COMMON_AI_RECAP_TYPES`:** `weekly_recap`, `most_at_risk`, `commissioner_summary`, `level_storylines`, `promotion_relegation_outlook`, `universe_health_summary`  
  Use for league- or scope-scoped narrative only; context is deterministic, AI never decides outcomes.

**Existing:**  
`SPECIALTY_AI_RULE`, `BuildAIContextFn`, `BuildAIPromptFn`, `GenerateAIFn`, `COMMON_AI_HOST_TYPES`, `COMMON_AI_HELPER_TYPES`, `BuildChimmyContextFn`.

**Zombie AI:**  
League: `buildZombieAIContext` → `buildZombieAIPrompt` → `generateZombieAI` (types in `ZombieAIType`).  
Universe: `buildZombieUniverseAIContext` → `buildZombieUniverseAIPrompt` → `generateZombieUniverseAI` (types in `ZombieUniverseAIType`).  
Entitlement: `zombie_ai` (fallback `ai_chat`). All prompts include determinism rules (no infection/legality/movement decisions).

---

## 5. Future specialty league build checklist

Use this when adding **Big Brother, Devy, Merged Devy, Tournament, BestBall, IDP, Keeper**, or any new specialty.

1. **Registry & types**
   - Add `SpecialtyLeagueId` in `types.ts` if new id.
   - Implement: `detect`, `getConfig`, `upsertConfig` (config loader/upsert).
   - Register spec in `registry.ts`: variant, wizard type, assets, home component, summary route, AI route (if any), rosterGuard/getExcludedRosterIds (if any), capabilities.

2. **League create**
   - Ensure wizard or create API can set `leagueVariant` and call `bootstrapSpecialtyConfig(leagueId, spec)`.
   - Sport-aware defaults in spec if needed.

3. **Deterministic engines**
   - Classify features: use `DETERMINISTIC_ENGINE_CATEGORIES` and league-specific policy (e.g. `*_DETERMINISTIC_FEATURES` in `automation-ai-policy.ts`).
   - Implement in league-specific lib (e.g. `lib/<variant>/*`). Reuse contracts from `reusable-modules.ts` where applicable (status transformation, resource ledger, universe, standings, P/R, weekly board, anti-collusion, anti-neglect).

4. **Automation**
   - Implement `runAutomation` on spec if needed; use `COMMON_AUTOMATION_HOOKS` for classification.
   - Wire cron or manual triggers to call engine (e.g. weekly finalization, movement refresh).

5. **Guards**
   - Implement `rosterGuard` and optionally `getExcludedRosterIds`; wire waiver/lineup/trade flows to check them.

6. **AI (optional)**
   - If league has AI: implement `SpecialtyAIExtension` (buildContext, buildPrompt, generate) or equivalent; add entitlement feature id; ensure determinism rule in prompts.
   - If scope-scoped AI (e.g. universe): add scope context builder and scope route; gate by same or dedicated entitlement.

7. **API routes**
   - Summary: GET league summary (config, statuses, board, my resources).
   - AI: POST league AI (and scope AI if applicable).
   - Attach/refresh/other: add routes that call engine (e.g. attach-universe, universe refresh).

8. **UI**
   - Home component (Overview replacement); first-entry modal if desired.
   - Use `getSpecialtySpecByVariant(league.leagueVariant)` to pick home; ensure league page passes variant to Overview.

9. **QA harness**
   - Run `runSpecialtyQAHarness(leagueId, spec)`; implement optional `spec.qaHarness` for league-specific checks.
   - Use `QA_TEMPLATE_SECTIONS` and `QA_HARNESS_CHECKS` for coverage.

10. **Policy & exports**
    - Add league-specific `*_DETERMINISTIC_FEATURES` and `*_AI_OPTIONAL_FEATURES` (and hybrid map) in `automation-ai-policy.ts`; export from `index.ts`.
    - Document in README and in a deliverable doc if needed.

---

## 6. Recommended next league build order

Suggested order for **upcoming** leagues (do not start the next one in this task):

| Order | League | Rationale |
|-------|--------|-----------|
| 1 | **Big Brother** | Reuses Survivor-heavy contracts (tribes → houses, voting, eviction, sidecar/jury-like phases); extends narrative and minigame patterns. |
| 2 | **Tournament** | Bracket + elimination; can reuse elimination pipeline and standings; new: bracket tree, seeding, round advancement. |
| 3 | **BestBall** | Scoring-only optimization; reuses bestball_optimization category; minimal status/roles; good for testing sport-scope and scoring. |
| 4 | **Devy** | Roster + prospect layer; new: devy roster, eligibility; can reuse resource/ledger ideas for “prospect slots.” |
| 5 | **Merged Devy** | Builds on Devy; merge logic and eligibility. |
| 6 | **Keeper** | Contracts, keeper tags, offseason; overlaps with Salary Cap and offseason_lifecycle; reuse cap/contract categories where applicable. |
| 7 | **IDP** | Scoring/roster expansion; position and scoring categories; sport-aware. |

**Salary Cap** is already in progress (wizard/config); complete integration with registry and home when ready.

This order maximizes reuse of existing contracts (Survivor, Zombie) and spreads net-new complexity (bracket, devy, keeper, IDP) across later builds.
