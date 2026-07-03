# Engineering Stabilization Report

## Purpose

This stabilization pass focused on repository-wide engineering blockers identified during G50A/G50B:

- TypeScript validation health
- production build health
- test runner stability
- G45-G50B regression safety

No product behavior, provider architecture, Decision OS, Commissioner OS, Manager OS, or AI reasoning was added.

## TypeScript Issues Fixed

### TypeScript Project Boundary

`tsconfig.json` previously included many stale local Next.js generated type directories:

- `.next-dev-*`
- `.next-playwright-*`
- `.next-build-fix-*`
- historical one-off build/debug output directories

That caused repository validation to crawl historical generated artifacts instead of just source and active `.next/types`.

Change:

- Keep source roots and active `.next/types`.
- Exclude generated `.next-*` output broadly.

This is a validation-scope cleanup only. It does not change runtime behavior.

### Prisma Singleton Type Cycle

`lib/prisma.ts` had a circular type definition:

- `ExtendedPrismaClient = ReturnType<typeof createPrismaClient>`
- `createBuildPhaseStubClient()` returned `ExtendedPrismaClient`
- `createPrismaClient()` used the build stub

Change:

- Define `ExtendedPrismaClient` explicitly as the Prisma client-facing type.
- Cast the `$extends` result at the singleton boundary.

This breaks the compiler cycle while preserving the existing retry extension and build-phase stub behavior.

### Player Data / Rookie Metadata Typing

Fixed strict typing in the shared player-data path:

- `UnifiedProductMeta` now correctly returns `firstName` and `lastName`.
- `NormalizedDraftEntry` loose metadata reads cast through `unknown` before record access.
- NFL rookie source policy now accepts provider-normalized unknown/string/number draft-year and experience inputs.
- `playerExperience` uses safe metadata record access.

Affected files:

- `lib/player-data/unifiedPlayerProductView.ts`
- `lib/player-data/playerExperience.ts`
- `lib/providers/nflRookieSourcePolicy.ts`

### User Settings Provider Map

`SignInProviderId` includes `spotify`, but the settings provider ID/name maps omitted it.

Change:

- Add Spotify to `SIGN_IN_PROVIDER_IDS`.
- Add Spotify display name.
- Treat Spotify as currently not configured unless product auth wiring enables it.

### Prisma JSON Input Boundaries

Prisma JSON writes were receiving `Record<string, unknown>` payloads directly in:

- `lib/user-settings/UserSettingsService.ts`
- `lib/clear-sports/sync.ts`

Change:

- Cast canonical JSON payloads at Prisma input boundaries with explicit `Prisma.InputJsonValue`.
- Preserve the existing payload shape and persistence behavior.

## Build Issues Fixed

Fixed:

- TypeScript generated-artifact include bloat in `tsconfig.json`.
- Shared-module type blockers in Prisma, player data, settings, and ClearSports sync.

Not fixed:

- Full production build did not complete in this environment within the 10-minute tool limit.

Attempted command:

```text
cmd /c npm run build
```

Result:

- Timed out after 10 minutes.
- The Next build worker was still running and was stopped after timeout.
- No actionable compiler/build diagnostic was emitted before the timeout.

## Remaining Environmental And Repository Blockers

### Full TypeScript Validation Still Blocked

Attempted:

```text
cmd /c npm run typecheck
```

Result:

- Timed out after 10 minutes without diagnostics.

Attempted compiler API full pass:

```text
typescript.createProgram(parsed.fileNames, ...)
```

Result:

- Failed with Node heap exhaustion near 4 GB.

The scoped shared-module TypeScript check passes, but the repository-wide compiler pass remains too large/noisy for this environment.

### Pre-Existing Strict Errors Remain Outside The Stabilized Shared Path

The old `tsconfig.tsbuildinfo` diagnostic cache still lists many pre-existing errors across unrelated modules, including:

- broad implicit-any errors in legacy API routes
- survivor/zombie/tournament route typing
- mock draft route typing
- standings/matchup legacy service typing
- legacy FantasyCalc/trade-value route shapes
- dashboard/page strict-null issues

Those are not safe to batch-fix in this stabilization pass without broad product risk.

### Test Environment Contention

Active unrelated Node/npm/dev-server processes were present during validation. They were not stopped unless they were clearly launched by this gate.

Observed impact:

- earlier broad Vitest runs timed out at worker startup
- full Playwright proof timed out waiting for the local web server in the previous release-gate pass

## Test Stability Improvements

Direct improvements:

- Narrowed TypeScript validation scope away from stale generated artifacts.
- Verified touched shared modules with a scoped TypeScript compiler API pass.
- Ran focused G45-G50B regression-adjacent tests with one worker to avoid worker pool contention.

## Verification Results

### Scoped TypeScript

Passed:

```text
TypeScript compiler API scoped check:
types/next-auth.d.ts
types/web-push.d.ts
lib/prisma.ts
lib/player-data/unifiedPlayerProductView.ts
lib/player-data/playerExperience.ts
lib/providers/nflRookieSourcePolicy.ts
lib/sports-live-scores-service.ts
lib/user-settings/UserSettingsService.ts
lib/clear-sports/sync.ts
```

Result:

- 0 diagnostics.

### Tests

Passed:

```text
cmd /c npx vitest run __tests__/g50a-nfl-redraft-production-verification.test.ts --pool=threads --maxWorkers=1 --reporter=verbose
```

- 1 file passed
- 6 tests passed

Passed:

```text
cmd /c npx vitest run __tests__/g50b-nfl-redraft-release-candidate.test.ts --pool=threads --maxWorkers=1 --reporter=verbose
```

- 1 file passed
- 4 tests passed

Passed:

```text
cmd /c npx vitest run __tests__/g46b-nfl-redraft-player-media-metadata.test.ts --pool=threads --maxWorkers=1 --reporter=verbose
```

- 1 file passed
- 5 tests passed

Passed:

```text
cmd /c npx vitest run __tests__/g46c-nfl-redraft-player-intelligence-data.test.ts --pool=threads --maxWorkers=1 --reporter=verbose
```

- 1 file passed
- 6 tests passed

Passed:

```text
cmd /c npx vitest run __tests__/providers/clearsports-capabilities.test.ts --pool=threads --maxWorkers=1 --reporter=verbose
```

- 1 file passed
- 5 tests passed

### ESLint

Passed:

```text
cmd /c npx eslint lib/prisma.ts lib/player-data/unifiedPlayerProductView.ts lib/player-data/playerExperience.ts lib/providers/nflRookieSourcePolicy.ts lib/user-settings/UserSettingsService.ts lib/clear-sports/sync.ts
```

Note: `tsconfig.json` was not linted with ESLint because the repo's ESLint invocation parsed it as JavaScript.

## Intentionally Deferred Issues

Deferred because they are broad, unrelated, or require product-specific ownership:

- repository-wide implicit-any cleanup across legacy routes
- survivor/zombie/tournament strict typing
- full legacy mock-draft route type cleanup
- production build timeout root-cause beyond TypeScript project boundary
- Playwright web server startup stability
- unrelated dirty worktree/generated artifact cleanup

## Engineering Readiness

Current status: NOT engineering-ready for the next phase.

Reason:

- Full TypeScript validation does not complete cleanly.
- Production build does not complete cleanly.
- The repo still has many pre-existing strict-mode blockers outside the shared stabilization path.

What improved:

- G45-G50B redraft provider/runtime tests still pass.
- Touched shared modules now pass scoped TypeScript and targeted ESLint.
- The TypeScript project no longer intentionally includes historical generated Next output roots.

## Stabilization Pass 2

Date: 2026-07-03

Scope:

- Find high-impact repo-wide TypeScript/build blockers without broad refactors.
- Prefer smaller module-group checks over another blind full-repo pass.
- Fix only verified compile blockers and document remaining timeout boundaries.

### Diagnostic Groups Checked

Passed after fixes:

```text
cmd /c node C:\tmp\af-ts-scope-diagnostics.cjs lib/auth.ts lib/prisma.ts lib/player-data lib/redraft-premium lib/nfl-provider lib/clear-sports lib/sports-live-scores-service.ts lib/draft-room lib/scoring-runtime lib/fantasycalc-db.ts lib/idp lib/devy/lifecycle/DevyAuditLog.ts lib/player-identity/playerMismatchLogger.ts lib/live-draft-engine lib/roster-lineup-engine lib/merged-devy-c2c/lifecycle/C2CAuditLog.ts lib/ai-learning-system/recordEvent.ts lib/league-chat/LeagueChatMessageService.ts lib/guillotine/GuillotineLeagueConfig.ts app/league/[leagueId]/LeagueShell.tsx components/war-room/WarRoomPanel.tsx lib/world-cup/worldCupI18n.ts
```

Result:

- 209 roots checked.
- 0 diagnostics after fixes.

Passed:

```text
cmd /c node C:\tmp\af-ts-scope-diagnostics.cjs lib/redraft-premium lib/nfl-provider lib/provider-orchestrator lib/player-data lib/scoring-runtime
```

Result:

- 52 roots checked.
- 0 diagnostics.

Timed out:

```text
cmd /c node C:\tmp\af-ts-scope-diagnostics.cjs components
cmd /c node C:\tmp\af-ts-scope-diagnostics.cjs app/api/redraft app/api/leagues app/api/sports app/api/cron
cmd /c node C:\tmp\af-ts-scope-diagnostics.cjs app/api/redraft
cmd /c node C:\tmp\af-ts-scope-diagnostics.cjs app/api/leagues
cmd /c node C:\tmp\af-ts-scope-diagnostics.cjs app/api/sports/weather/route.ts app/api/cron/import-scores/route.ts app/api/cron/import-schedules/route.ts app/api/cron/import-standings/route.ts app/api/cron/import-injuries/route.ts
cmd /c node C:\tmp\af-ts-scope-diagnostics.cjs app/api/redraft/premium-services/route.ts app/api/redraft/score-sync/route.ts app/api/redraft/roster/route.ts app/api/redraft/waiver-process/route.ts
cmd /c node C:\tmp\af-ts-scope-diagnostics.cjs app/api/leagues/[leagueId]/draft/pool/route.ts app/api/leagues/[leagueId]/scoring/matchups/route.ts app/api/leagues/[leagueId]/trades/[tradeId]/process/route.ts
```

Classification:

- Environment/tooling limit for these route and component graphs in this workspace.
- No actionable diagnostics were emitted before timeout.
- Pass 3 should split route validation by dependency boundary or use a lighter route-type harness.

### Errors Fixed

Fixed shared TypeScript blockers:

- Added `lib/prisma-json.ts` helper for Prisma JSON input casts.
- Normalized Prisma JSON writes in fantasy calc, IDP audit, devy/C2C lifecycle audit, player mismatch logging, live scoring snapshots, roster assignment, lineup locks, league chat, guillotine config, Chimmy alert preferences, data warehouse simulations, league graph snapshots, survivor idol ledger entries, and AF learning events.
- Tightened draft-room rookie diagnostic types so provider metadata can be inspected without assuming `Record<string, unknown>`.
- Fixed NFL redraft scoring runtime active-rule assumptions for the generated canonical scoring type.
- Replaced stale redraft live-scoring roster include assumptions with explicit roster-player loading.
- Fixed draft pool cache and sports-player delegate casts by going through `unknown` first.
- Fixed nullable draft timer and IDP position arguments.
- Fixed `LeagueShell` missing `MessageSquare` import.
- Restored `WarRoomPanel` draft-room link handler using the existing dashboard overlay bridge.
- Removed duplicate World Cup translation keys that blocked TypeScript parsing.
- Fixed strict Decision OS type checks without adding OS behavior: guarded partial cohort templates, removed stale input read, and used unknown-first view-model field probes.

### Verification Results

Passed:

```text
cmd /c npx vitest run __tests__/g50a-nfl-redraft-production-verification.test.ts __tests__/g50b-nfl-redraft-release-candidate.test.ts --pool=threads --maxWorkers=1 --reporter=verbose
```

- 2 files passed.
- 10 tests passed.

Passed:

```text
cmd /c npx vitest run __tests__/g47b-nfl-redraft-live-stats-scoring-refresh.test.ts --pool=threads --maxWorkers=1 --reporter=verbose
```

- 1 file passed.
- 5 tests passed.

Passed after isolated rerun:

```text
cmd /c npx vitest run __tests__/g49f-nfl-redraft-premium-evidence-observability.test.ts --pool=threads --maxWorkers=1 --reporter=verbose
```

- 1 file passed.
- 7 tests passed.

Note:

- The first combined `g47b` + `g49f` run hit a Vitest worker startup timeout before `g49f` executed. The isolated `g49f` rerun passed, so this is classified as worker-pool/environment pressure rather than a test regression.

Targeted ESLint:

```text
cmd /c npx eslint app/league/[leagueId]/LeagueShell.tsx components/war-room/WarRoomPanel.tsx lib/prisma-json.ts lib/draft-room/draftPlayerRookie.ts lib/draft-room/draftRoomRookieDiagnostics.ts lib/draft-room/draftPoolPositionGroups.ts lib/draft-room/ensureDraftPoolReady.ts lib/scoring-runtime/canonicalNflRedraftScoringRuntime.ts lib/scoring-runtime/resolveNflRedraftLiveScoringRuntime.ts lib/redraft-premium/nflRedraftPremiumObservability.ts lib/fantasycalc-db.ts lib/idp/IdpSettingsAudit.ts lib/devy/lifecycle/DevyAuditLog.ts lib/player-identity/playerMismatchLogger.ts lib/redraft/scheduleEngine.ts lib/live-draft-engine/DraftSessionService.ts lib/live-draft-engine/RosterAssignmentService.ts lib/roster-lineup-engine/lineupLockService.ts lib/merged-devy-c2c/lifecycle/C2CAuditLog.ts lib/ai-learning-system/recordEvent.ts lib/league-chat/LeagueChatMessageService.ts lib/guillotine/GuillotineLeagueConfig.ts lib/chimmy-alerts/ChimmyAlertPreferencesService.ts lib/data-warehouse/FantasyDataWarehouse.ts lib/league-intelligence-graph/GraphSnapshotService.ts lib/survivor/SurvivorIdolRegistry.ts lib/decision-os/manager-dna.ts lib/world-cup/worldCupI18n.ts lib/decision-os/phase6/company/company-intelligence.ts lib/sport-teams/SportPlayerPoolResolver.ts
```

Result:

- 0 errors.
- 4 existing warnings in `app/league/[leagueId]/LeagueShell.tsx`.

### Full Typecheck And Build Status

Still blocked:

```text
cmd /c npm run typecheck
```

Result:

- Timed out after 10 minutes.
- No final diagnostics emitted.

Still blocked:

```text
cmd /c npm run build
```

Result:

- Timed out after 10 minutes.
- No final build result emitted.

### Remaining Blockers

Code errors:

- No diagnostics remain in the 209-root shared/redraft/provider/app-shell scope checked in Pass 2.
- No diagnostics remain in the focused provider/premium/runtime library scope.

Environment/tooling limits:

- Full TypeScript still does not complete in this workspace.
- Production build still does not complete in this workspace.
- Large Next route/component scoped checks time out before emitting diagnostics.
- Vitest can still hit worker startup timeouts when multiple heavy suites run together, though isolated suites pass.

Generated/unrelated artifacts:

- The worktree still contains unrelated generated Next/Playwright output and many unrelated dirty files.
- These were intentionally left untouched.

### Recommended Pass 3 Scope

- Build a persistent route-type diagnostic harness that compiles one Next route and its direct imports without loading the full app graph.
- Split `components` validation into ownership bands instead of one subtree.
- Investigate why `npm run typecheck` emits no progress before the 10-minute timeout.
- Investigate production build stall with a build profiler or smaller Next segment builds.
- Keep generated `.next-*` and Playwright artifacts out of stabilization commits.
