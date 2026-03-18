# CURSOR PROMPT 1 OF 6 — Merged Devy / C2C Implementation Plan

**Do not implement yet.** This document is the research-driven implementation plan, architecture map, reusable modules, new files, risks, migration strategy, and QA plan only.

---

## 1. Research Summary: Current Systems

### 1.1 Devy Dynasty (full specialty)

| Area | Location | Notes |
|------|----------|--------|
| **Identity** | `League.leagueVariant === 'devy_dynasty'`, `DevyLeagueConfig` (1:1 League) | Dynasty-only; NFL + NBA via sport adapters `nfl_devy`, `nba_devy`. |
| **Config** | `lib/devy/DevyLeagueConfig.ts`, `prisma.DevyLeagueConfig` | Slots, taxi, rookie/devy/startup rounds and types (snake/linear), best ball, promotion timing, etc. |
| **Rights & lifecycle** | `DevyRights`, `DevyLifecycleEvent`, `DevyCommissionerOverride` | Per (league, roster, devyPlayer); states e.g. NCAA_DEVY_ACTIVE, PROMOTION_ELIGIBLE, PROMOTED_TO_PRO. |
| **Pool separation** | `lib/devy/pool/DevyPoolSeparation.ts` | startup_vet = pro only; rookie = rookies, exclude devy-held promoted; devy = NCAA only. |
| **Draft** | `lib/devy/draft/DevyDraftOrchestration.ts`, `getCurrentDraftPhase` | Phases: startup_vet → rookie → devy. Pool API uses `poolType` when strict separation. |
| **Promotion** | `lib/devy/promotion/DevyPromotionService.ts`, `lib/devy/lifecycle/DevyLifecycleEngine.ts` | Eligibility, execute, force, revoke, return-to-school. |
| **Best ball** | `lib/devy/bestball/DevyBestBallOptimizer.ts` | NFL/NBA; NCAA devy excluded (0 points until promoted); taxi rules. |
| **Rankings** | `lib/devy/rankings/DevyTeamOutlookService.ts` | Future capital, devy inventory, class depth. |
| **Trade** | `lib/engine/devy.ts`, `lib/engine/trade.ts` | `enrichDevy`, `devyValueMultiplier`; trade types support devy assets. |
| **AI** | `lib/devy/ai/*`, `POST /api/leagues/[leagueId]/devy/ai` | Scout, promotion advisor, draft assistant, class storytelling, trade context, rookie-vs-devy. Chimmy: `buildDevyContextForChimmy`. |
| **Jobs** | `lib/devy/jobs/DevyJobsHandler.ts`, `lib/workers/devy-worker.ts`, `POST /api/cron/devy` | NCAA sync, graduation, pools, snapshots, rankings, class strength. |
| **UI** | `components/devy/*`, OverviewTab when `isDevyDynasty` | DevyHome, DevyBoard, DevyPromotionPanel, DevyCommissionerTools, etc. |
| **Registry** | `lib/specialty-league/registry.ts` | `registerDevy()`, id `devy`, leagueVariant `devy_dynasty`, wizardLeagueTypeId `devy`. |

### 1.2 C2C (draft-only, no full specialty)

| Area | Location | Notes |
|------|----------|--------|
| **Identity** | Wizard `league_type: 'c2c'` only; **no** `League.leagueVariant` set for C2C on create | League create route has **no** `isC2C` or `resolvedVariant = 'c2c'`. C2C is not in specialty registry. |
| **Draft config** | `DraftSession.c2cConfig` (Json): `{ enabled, collegeRounds }` | Set via `PATCH /api/leagues/[leagueId]/draft/c2c/config` (commissioner, pre_draft only). |
| **Pool** | `GET /api/leagues/[leagueId]/draft/pool` | When `c2cConfig.enabled`, merges college (DevyPlayer) + pro; tags `poolType: 'college' | 'pro'`. |
| **Pick validation** | `lib/live-draft-engine/PickValidation.ts`: `validateC2CEligibilityAsync` | College round ⇒ college-eligible only; pro round ⇒ reject college-only. Uses same DevyPlayer table. |
| **Session snapshot** | `lib/live-draft-engine/DraftSessionService.ts` | `c2c: { enabled, collegeRounds }` on snapshot. |
| **UI** | Draft room: `c2cConfig`, `c2cCollegeRounds`, College/Pro filter and round hints | PlayerPanel, DraftBoard, DraftBoardCell; no C2C league home or overview. |
| **League types** | `lib/league-creation-wizard/league-type-registry.ts` | `getAllowedLeagueTypesForSport`: C2C only for NFL and NCAAF; **NBA does not have C2C** in allowlist. |
| **Validation** | `lib/league-settings-validation/LeagueSettingsValidator.ts` | C2C league requires at least one college round (for draft settings). |

So today: **C2C = draft variant only**. No C2C league config, no C2C rights, no C2C promotion lifecycle, no C2C best ball or rankings, no C2C specialty home. College players in C2C exist only as draft picks and roster entries; there is no “college rights” or “graduation” model for C2C.

### 1.3 College player data

| Source | Location | Notes |
|--------|----------|--------|
| **DB** | `DevyPlayer` (Prisma) | NCAA players; `league: 'NCAA'`, `devyEligible`, `graduatedToNFL`; NFL-focused fields; `ncaaSourceTag` for sport-aware source. |
| **CFBD** | `lib/cfb-player-data.ts` | College Football Data API; sync/values for NFL devy. |
| **Legacy** | `app/api/legacy/cfb-players/route.ts`, `app/api/legacy/devy-board/route.ts` | Legacy/dev endpoints. |
| **NBA college** | `lib/devy/eligibility/nba-devy-adapter.ts` | Devy pool positions G/F/C; no separate NCAAB player table mentioned; DevyPlayer can serve both with sport/adapter. |

### 1.4 Other touchpoints

- **Draft variant hub:** `lib/draft-defaults/DraftVariantSettingsHub.ts` — keeper, devy, **C2C** (collegeRounds) on session.
- **Post-draft:** `lib/post-draft/PostDraftAutomationService.ts`, `lib/post-draft/types.ts` — C2C college rounds in snapshot.
- **League create:** No C2C branch; no `upsertC2CConfig` or equivalent. Wizard can send `league_type: 'c2c'` and `c2c_college_rounds` in settings, but league is not marked as C2C variant and no persistent C2C config exists.
- **SpecialtyLeagueId** (`lib/specialty-league/types.ts`): includes `'merged_devy'` but it is **not** registered in `registry.ts`. C2C is not in `SpecialtyLeagueId`.

---

## 2. Implementation Plan (High Level)

### 2.1 Product identity

- **Name:** Merged Devy / C2C (College to Canton).
- **Identity:** One unified pipeline league where college and pro assets coexist in the same dynasty universe. Not “devy slots on dynasty” and not “draft-only C2C”—full league mode with configurable draft model and college-to-pro progression.
- **Dynasty-only, never redraft.** Enforce in league create and validation.
- **Sports:** NFL C2C (pro = NFL, college = NCAA Football), NBA C2C (pro = NBA, college = NCAA Basketball). Use same engine shape and sport adapters.

### 2.2 Recommended approach: Single “Merged Devy / C2C” specialty

- Add **one** new specialty league type: **Merged Devy / C2C** (e.g. `id: 'merged_devy_c2c'`, `leagueVariant: 'merged_devy_c2c'`, wizard e.g. `c2c` or a new `merged_c2c`).
- **Reuse** as much as possible:
  - **DevyPlayer** for college pool (both NFL and NBA; sport/adapter distinguish).
  - **Rights and lifecycle:** Either reuse `DevyRights` with a league-level “source” (e.g. league has DevyLeagueConfig **or** MergedDevyC2CConfig) or introduce a shared “college rights” abstraction used by both devy_dynasty and merged_devy_c2c. Recommendation: **reuse DevyRights** for merged C2C as well (same table, different league config type) so one promotion/graduation engine and one audit model.
  - **Pool separation and draft:** Extend pool API and draft orchestration so that when league is “merged C2C”:
    - **Draft model A — Merged startup:** One draft with college rounds + pro rounds (current C2C behavior); config stores `collegeRounds` (and optionally college slot count). Picks in college rounds create “college rights” (DevyRights) when the league uses the merged C2C config.
    - **Draft model B — Structured phased:** Same as devy: startup_vet → rookie → devy (or college) phases; reuse existing devy phase logic and pool separation.
  - **Best ball, rankings, trade:** Reuse devy best ball optimizer, DevyTeamOutlookService (or extend for “merged” mode), and existing trade enrichment; ensure college-only assets are tagged and valued without breaking existing devy leagues.
- **New/expanded:**
  - **MergedDevyC2CConfig** (or equivalent): draft model (merged_startup | structured_phased), college rounds (for merged), college slot count, college-scoring-enabled, promotion timing, best ball, etc. Sport-aware defaults (NFL vs NBA).
  - **League create:** When league type is C2C/merged_c2c, set `leagueVariant` and create MergedDevyC2CConfig; **block** redraft (same as devy).
  - **Draft:** For merged startup, after draft completion, create DevyRights for college-round picks so that promotion/graduation and roster rules apply post-draft.
  - **Roster/lineup:** College slots and “college-scoring” (if enabled) must be enforced; reuse/extend devy roster rules (e.g. `DevyRosterRules`, slot counts).
  - **Promotion/graduation:** Same lifecycle as devy (eligibility, execute, force, revoke, return-to-school); commissioner overrides and audit log reused.
  - **UI:** Merged C2C home (overview), draft center, promotion panel, commissioner tools—either new components or parameterized devy components by “format” (devy_dynasty vs merged_devy_c2c).
  - **AI:** Reuse devy AI context/prompts where applicable; add C2C-specific context (e.g. “merged pipeline,” “college round vs pro round”) and Chimmy C2C context.
  - **Jobs:** Reuse devy jobs (NCAA sync, graduation, pools, rankings); optionally add C2C-specific job (e.g. “assign college rights from merged draft”) if not done inline at draft completion.

### 2.3 Phased implementation (suggested order)

1. **Schema & config:** Add MergedDevyC2CConfig (or extend a single “college pipeline” config) and ensure League.leagueVariant can be `merged_devy_c2c`. No removal of existing DevyLeagueConfig or DevyRights.
2. **League create & wizard:** C2C/merged_c2c creation, block redraft, set variant, upsert MergedDevyC2CConfig; wizard and `getAllowedLeagueTypesForSport` for NFL + NBA for C2C.
3. **Detection & registry:** `isMergedDevyC2CLeague(leagueId)`, register specialty spec (summary route, AI route, home component, assets).
4. **Draft model — Merged startup:** Use existing C2C draft flow (collegeRounds on session); on draft completion, create DevyRights for college picks so roster and lifecycle apply. Ensure pool and validation already treat college vs pro correctly (existing C2C logic).
5. **Draft model — Structured phased:** Reuse devy phase orchestration and pool separation when config says structured_phased; distinguish by config type (devy_dynasty vs merged_devy_c2c) so only the right leagues get phased behavior.
6. **Roster & lineup:** College slots and scoring (if enabled); extend roster rules and best ball to respect “college-scoring” and slot limits for merged C2C.
7. **Promotion & lifecycle:** Reuse DevyRights + lifecycle engine; ensure graduation and commissioner overrides work for leagues with MergedDevyC2CConfig.
8. **Rankings & trade:** Future capital and trade valuation for merged C2C; reuse or extend DevyTeamOutlookService and trade engine.
9. **AI & Chimmy:** C2C context and prompts; Chimmy “C2C mode” (pipeline, college vs pro, promote/trade).
10. **Jobs & cron:** Reuse devy jobs; add any C2C-specific job (e.g. post-draft rights creation) if needed.
11. **UI:** C2C home, draft center, promotion panel, commissioner tools; mobile-first, no dead buttons.
12. **QA & regression:** Full QA plan (see Section 7); ensure existing devy and existing C2C draft-only behavior remain intact.

---

## 3. Architecture Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MERGED DEVY / C2C (NEW)                                │
│  League.leagueVariant = 'merged_devy_c2c'                                    │
│  MergedDevyC2CConfig (draftModel, collegeRounds, collegeSlots, etc.)         │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         │ reuses / extends
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  SHARED COLLEGE + PRO PIPELINE                                               │
│  • DevyPlayer (college pool – NFL & NBA via adapter)                          │
│  • DevyRights (college rights + lifecycle – shared with devy_dynasty)         │
│  • DevyLifecycleEvent, DevyCommissionerOverride                               │
│  • Promotion/graduation engine (DevyPromotionService, DevyLifecycleEngine)    │
│  • Pool separation / draft phase (extend for merged vs phased)               │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         │ reuses
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  EXISTING DEVY DYNASTY                                                       │
│  League.leagueVariant = 'devy_dynasty', DevyLeagueConfig                     │
│  • Three-phase draft (startup_vet / rookie / devy)                           │
│  • Strict pool separation (DevyPoolSeparation)                               │
│  • Best ball (DevyBestBallOptimizer), rankings (DevyTeamOutlookService)       │
│  • AI (DevyAIContext, DevyAIPrompts), Chimmy devy context                    │
│  • Jobs (DevyJobsHandler), cron / worker                                     │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  EXISTING C2C (DRAFT-ONLY)                                                   │
│  DraftSession.c2cConfig { enabled, collegeRounds }                           │
│  • Merged pool (college + pro), poolType, validateC2CEligibilityAsync         │
│  • No league-level config, no rights, no promotion                            │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         │ migrate / unify
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  MERGED DEVY / C2C DRAFT                                                     │
│  • If draftModel = 'merged_startup': use C2C-style draft + create DevyRights  │
│    for college picks at completion                                            │
│  • If draftModel = 'structured_phased': use devy-style phase + pool           │
└─────────────────────────────────────────────────────────────────────────────┘
```

- **Deterministic first:** All scoring, eligibility, pool, lineup, promotion, and draft order remain in code only.
- **AI second:** Explanation, strategy, narrative, Chimmy context only; no AI-decided outcomes.

---

## 4. Reusable Files / Modules to Extend

| Module / file | Reuse / extend for Merged Devy C2C |
|---------------|------------------------------------|
| `lib/devy/DevyLeagueConfig.ts` | Pattern only; new `MergedDevyC2CConfig` loader/upsert/detection (or shared “college pipeline” config interface). |
| `lib/devy/types.ts` | Sport adapters, eligibility types; extend with C2C draft model types and college-scoring flag. |
| `lib/devy/pool/DevyPoolSeparation.ts` | Extend to support “merged” pool (college + pro in one draft) vs “phased” (current); or call from a C2C pool layer that applies collegeRounds. |
| `lib/devy/draft/DevyDraftOrchestration.ts` | For structured_phased C2C, reuse getCurrentDraftPhase and phase config; for merged_startup, use existing C2C session config. |
| `lib/devy/eligibility/*` | Reuse NFL/NBA devy eligibility adapters for college pool. |
| `lib/devy/promotion/DevyPromotionService.ts` | Reuse as-is for promotion eligibility and execution (league-agnostic if rights are in DevyRights). |
| `lib/devy/lifecycle/DevyLifecycleEngine.ts` | Reuse transitions and audit; ensure league has correct config type when writing events. |
| `lib/devy/bestball/DevyBestBallOptimizer.ts` | Reuse; ensure “college-scoring” (if enabled) is reflected in lineup eligibility for C2C. |
| `lib/devy/rankings/DevyTeamOutlookService.ts` | Reuse or extend for merged C2C leagues (future capital, pipeline view). |
| `lib/devy/roster/DevyRosterRules.ts` | Extend for C2C college slot count and scoring toggle. |
| `lib/engine/devy.ts`, `lib/engine/trade.ts` | Reuse enrichDevy and devy value multiplier; ensure C2C assets are recognized. |
| `lib/live-draft-engine/PickValidation.ts` | Keep validateC2CEligibilityAsync; use for merged_startup C2C drafts. |
| `lib/live-draft-engine/PickSubmissionService.ts` | Already branches on C2C vs devy; keep and ensure C2C path applies when league is merged C2C. |
| `lib/live-draft-engine/DraftSessionService.ts` | Already includes c2c in snapshot; ensure session can be tied to MergedDevyC2CConfig when draft completes (for creating DevyRights). |
| `app/api/leagues/[leagueId]/draft/pool/route.ts` | Already supports C2C merge and poolType; extend if needed for merged C2C league detection and default poolType. |
| `app/api/leagues/[leagueId]/draft/c2c/config/route.ts` | May become “set C2C config on session” for merged C2C leagues, or keep as draft-only and add league-level config elsewhere. |
| `lib/league-creation-wizard/league-type-registry.ts` | Already has C2C; add NBA to getAllowedLeagueTypesForSport for C2C if product wants NBA C2C. |
| `lib/league-settings-validation/LeagueSettingsValidator.ts` | Already validates C2C college rounds; keep and align with new config. |
| `lib/specialty-league/registry.ts` | Register new spec (merged_devy_c2c). |
| `lib/specialty-league/types.ts` | Add `merged_devy_c2c` (or `c2c`) to SpecialtyLeagueId if not already; ensure spec type supports it. |
| `lib/devy/ai/*` | Reuse context builders and prompts; add C2C-specific context (merged pipeline, college vs pro). |
| `lib/devy/ai/devyContextForChimmy.ts` | Extend or add `buildC2CContextForChimmy` when league is merged C2C. |
| `components/devy/*` | Reuse or parameterize (e.g. by format) for C2C home, promotion panel, commissioner tools; avoid duplication where possible. |
| `app/app/league/[leagueId]/page.tsx` | Add isMergedDevyC2C (or isC2C) and pass to OverviewTab. |
| `components/app/tabs/OverviewTab.tsx` | Render C2C home when isMergedDevyC2C (or isC2C). |
| `app/api/league/create/route.ts` | Add isC2C / merged_c2c branch: set resolvedVariant, block redraft, call upsertMergedDevyC2CConfig (or equivalent). |
| `lib/devy/jobs/DevyJobsHandler.ts` | Reuse; add job for “create DevyRights from merged draft college picks” if done async. |
| `prisma/schema.prisma` | Add MergedDevyC2CConfig (or C2CLeagueConfig); keep DevyRights/DevyLifecycleEvent/DevyCommissionerOverride shared. |

---

## 5. Likely New Files Needed

| New file | Purpose |
|----------|---------|
| `lib/merged-devy-c2c/MergedDevyC2CLeagueConfig.ts` | Detect, get, upsert MergedDevyC2CConfig; sport-aware defaults (NFL vs NBA). |
| `lib/merged-devy-c2c/constants.ts` | Default college rounds, slot counts, draft model options by sport. |
| `lib/merged-devy-c2c/types.ts` | Draft model (merged_startup \| structured_phased), config shape, adapter id (e.g. nfl_c2c, nba_c2c). |
| `lib/merged-devy-c2c/draft/MergedC2CDraftCompletion.ts` | On merged_startup draft completion: create DevyRights for college-round picks (leagueId, rosterId, devyPlayerId, state). |
| `lib/merged-devy-c2c/roster/C2CRosterRules.ts` | College slot count, college-scoring eligibility; may wrap or extend DevyRosterRules. |
| `app/api/leagues/[leagueId]/merged-devy-c2c/summary/route.ts` | GET summary for C2C home (config, phase, promotion eligible count, pipeline summary). |
| `app/api/leagues/[leagueId]/merged-devy-c2c/config/route.ts` | GET/PATCH config (commissioner). |
| `app/api/leagues/[leagueId]/merged-devy-c2c/ai/route.ts` | Optional; or reuse devy AI route with type=c2c_* and C2C context. |
| `components/merged-devy-c2c/MergedC2CHome.tsx` | Overview replacement: pipeline summary, draft center, promotion panel, links to settings. |
| `components/merged-devy-c2c/MergedC2CPromotionPanel.tsx` | Reuse or wrap DevyPromotionPanel with C2C copy/config. |
| `components/merged-devy-c2c/MergedC2CCommissionerTools.tsx` | Overrides, recalc, reopen window; reuse devy admin patterns. |
| `lib/merged-devy-c2c/ai/C2CContextForChimmy.ts` | Build Chimmy context for merged C2C (pipeline, college vs pro, promote/trade). |
| Migration SQL | Add table `merged_devy_c2c_configs` (or `c2c_league_configs`) with leagueId, draftModel, collegeRounds (JSON), collegeSlotCount, collegeScoringEnabled, promotionTiming, bestBallEnabled, sport-aware fields, etc. |

Optional (if not reusing devy components):

- `components/merged-devy-c2c/MergedC2CDraftCenter.tsx`
- `components/merged-devy-c2c/MergedC2CBoard.tsx` (college vs pro roster view)

---

## 6. Risks and Edge Cases

| Risk / edge case | Mitigation |
|------------------|------------|
| **Two formats, one DevyRights table** | DevyRights keyed by leagueId; leagues are either devy_dynasty or merged_devy_c2c. Ensure all lifecycle and pool code checks league config type before applying format-specific rules (e.g. “max college slots” from correct config). |
| **C2C draft-only leagues (no variant)** | Leagues created today with only draft C2C config have no leagueVariant. Decide: (a) leave as-is (draft-only C2C remains as is), or (b) migration to create MergedDevyC2CConfig and set variant for existing C2C drafts. Recommendation: (a) for backward compatibility; new C2C = merged_devy_c2c. |
| **Rookie vs college valuation overlap** | Rankings and AI must use deterministic “college-only,” “rights-held,” “graduated,” “rookie-pool eligible” labels; avoid double-counting or conflicting values. Reuse devy outlook and extend with explicit asset-state flags. |
| **Freshmen / early college risk** | Commissioner settings or config (e.g. “allow freshmen,” “max years until draft eligible”); rankings and AI can down-weight or flag “high risk” without AI deciding eligibility. Implement as deterministic rules and expose in context. |
| **NBA C2C data** | DevyPlayer and nba_devy adapter exist; ensure NCAA Basketball players are populated (ncaaSourceTag, league) and eligibility works for NBA C2C. May need NCAAB source sync (separate from CFBD). |
| **Best ball with college scoring** | If “college-scoring” is on, college assets score in best ball until graduation; optimizer must include them in lineup logic. Extend DevyBestBallOptimizer or add C2C path that includes college players when config allows. |
| **Draft completion and rights creation** | Creating DevyRights for many teams/rounds in one request could be slow; consider job queue (devy worker) for “post-merged-draft rights creation” and return 202 with job id. |
| **Trade of “college rights” before promotion** | Already supported for devy (trade DevyRights or devy picks); ensure trade engine and UI treat C2C college picks and rights the same way. |
| **Regression: existing devy and C2C draft** | All changes must be additive or behind “is merged C2C league” checks. Existing devy_dynasty leagues must never use MergedDevyC2CConfig; existing C2C draft-only flow must remain valid. |

---

## 7. Migration Strategy

1. **Schema:** Add `MergedDevyC2CConfig` (or `C2CLeagueConfig`) table; add `merged_devy_c2c` (or keep using `c2c`) to League.leagueVariant enum/string. No change to DevyRights, DevyLifecycleEvent, or DevyPlayer.
2. **Backfill:** No backfill of existing leagues into Merged Devy C2C unless product explicitly wants “migrate C2C draft leagues to full C2C”; otherwise new leagues only.
3. **Feature flag / rollout:** Optional env or feature flag to enable “Merged Devy C2C” creation and home until QA is complete.
4. **Wizard:** When enabling, ensure wizard shows C2C (or “Merged Devy / C2C”) for NFL and NBA and that create flow sets variant and config.
5. **Draft session:** Existing DraftSession.c2cConfig remains; for merged_devy_c2c leagues, C2C config on session can be the source of truth for “this draft is merged” and collegeRounds; after completion, new logic creates DevyRights.

---

## 8. QA Plan

- **Creation:** Create NFL C2C and NBA C2C (merged_devy_c2c); verify dynasty-only (block redraft); verify config persisted and summary loads.
- **Draft — Merged startup:** Run a merged draft (college + pro rounds); verify pool filter (College/Pro), round validation (college round = college only, pro round = pro only); on completion verify DevyRights created for college picks and roster shows college slots filled.
- **Draft — Structured phased:** If implemented, verify phased draft (startup_vet / rookie / college) uses correct pool and phase config.
- **Roster & lineup:** College slot count and optional college-scoring; submit lineup with college assets when allowed; verify best ball optimizer when college-scoring enabled.
- **Promotion:** Mark player graduated; verify promotion eligible; execute promotion; verify roster and rights state; commissioner force/revoke.
- **Trade:** Trade college rights and future picks; verify valuation and future capital update.
- **Rankings:** Future capital and pipeline view for merged C2C league.
- **AI & Chimmy:** C2C context in Chimmy; C2C-specific AI route or types (if any); no AI overriding deterministic outcomes.
- **Commissioner:** Config edit, overrides, recalc, reopen window; visibility only for commissioner.
- **Regression:** Existing devy dynasty creation and flow unchanged; existing C2C draft-only (no variant) still works; existing specialty leagues (guillotine, survivor, zombie) unchanged.
- **Mobile & UX:** Mobile-first layout, no dead buttons, empty/loading/error states, readable errors.

---

## 9. Summary

- **Reuse:** DevyPlayer, DevyRights, lifecycle, promotion, pool separation (for phased), best ball, rankings, trade enrichment, devy AI patterns, draft pool and C2C pick validation, draft variant hub and session snapshot.
- **New:** MergedDevyC2CConfig, league create + wizard for C2C/merged_c2c, specialty registration, C2C home and panels, post–merged-draft DevyRights creation, optional C2C-specific AI/Chimmy context, and QA coverage.
- **Risks:** Shared DevyRights between devy and C2C (mitigate by league-scoped config), NBA C2C data, best ball with college-scoring, and regression on existing devy and C2C draft.
- **Deterministic first, AI second:** All scoring, eligibility, promotion, pool, and lineup remain rule-based; AI only explains and recommends.

This completes the implementation plan. No code or diffs are included; proceed to implementation in subsequent prompts.
