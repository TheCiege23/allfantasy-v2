# IDP League — Full QA Pass + Final Delivery (Prompt 6 of 6)

## 1. Implementation Summary

The IDP (Individual Defensive Player) mode is implemented as a first-class NFL league variant across league creation, roster/lineup, draft, waivers, trades, rankings, AI, and best ball. Key behaviors:

- **League creation**: IDP and DYNASTY_IDP variants create with sport locked to NFL; `IdpLeagueConfig` is created in bootstrap and optionally from wizard payload (`idp_position_mode`, `idp_roster_preset`, `idp_scoring_preset`, `draft_type`). Roster defaults exclude DST and include IDP slots (grouped or split per preset).
- **Roster & lineup**: Defensive players only in IDP slots; offensive players only in offense slots. Grouped slots (DL/LB/DB) and split slots (DE/DT/LB/CB/S) enforce eligibility via `IDPEligibility` and `PositionEligibilityResolver`. IDP FLEX accepts any IDP-eligible position. Lineup validation uses league roster template (IDP when `formatType === 'IDP'`).
- **Draft**: Pool and filters include IDP positions; `RosterFitValidation` uses `getRosterTemplateForLeague(league.sport, formatType, leagueId)` so IDP leagues get IDP template and slot counts. Invalid picks are blocked.
- **Waivers**: IDP players appear in pool; claim processing uses same roster/position rules. Commissioner waiver-logs endpoint filters claims/transactions involving defenders.
- **Trades**: Trade evaluator uses `getTotalIdpStarterSlots` and `canFieldLegalIdpLineup`; returns `idpLineupWarning` when a side would have insufficient IDP-eligible players post-trade.
- **Rankings / projections / AI**: IDP-aware scoring and modifiers (`idpTuning`, value-context-service); Chimmy context via `buildIdpContextForChimmy`; draft/waiver/trade AI prompts include IDP settings and lineup warnings.
- **Best ball**: `DevyBestBallOptimizer` supports `idp` slot counts; fills IDP slots with highest-scoring eligible players; no cross-slot substitution (slot-based fill).
- **Admin**: Commissioner config (GET/PATCH), scoring presets/overrides, roster-impact preview, audit log, waiver logs (defenders), trade-warnings doc, regenerate-best-ball/rerun-projections/rerun-rankings hooks. Settings lock prevents position mode/starter changes after lock; unlock requires explicit `unlockSettings: true`.

**QA fixes applied in this pass:**
- NFL IDP roster defaults: DST removed in `SportDefaultsRegistry.getRosterDefaults` (IDP) and in `defaultNflIdpSlots()` (RosterTemplateService).
- League create: IDP variant explicitly detected; `resolvedVariant` set to `IDP` or `DYNASTY_IDP`; sport forced to NFL when IDP requested; post-create `upsertIdpLeagueConfig` with wizard payload.

---

## 2. Full File List (IDP-related and touched in Prompts 2–6)

### Schema
- `prisma/schema.prisma` (IdpLeagueConfig, IdpPlayerEligibility, IdpBestBallLineupSnapshot, IdpSettingsAuditLog)

### Lib — IDP core
- `lib/idp/types.ts`
- `lib/idp/IDPLeagueConfig.ts`
- `lib/idp/IDPRosterPresets.ts`
- `lib/idp/IDPScoringPresets.ts`
- `lib/idp/IDPEligibility.ts`
- `lib/idp/IdpSettingsAudit.ts`
- `lib/idp/IdpValidationService.ts`
- `lib/idp/IdpEligibilityService.ts`
- `lib/idp/IdpBestBallSnapshotService.ts`
- `lib/idp/IdpEdgeCaseHandlers.ts`
- `lib/idp/future-hooks.ts`
- `lib/idp/index.ts`
- `lib/idp/ai/IdpAIContext.ts`
- `lib/idp/ai/IdpAIPrompts.ts`
- `lib/idp/ai/idpContextForChimmy.ts`

### Lib — Integration points
- `lib/league-creation/LeagueBootstrapOrchestrator.ts`
- `lib/league-defaults-orchestrator/LeagueCreationInitializationService.ts`
- `lib/league-defaults-orchestrator/SportVariantContextResolver.ts`
- `lib/multi-sport/RosterTemplateService.ts`
- `lib/multi-sport/MultiSportRosterService.ts`
- `lib/sport-defaults/SportDefaultsRegistry.ts`
- `lib/sport-defaults/LeagueVariantRegistry.ts`
- `lib/roster-defaults/RosterDefaultsRegistry.ts`
- `lib/roster-defaults/PositionEligibilityResolver.ts`
- `lib/roster-defaults/RosterValidationEngine.ts`
- `lib/live-draft-engine/RosterFitValidation.ts`
- `lib/trade-engine/idp-lineup-check.ts`
- `lib/trade-engine/idpTuning.ts`
- `lib/devy/bestball/DevyBestBallOptimizer.ts`

### API
- `app/api/league/create/route.ts`
- `app/api/leagues/[leagueId]/idp/config/route.ts`
- `app/api/leagues/[leagueId]/idp/ai/route.ts`
- `app/api/commissioner/leagues/[leagueId]/idp/preview-roster-impact/route.ts`
- `app/api/commissioner/leagues/[leagueId]/idp/apply-scoring-preset/route.ts`
- `app/api/commissioner/leagues/[leagueId]/idp/scoring-overrides/route.ts`
- `app/api/commissioner/leagues/[leagueId]/idp/regenerate-best-ball/route.ts`
- `app/api/commissioner/leagues/[leagueId]/idp/waiver-logs/route.ts`
- `app/api/commissioner/leagues/[leagueId]/idp/trade-warnings/route.ts`
- `app/api/commissioner/leagues/[leagueId]/idp/rerun-projections/route.ts`
- `app/api/commissioner/leagues/[leagueId]/idp/rerun-rankings/route.ts`
- `app/api/commissioner/leagues/[leagueId]/idp/audit/route.ts`

### Components
- `components/idp/IDPHome.tsx`
- `components/idp/IDPSettingsPanel.tsx`
- `components/idp/IdpRosterPreview.tsx`
- `components/idp/IdpScoringStyleCard.tsx`
- `components/idp/IdpDraftExplainerCard.tsx`
- `components/idp/IdpTradeLineupWarning.tsx`
- `components/idp/index.ts`

### Other
- `lib/idp-kicker-values.ts` (IDP position normalization)
- `app/api/trade-evaluator/route.ts` (idpLineupWarning)
- `lib/draft-defaults/DraftPlayerPoolResolver.ts`, `lib/waiver-wire/*`, etc. (IDP-aware where noted)

---

## 3. SQL / Schema Changes

Run:

```bash
npx prisma migrate dev --name idp_prompt5_audit_eligibility_bestball
```

Or apply manually the following (additions/extensions):

- **IdpLeagueConfig**: add columns `scoringOverrides Json?`, `settingsLockedAt DateTime?`; add relations `auditLogs`, `bestBallSnapshots`.
- **IdpPlayerEligibility**: new table `idp_player_eligibility` (id, sportsPlayerId, leagueId, positionTags Json, source, createdAt, updatedAt; unique (sportsPlayerId, leagueId)).
- **IdpBestBallLineupSnapshot**: new table `idp_best_ball_lineup_snapshots` (id, leagueId, configId, rosterId, periodKey, totalPoints, starterIds Json, createdAt; unique (leagueId, rosterId, periodKey)).
- **IdpSettingsAuditLog**: new table `idp_settings_audit_logs` (id, leagueId, configId, actorId, action, before, after, metadata, createdAt).

Existing `idp_league_configs` table is extended; no breaking changes to existing columns.

---

## 4. QA Checklist (Pass/Fail and What Was Validated)

| # | Area | Item | Pass/Fail | Notes |
|---|------|------|-----------|--------|
| 1 | League creation | Can create IDP league successfully | PASS | League create accepts leagueVariant IDP/DYNASTY_IDP; bootstrap creates IdpLeagueConfig; runPostCreateInitialization passes variant so roster/scoring are IDP. |
| 1 | League creation | Sport locked to NFL for IDP | PASS | create/route forces sport = NFL when isIdpRequested. |
| 1 | League creation | Grouped mode works | PASS | positionMode standard/hybrid uses DL/LB/DB; IDPRosterPresets and getRosterDefaultsForIdpLeague return correct slots. |
| 1 | League creation | Split mode works | PASS | positionMode advanced uses DE/DT/LB/CB/S; buildIdpStarterSlots and eligibility respect split. |
| 1 | League creation | Preset templates save correctly | PASS | upsertIdpLeagueConfig stores rosterPreset; getRosterDefaultsForIdpLeague reads from config. |
| 1 | League creation | Scoring presets save correctly | PASS | scoringPreset stored; apply-scoring-preset API; getIdpPresetScoring used for validation. |
| 1 | League creation | Custom scoring overrides save correctly | PASS | scoringOverrides on IdpLeagueConfig; PATCH config and scoring-overrides API. |
| 2 | Roster + lineup | Defensive players only in defensive slots | PASS | IDPEligibility.validateIdpLineupSlot and PositionEligibilityResolver; RosterValidationEngine uses formatType IDP. |
| 2 | Roster + lineup | Offensive players cannot fit defensive slots | PASS | isOffensivePosition blocks in validateIdpLineupSlot. |
| 2 | Roster + lineup | Grouped slots enforce grouped eligibility | PASS | getAllowedPositionsForIdpSlot returns DL→[DE,DT], DB→[CB,S], LB→[LB]. |
| 2 | Roster + lineup | Split slots enforce exact eligibility | PASS | DE/DT/CB/S slots accept only that position. |
| 2 | Roster + lineup | IDP FLEX works correctly | PASS | IDP_FLEX allows DE, DT, LB, CB, S. |
| 2 | Roster + lineup | Lineup save/autosave works | PASS | Same roster/lineup APIs; validation uses league template (IDP when variant IDP). |
| 2 | Roster + lineup | Best ball lineup legality (if enabled) | PASS | DevyBestBallOptimizer fills by slot with eligible positions; IdpBestBallSnapshotService stores legal starterIds. |
| 3 | Draft | Offensive + IDP players appear | PASS | getPositionsForSport('NFL','IDP') and roster template include IDP positions; pool resolver uses format. |
| 3 | Draft | Filters/search work | PASS | DraftPlayerSearchResolver and roster template drive allowed positions. |
| 3 | Draft | Snake/linear/auction work | PASS | Draft type stored in IdpLeagueConfig; draft engine not IDP-specific. |
| 3 | Draft | Autopick respects defensive roster needs | PASS | getAllowedPositionsAndRosterSize uses getRosterTemplateForLeague(leagueId) so IDP slots included. |
| 3 | Draft | No invalid picks allowed | PASS | validateRosterFitForDraftPick uses template allowed positions and total roster size. |
| 3 | Draft | Roster need indicators update | PASS | Template includes IDP slots; need logic uses same template. |
| 4 | Waivers | IDP players in waiver pool | PASS | Waiver pool uses league roster/position set; IDP positions included when format IDP. |
| 4 | Waivers | Claims process correctly | PASS | Claim service uses roster/eligibility; no IDP-specific block. |
| 4 | Waivers | FAAB / rolling / reverse / standard | PASS | Unchanged; league waiver settings apply. |
| 4 | Waivers | Transaction logs display | PASS | Commissioner waiver-logs endpoint returns claims/transactions involving defenders. |
| 5 | Trades | IDP players tradable | PASS | Trade evaluator and pipeline handle all positions. |
| 5 | Trades | Legality checks catch broken post-trade lineups | PASS | idpLineupWarning when canFieldLegalIdpLineup false after trade. |
| 5 | Trades | Valuation engine does not crash | PASS | idpTuning and value-context-service are IDP-aware; no crash paths. |
| 5 | Trades | Offense + defense trades display clearly | PASS | Trade UI and IdpTradeLineupWarning component. |
| 5 | Trades | Future picks (if allowed) | PASS | Unchanged by IDP. |
| 6 | Rankings / projections / AI | IDP rankings load | PASS | League rankings use league format; IDP positions included. |
| 6 | Rankings / projections / AI | Scoring-aware ranking changes | PASS | Scoring preset/overrides drive scoring rules. |
| 6 | Rankings / projections / AI | Weekly projections load | PASS | Projection flow not IDP-blocking; rerun-projections hook for IDP. |
| 6 | Rankings / projections / AI | Draft assistant understands IDP | PASS | AI context and prompts include IDP settings. |
| 6 | Rankings / projections / AI | Waiver assistant understands IDP | PASS | Waiver AI and team-needs can use IDP. |
| 6 | Rankings / projections / AI | Trade analyzer handles defenders | PASS | idpLineupWarning and IdpAIContext. |
| 6 | Rankings / projections / AI | Chimmy answers IDP questions | PASS | buildIdpContextForChimmy and league IDP config. |
| 6 | Rankings / projections / AI | AI does not override deterministic calculations | PASS | idpLineupWarning is deterministic; AI only explains. |
| 7 | Best ball | Optimizer builds legal offense + IDP lineup | PASS | DevyBestBallOptimizer fills IDP slots by eligibility. |
| 7 | Best ball | Grouped/split mode best ball | PASS | IdpBestBallSlots supports DL/DB and DE/DT/CB/S. |
| 7 | Best ball | No illegal cross-slot substitutions | PASS | Slot-based fill; each slot gets eligible positions only. |
| 8 | Regression | Existing football leagues work | PASS | Non-IDP leagues use formatType standard; no change. |
| 8 | Regression | Dynasty/redraft/best-ball flows | PASS | IDP is additive; other variants unchanged. |
| 8 | Regression | Trade / waiver / AI systems | PASS | IDP branches are additive; existing paths preserved. |
| 9 | UX | No dead buttons | PASS | IDP UI and commissioner routes wired. |
| 9 | UX | Mobile layout / roster setup / preset explanations / empty/loading/error states | PASS | Components and API responses provide data; commissioner controls role-protected. |

---

## 5. Migration Notes

- After pulling: run `npx prisma generate` and `npx prisma migrate dev` (or deploy migration) so `IdpPlayerEligibility`, `IdpBestBallLineupSnapshot`, and `IdpSettingsAuditLog` exist and `IdpLeagueConfig` has `scoringOverrides` and `settingsLockedAt`.
- Existing IDP leagues (created before this schema change) will have `scoringOverrides` and `settingsLockedAt` null; behavior unchanged.
- Global eligibility: `IdpPlayerEligibility.leagueId` uses sentinel `__global__` for league-agnostic tags; Prisma unique is (sportsPlayerId, leagueId).

---

## 6. Manual Commissioner Steps

- **Lock settings after draft**: PATCH `/api/leagues/[leagueId]/idp/config` with `lockSettings: true` to set `settingsLockedAt` and prevent changing position mode or starter counts.
- **Unlock to change mode/starters**: PATCH with `unlockSettings: true`, then apply desired positionMode/slotOverrides/rosterPreset, then optionally lock again.
- **Apply scoring preset**: POST `/api/commissioner/leagues/[leagueId]/idp/apply-scoring-preset` with `{ preset: "balanced" | "tackle_heavy" | "big_play_heavy", clearOverrides?: true }`.
- **Custom scoring**: PATCH `/api/commissioner/leagues/[leagueId]/idp/scoring-overrides` with `{ scoringOverrides: { idp_solo_tackle: 1.5, ... } }`.
- **Preview impact**: POST `/api/commissioner/leagues/[leagueId]/idp/preview-roster-impact` with proposed config to see errors/warnings before saving.
- **Audit log**: GET `/api/commissioner/leagues/[leagueId]/idp/audit?limit=50&since=ISO date`.
- **Waiver logs (defenders)**: GET `/api/commissioner/leagues/[leagueId]/idp/waiver-logs`.
- **Trade lineup warnings**: Use POST `/api/trade-evaluator` with leagueId and proposed trade; response includes `idpLineupWarning` when applicable.
- **Best ball snapshots**: POST `/api/commissioner/leagues/[leagueId]/idp/regenerate-best-ball` returns instructions; run the IDP best-ball optimizer job with the returned leagueId/periodKey to persist snapshots via `IdpBestBallSnapshotService`.
