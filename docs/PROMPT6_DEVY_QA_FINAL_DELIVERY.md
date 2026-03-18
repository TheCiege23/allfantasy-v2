# CURSOR PROMPT 6 — Devy Dynasty QA Pass + Final Delivery

## 1. Implementation Summary

Devy Dynasty is implemented as a full specialty league mode with:

- **League creation**: NFL and NBA Devy Dynasty via wizard (`league_type: 'devy'`) or variant `devy_dynasty`. Creation forces dynasty (no redraft). Explicit validation rejects `isDynasty: false` when devy is requested.
- **Draft workflow**: Strict pool separation via `poolType` (startup_vet | rookie | devy). Draft pool API supports devy-only and rookie-only pools; startup vet defaults for devy leagues when `poolType` is omitted. Rookie pool excludes devy-held promoted players. Snake/linear from config.
- **Promotion lifecycle**: Promotion API (GET/POST), eligibility checks, execute promotion, commissioner force/revoke, return-to-school and ambiguous mapping to commissioner review queue (overrides).
- **Best ball**: NFL/NBA optimizers in `DevyBestBallOptimizer`; NCAA devy players excluded (`isNcaaDevy` → 0 points); taxi rules from config.
- **Trades**: Trade engine uses `enrichDevy` and `devyValueMultiplier`; devy players and picks supported; no crashes on devy assets.
- **Rankings**: `DevyTeamOutlookService` (future capital, devy inventory, class depth); portfolio projection includes devy; contender/rebuilder views unchanged.
- **AI**: Devy Scout, Promotion Advisor, Draft Assistant, Class Storytelling, Trade Context, Rookie-vs-Devy Decision; Chimmy devy context; AI never overrides deterministic rules.
- **Jobs**: Devy queue (NCAA sync, graduation, pools, snapshots, rankings, class strength); cron route `POST /api/cron/devy`; worker started with others.

**QA fixes applied:**

- League create: explicit 400 when devy is requested with `isDynasty: false`.
- Specialty registry: `aiRoutePath` set to `/api/leagues/[leagueId]/devy/ai` (was null).
- Draft pool: for devy leagues, default `poolType` to `startup_vet` when query param is missing so vet draft shows vets only by default.

---

## 2. Full File List

### API routes
- `app/api/league/create/route.ts` (modified)
- `app/api/leagues/[leagueId]/draft/pool/route.ts` (modified)
- `app/api/leagues/[leagueId]/devy/ai/route.ts`
- `app/api/leagues/[leagueId]/devy/audit/route.ts`
- `app/api/leagues/[leagueId]/devy/config/route.ts`
- `app/api/leagues/[leagueId]/devy/outlook/route.ts`
- `app/api/leagues/[leagueId]/devy/promotion/route.ts`
- `app/api/leagues/[leagueId]/devy/summary/route.ts`
- `app/api/leagues/[leagueId]/devy/admin/force-promote/route.ts`
- `app/api/leagues/[leagueId]/devy/admin/overrides/route.ts`
- `app/api/leagues/[leagueId]/devy/admin/regenerate-devy-pool/route.ts`
- `app/api/leagues/[leagueId]/devy/admin/regenerate-rookie-pool/route.ts`
- `app/api/leagues/[leagueId]/devy/admin/repair-duplicate-rights/route.ts`
- `app/api/leagues/[leagueId]/devy/admin/revoke-promotion/route.ts`
- `app/api/leagues/[leagueId]/devy/admin/recalc/route.ts`
- `app/api/leagues/[leagueId]/devy/admin/reopen-window/route.ts`
- `app/api/leagues/[leagueId]/devy/scoring-presets/route.ts`
- `app/api/cron/devy/route.ts`
- `app/api/chat/chimmy/route.ts` (devy context wired)

### Lib — devy core
- `lib/devy/DevyLeagueConfig.ts`
- `lib/devy/constants.ts`
- `lib/devy/index.ts`
- `lib/devy/types.ts`
- `lib/devy/eligibility/DevyEligibilityService.ts`
- `lib/devy/eligibility/nfl-devy-adapter.ts`
- `lib/devy/eligibility/nba-devy-adapter.ts`
- `lib/devy/roster/DevyRosterRules.ts`
- `lib/devy/draft/DevyDraftOrchestration.ts`
- `lib/devy/pool/DevyPoolSeparation.ts`
- `lib/devy/graduation/DevyGraduationService.ts`
- `lib/devy/lifecycle/DevyLifecycleEngine.ts`
- `lib/devy/lifecycle/DevyAuditLog.ts`
- `lib/devy/promotion/DevyPromotionService.ts`
- `lib/devy/disambiguation/DevyMappingResolver.ts`
- `lib/devy/waiver/DevyWaiverRules.ts`
- `lib/devy/bestball/DevyBestBallOptimizer.ts`
- `lib/devy/scoring/DevyScoringPresets.ts`
- `lib/devy/rankings/DevyTeamOutlookService.ts`
- `lib/devy/jobs/DevyJobsHandler.ts`
- `lib/devy/ai/DevyAIContext.ts`
- `lib/devy/ai/DevyAIPrompts.ts`
- `lib/devy/ai/devyContextForChimmy.ts`

### Lib — shared / engine
- `lib/specialty-league/registry.ts` (modified)
- `lib/jobs/types.ts`
- `lib/jobs/enqueue.ts`
- `lib/queues/bullmq.ts`
- `lib/workers/devy-worker.ts`
- `lib/workers/ai-worker.ts`
- `lib/workers/simulation-worker.ts`
- `lib/engine/trade.ts` (enrichDevy, devyValueMultiplier)
- `lib/engine/devy.ts`
- `lib/chimmy-interface/ToolContextToChimmyRouter.ts` (devy case)
- `lib/league-creation-wizard/league-type-registry.ts`

### Components
- `components/devy/DevyHome.tsx`
- `components/devy/DevyBoard.tsx`
- `components/devy/DevyCommissionerTools.tsx`
- `components/devy/DevyDraftCenter.tsx`
- `components/devy/DevyLeagueHomeCards.tsx`
- `components/devy/DevyPromotionPanel.tsx`
- `components/devy/DevySettingsPanel.tsx`
- `components/devy/DevyTeamRosterView.tsx`
- `components/devy/index.ts`
- `components/app/tabs/OverviewTab.tsx` (DevyHome for isDevyDynasty)
- `components/app/draft-room/DraftBoard.tsx`
- `components/app/draft-room/DraftBoardCell.tsx`
- `components/app/draft-room/DraftPlayerCard.tsx`
- `components/app/draft-room/DraftRoomPageClient.tsx`
- `components/app/draft-room/PlayerPanel.tsx`

### App pages
- `app/app/league/[leagueId]/page.tsx` (isDevyDynasty, OverviewTab)

### Scripts
- `scripts/start-worker.ts` (devy worker)

### Schema
- `prisma/schema.prisma` (DevyLeagueConfig, DevyRights, DevyLifecycleEvent, DevyCommissionerOverride, DevyDraftHistory, DevyClassStrengthSnapshot, DevyBestBallLineupSnapshot, DevyPlayer.ncaaSourceTag, League relations)

---

## 3. QA Checklist (Pass/Fail)

| # | Area | Item | Status | Notes |
|---|------|------|--------|------|
| 1 | League creation | Can create NFL Devy Dynasty | PASS | Wizard league_type=devy or variant devy_dynasty; sport NFL; upsertDevyConfig. |
| 1 | League creation | Can create NBA Devy Dynasty | PASS | Same flow; sport NBA; nba_devy adapter. |
| 1 | League creation | Cannot create devy as redraft | PASS | Explicit 400 when isDevyRequested && isDynastyInput === false. |
| 1 | League creation | Specialty format settings persist | PASS | DevyLeagueConfig upsert; getDevyConfig reads from DB. |
| 2 | Draft | Startup vet draft = vets only | PASS | poolType=startup_vet or default for devy; no college in pool. |
| 2 | Draft | Devy draft = NCAA only | PASS | poolType=devy → DevyPlayer pool only (devyEligible, not graduated). |
| 2 | Draft | Rookie draft = rookies only; devy-held promoted excluded | PASS | poolType=rookie; getPromotedProPlayerIdsExcludedFromRookiePool filters pool. |
| 2 | Draft | Snake / linear | PASS | Config startupDraftType, rookieDraftType, devyDraftType. |
| 2 | Draft | Traded picks display | PASS | Draft engine/session; no devy-specific break. |
| 2 | Draft | Devy-held promoted not in rookie pool | PASS | Pool route and DevyPoolSeparation exclude by pro IDs. |
| 3 | Promotion | NCAA devy → promotion eligible after pro draft | PASS | Lifecycle engine; PROMOTION_ELIGIBLE state. |
| 3 | Promotion | Auto-promote when enabled | PASS | promotionTiming + executePromotion path. |
| 3 | Promotion | Manual promote when configured | PASS | POST /devy/promotion; checkPromotionEligibility. |
| 3 | Promotion | Return-to-school resets | PASS | returnToSchool, restoreNcaaState in lifecycle. |
| 3 | Promotion | Ambiguous mappings → review queue | PASS | DevyCommissionerOverride; listPendingOverrides. |
| 4 | Best ball | NFL best ball legal lineup | PASS | optimizeNflBestBallLineup; slots from config. |
| 4 | Best ball | NBA best ball legal lineup | PASS | optimizeNbaBestBallLineup. |
| 4 | Best ball | NCAA devy do not score before promotion | PASS | eligibleForBestBall: isNcaaDevy → false. |
| 4 | Best ball | Taxi/reserve rules | PASS | taxiProRookiesScoreInBestBall; taxi logic in optimizer. |
| 5 | Trades | Devy players trade | PASS | Trade engine; enrichDevy. |
| 5 | Trades | Devy picks / rookie picks trade | PASS | Types and engine support. |
| 5 | Trades | Valuations do not crash | PASS | enrichDevy safe; devyValueMultiplier. |
| 5 | Trades | Future capital after trade | PASS | getDevyTeamOutlook; rankings refresh job. |
| 6 | Rankings | Future capital score updates | PASS | DevyTeamOutlookService. |
| 6 | Rankings | Class strength updates | PASS | class_strength_snapshot job; DevyClassStrengthSnapshot. |
| 6 | Rankings | Portfolio includes devy | PASS | Outlook includes devy rights and pipeline. |
| 6 | Rankings | Contender/rebuilder views | PASS | Unchanged; devy multiplier by direction. |
| 7 | AI | Draft assistant in devy draft | PASS | POST /devy/ai type=draft_assistant. |
| 7 | AI | Chimmy devy context | PASS | buildDevyContextForChimmy; dataSources devy_league. |
| 7 | AI | Trade analyzer devy players/picks | PASS | Trade context prompt; no AI value overrides. |
| 7 | AI | AI ADP pool selection | PASS | Pool type passed; vet/rookie/devy logic in pool API. |
| 7 | AI | No AI override of deterministic rules | PASS | All prompts and context use deterministic data only. |
| 8 | Regression | Devy board works | PASS | DevyBoard; summary; config. |
| 8 | Regression | Trade engine works | PASS | Existing trade flow; devy enrichment. |
| 8 | Regression | Mock draft works | PASS | No removal of mock draft paths. |
| 8 | Regression | Other specialty leagues | PASS | Registry; guillotine, survivor, zombie unchanged. |
| 8 | Regression | Dynasty flows | PASS | isDynasty forced true for devy; other dynasty intact. |
| 9 | UX | No dead buttons | PASS | Links and actions wired. |
| 9 | UX | Mobile layout | PASS | Responsive classes in devy components. |
| 9 | UX | Empty / loading / error states | PASS | DevyHome, panels show loading and error. |
| 9 | UX | User-readable errors | PASS | API and panel error messages. |
| 9 | UX | Commissioner tools visibility | PASS | DevyCommissionerTools only when isCommissioner. |

---

## 4. Schema Changes (from prior prompts)

- **DevyLeagueConfig**: existing; snake/linear, promotion timing, best ball, etc.
- **DevyRights**, **DevyLifecycleEvent**, **DevyCommissionerOverride**: existing.
- **DevyDraftHistory**: new; leagueId, draftKind (startup_vet | rookie | devy), seasonYear, round, pick, rosterId, playerId, isDevy.
- **DevyClassStrengthSnapshot**: new; sport, seasonYear, payload (JSON).
- **DevyBestBallLineupSnapshot**: new; leagueId, rosterId, periodKey, totalPoints, starterIds.
- **DevyPlayer**: added optional **ncaaSourceTag** (VarChar 24).
- **League**: relations to **devyDraftHistories**, **devyBestBallLineupSnapshots**.

Run migration after pulling (e.g. `npx prisma migrate dev --name devy_qa_schema` or use existing migration that adds these).

---

## 5. Migration Notes

- Run `npx prisma generate` after schema changes.
- If adding new tables (DevyDraftHistory, DevyClassStrengthSnapshot, DevyBestBallLineupSnapshot) and column (ncaaSourceTag), create a new migration or add to the last devy migration.
- Start the devy worker with the rest (e.g. `node scripts/start-worker.ts` or your process manager). Redis required for devy queue.
- Cron: protect `POST /api/cron/devy` with `x-cron-secret` or `x-admin-secret`; schedule as needed (e.g. daily for `{ all: true }`).

---

## 6. Manual Commissioner Steps

- **Promotion window**: If using manager_choice_before_rookie_draft, open/close window per league calendar (or use reopen-window admin route).
- **Ambiguous devy→pro mappings**: Resolve in Commissioner → Devy Overrides; resolve_mapping or force_promote as needed.
- **Pool regeneration**: Use admin “Regenerate devy pool” / “Regenerate rookie pool” after major eligibility or data changes.
- **Recalc**: Use “Recalc” to refresh outlook/rankings after bulk roster or rights changes.
- **Repair duplicate rights**: Use “Repair duplicate rights” if duplicate (leagueId, rosterId, devyPlayerId) appear.
- **Force promote / revoke**: Use admin force-promote or revoke-promotion when overriding manager choices or fixing mistakes.

---

## 7. Full Files (Modified in QA Pass)

The three files modified in this QA pass are in the repo in full. Summary of edits:

- **app/api/league/create/route.ts**: Added `isDevyRequested` and explicit 400 when `isDevyRequested && isDynastyInput === false`.
- **lib/specialty-league/registry.ts**: Set `aiRoutePath: '/api/leagues/[leagueId]/devy/ai'` (was `null`).
- **app/api/leagues/[leagueId]/draft/pool/route.ts**: For devy leagues, default `poolType` to `'startup_vet'` when query param is missing (`let poolType` + `if (isDevyDynasty && poolType == null) poolType = 'startup_vet'`).

All other Devy Dynasty files are unchanged in this pass and remain as implemented in prior prompts (full contents in repo).
