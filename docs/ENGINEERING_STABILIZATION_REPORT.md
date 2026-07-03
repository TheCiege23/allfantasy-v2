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
