# Redraft Production-Readiness Audit

_Run 2026-06-13 on `origin/main` (base `b2fd56115`). Preserves `d045bd434` (C2C Phase 1) and `b2fd56115` (Redraft AF War Room Phase 1)._

Goal: clear production blockers before Redraft War Room Phase 2 - Vercel route budget, the
flagged NFL-redraft regression failures, and War Room Phase 1 verification. Follow-up runtime work
exposes the existing Phase 1 panel in NFL redraft, adds trade-analyzer UI wiring, and adds seeded
runtime coverage. No DB schema changes and no route files were added.

---

## Step 1-2 - Vercel route budget: ALREADY SAFE (no consolidation needed)

The route limit is **not currently a blocker.** The 2091 figure was a prior state, since resolved
by ongoing route-budget work (456 route deletions across the last ~200 commits, multiple
"Fix Vercel route limit" commits) plus a build-time exclusion system.

Authoritative count via the canonical `scripts/audit-route-budget.cjs`:

| Metric | Value |
| --- | --- |
| Source app route files (incl. dev/admin) | 1745 (1452 `route.ts` + 293 `page.tsx`) |
| Build-excluded dev/admin/lab/e2e dirs | 43 dirs -> 141 net routes excluded |
| **Production source routes (after exclusions)** | **1604** |
| Vercel config signals (crons) | 74 |
| **Production-adjusted signals** | **1678** |
| **Risk level** | **GREEN** (green < 1900, yellow 1900-2020, red 2021+) |

### Why it's safe
- Vercel runs `vercel-build` -> `scripts/vercel-next-build.cjs`, which **temporarily moves
  dev/admin/lab/e2e/debug routes out of `app/` before `next build`** (141 routes), then restores
  them. These never count toward the production route budget.
- The exclusion list does **not** touch `app/api/leagues/[leagueId]/redraft-war-room/**` or any
  `leagues/*` production routes - the War Room's 2 routes are correctly counted and in production.
- Top clusters (`leagues/[leagueId]` 318, `commissioner/leagues` 59, `brackets/world-cup` 47) are
  live production features; consolidating them carries real breakage risk for zero budget benefit
  at GREEN.

### Decision
**No route consolidation performed.** Forcing dynamic-action refactors of large production clusters
(draft 56, commissioner 58) would risk breaking working features against the explicit "do not break
working features" constraint, with no budget need (we are 370 below the 2048 hard cap, 222 below the
1900 green threshold). The War Room already uses the consolidated 2-file pattern
(`route.ts` + `[action]/route.ts`). If budget pressure returns, the next safe lever is extending the
`vercel-next-build.cjs` exclusion list with more admin/diagnostic routes (the auditor lists
candidates under "Suspicious Production-Excludable Routes").

**Headroom for Phase 2:** ~370 routes to the hard cap; ~222 to GREEN threshold. Comfortable.

---

## Step 3 — NFL redraft regression failures

### The 8 flagged failures: FIXED ✅
All 8 were **stale source-pattern "regression-lock" tests** (they read source files as text and
regex-match them). Each broke because the underlying source was **intentionally refactored/improved**,
not regressed. Verified via `git log`/`git show` that each change was a deliberate commit. Tests were
updated narrowly to pin the *new* (stronger) contract without weakening coverage; doc comments updated
to match.

| Suite | Failures | Root cause (intentional change) | Fix |
| --- | --- | --- | --- |
| `nfl-redraft-pick-authority` | 3 | `lib/draft/execute-pick.ts` now routes **live** picks through canonical `submitPick` *before* the legacy guard (stronger than the old 410 block — live never reaches legacy tables) | Re-pinned the lock to the new contract: import of `submitPick`, live branch returns before the guard, guard still precedes legacy writes |
| `nfl-redraft-commissioner-controls` | 1 | `undoLastPick(leagueId, { reason, actorUserId })` gained a required audit-trail arg (Slice 4) | Regex now asserts leagueId + audit options are forwarded |
| `nfl-redraft-core-tab-bar` | 2 | Commit `1fc276d58` intentionally added a **Waivers tab** + **commissioner-gated Settings tab** to the redraft core | Dropped `settings` from forbidden list; added a new assertion that Settings stays `isCommissioner`-gated; generic settings-append located via `lastIndexOf` |
| `nfl-redraft-draft-chat-and-announcements` | 1 | Pick headshot now renders via shared `<PlayerAvatar testIdBase="draft-chat-pick-headshot" />` (emits `…-root/-image/-fallback` testids) | Assertion matches `testIdBase="draft-chat-pick-headshot"` |
| `nfl-redraft-league-dashboard` | 1 | Canonical full-screen draft room moved to `/drafts/[draftId]` (commit `50b53831c`) | Redirect assertion now expects `/drafts/${ds.id}` |

Result: **126/126 passing** across these 5 suites + the War Room suite.

### Additional 14 pre-existing failures discovered (OUT OF SCOPE — documented)
Running the full redraft/nfl-redraft suite set surfaced **14 more failures in 4 suites NOT named in
the Step 3 scope.** They are confirmed pre-existing (untouched by this work — only test files were
edited, all of which now pass) and appear to be the **same class of stale source-pattern locks** from
the draft-room canonicalization (`/drafts/[draftId]`), the `PlayerAvatar` refactor, and draft
client/validation data-shape changes. They were **not** edited here to avoid mislabeling a possible
real regression (e.g. validation `rosterSize`, player-card data shape) as "stale" without a per-file
source audit.

### RESOLVED (follow-up pass, 2026-06-13)
All 14 were triaged per-file against source + git history. **Every one was a stale source-pattern
lock broken by an intentional, verified refactor — no real source regression was found.** Tests were
updated narrowly to pin the new (often stronger) contract; no source was changed, no coverage weakened.

| Suite | # | Classification & resolution |
| --- | --- | --- |
| `nfl-redraft-snake-draft-board-state` | 7 | **Stale (refactor).** (a) Commissioner-action logic extracted into the `useCommissionerActions` hook → re-pointed the `handleCommissionerAction` body slice to `hooks/useCommissionerActions.ts`. (b) Resume **intentionally** no longer optimistically sets `status:'in_progress'` (defers to server snapshot to avoid clock drift; documented in source) → assertion now locks that behavior. (c) `/drafts/[draftId]` canonicalization → `/draft/live` redirects there; `/draft/room` redirects live drafts there and renders only mock inline. (d) Stricter inline gating `(in_progress&&onPause)||(paused&&onResume)`. |
| `nfl-redraft-responsive-ux-smoke` | 3 | **Stale (refactor).** (a) `draft-mobile-layout` testid moved to a separate JSX line (className/testid split) → whitespace-tolerant regex. (b) Commissioner controls consolidated into the topbar menu (commit `5e331bdbb`) → assert `draft-topbar-menu-toggle` instead of removed `draft-topbar-commissioner-primary`. (c) Chat headshot via shared `<PlayerAvatar testIdBase=…>`. |
| `nfl-redraft-player-card-data` | 3 | **Stale (enhancement).** Headshot + injury chains gained extra `unifiedProductView` fallbacks (primary source unchanged, now multiline); devy-rookie derivation reformatted across a newline (behavior identical). Regexes made whitespace-tolerant / lock the primary source. |
| `nfl-redraft-pre-draft-validation-integration` | 1 | **Stale (improvement, NOT a regression).** Roster-shape validation now delegates to the canonical `getEffectiveLeagueRosterTemplate` resolver instead of raw `League.rosterSize/starters` column selects; `League.scoring` still selected; phantom-`LeagueSettings` negative guards intact. Assertion updated to lock the canonical-resolver contract. |

**Verification:** all 4 suites pass; the previously-fixed suites + War Room suites still pass. After
the runtime harness update, the full redraft/draft-room sweep is **31 suites / 610 tests, 0
failures**. Route budget GREEN (1678).

---

## Step 4b — DB-backed runtime verification (2026-06-13, env available)

With `DATABASE_URL` + `NEXTAUTH_SECRET` available locally, the seeded runtime verification that
previously skipped was executed against the live Neon database. This surfaced and fixed several
**real** runtime bugs, and proved the backend end-to-end.

### Verified
- **Prisma/Neon connectivity:** confirmed (`SELECT 1`).
- **Seed runs against real Neon:** `scripts/seed-redraft-war-room-runtime.ts` creates the league,
  RedraftSeason, member + commissioner rosters/players, matchups, projections, and weekly scores.
- **Backend route logic proven:** calling `buildRedraftWarRoomContext({ leagueId, memberUserId })`
  directly returns `ok: true` in ~1.2s with `teams=2` and the correct member roster — i.e. the
  consolidated `GET /redraft-war-room` state route works against real data, with correct
  member-vs-commissioner roster scoping.
- **Route-contract E2E (`@db`) rewritten** to assert auth/privacy/scope via `page.request`
  (unauthenticated → 401; member sees other teams with players stripped; cross-roster POST → 403;
  commissioner sees league-wide rosters).

### Real bugs fixed during runtime verification
| Bug | Root cause | Fix |
| --- | --- | --- |
| Seed crashed (`P2021`) | `sports_core_injury_reports` / `_player_news_items` tables are a separate platform-backend foundation not present in this DB | Seed now skips optional provider-table ops when absent (`tryOptionalProviderOp`); War Room already flags injuries/news as missing — truthful provider-limited state |
| Seed flaky on Neon cold-start | Neon serverless auto-suspends; first connection after idle fails | `connectWithRetry()` before seeding |
| Playwright `beforeAll` crash | `await import('../scripts/…ts')` — Playwright doesn't transform TS outside `e2e/` | Seed now runs as a child process (`node --import tsx`) |
| **Auth P2002 race (app-wide)** | `ensureSharedAccountProfile` did a `userProfile.upsert`; the league page's parallel authenticated requests race the create → `Unique constraint failed on userId` → 500s `getServerSession` and every API call behind it (including the War Room state route) | `lib/auth/SharedAccountBootstrapService.ts` now tolerates P2002 (row exists → settle with an update) |
| War Room tab didn't stay active | `?view=war_room` deep-link lost a `useSearchParams` hydration race with the NFL redraft landing-default effects, bouncing the user to Home | LeagueShell records an explicit tab pick (`userPickedTabRef` via `handleUserTabChange`); landing-default effects bail when the user has explicitly chosen a tab |
| Panel gate / observability | gate keyed only on `leagueType`; loading/error states had no testids | gate now also accepts `format === 'redraft'`; panel loading/error states expose `redraft-war-room-loading` / `redraft-war-room-error` testids |

### Known remaining gap (honest status)
The **full browser UI flow** (`member opens … real UI buttons`) is still **intermittent under the
local `next dev` Playwright server**: the seed in `beforeAll` occasionally hits a Neon cold-start
transient under the dev server's concurrent startup load, and the panel's first state fetch is
sensitive to dev-mode route-compile timing. The backend, auth/privacy/scope, and route contract are
verified (direct call + the 15 passing `redraft-war-room-routes` vitest integration tests + the
rewritten `@db` route-contract spec); the full UI click-through needs a final stabilization pass
(warm DB / production build, or further harness hardening) before it is reliably green in CI.

**Phase 2 gating:** backend + auth + route contract are solid and the real runtime bugs are fixed.
The one redraft-only item still open before declaring runtime "green" is stabilizing the full UI
E2E click-through; it is not a backend or data-correctness blocker.

---

## Step 4 - Redraft War Room Phase 1 runtime verification

Follow-up runtime coverage was added on 2026-06-13 for the Redraft War Room Phase 1 surface. The
work remains redraft-only and does not touch playoffs, standings, trades outside the redraft War
Room tools, commissioner workflow, roster workflow, or league mechanics.

### Frontend mount correction
The Phase 1 panel was already implemented and gated in `WarRoomTab`, but pure NFL redraft leagues
could not reliably reach it because the compact NFL redraft tab list omitted `war_room`. NFL redraft
now exposes the War Room tab as a first-class redraft surface:

- `app/league/[leagueId]/LeagueTabs.tsx` includes `war_room` in `NFL_REDRAFT_CORE_TAB_IDS`.
- `app/league/[leagueId]/LeagueShell.tsx` includes `{ id: 'war_room', label: 'War Room' }` in the
  compact NFL redraft tab array.
- `__tests__/nfl-redraft-core-tab-bar.test.ts` locks the visible tab order:
  Home / Roster / Matchups / Players / Waivers / Trades / War Room / League, plus commissioner-only
  Settings.

### UI tool wiring
`app/league/[leagueId]/tabs/redraft/RedraftWarRoomPanel.tsx` now exposes all deterministic Phase 1
tool actions from the consolidated route set:

- Start/Sit (`lineup`)
- Waivers (`waivers`)
- Trade analyzer (`trade-analyze`)
- Trade finder (`trade-find`)
- AF War Room-gated Ask (`ask`, `war_room_draft_strategy`)

The trade analyzer UI calls the existing redraft-specific client helper and route action. No new
route files were added, so the Vercel route budget is unchanged.

### Seeded runtime harness
`scripts/seed-redraft-war-room-runtime.ts` creates an idempotent, synthetic NFL redraft league for
browser/runtime testing:

- League: `rwr-runtime-nfl-redraft-league`
- Member: `rwr_runtime_member` / `Password123!` (not AF-entitled)
- Commissioner: `rwr_runtime_commish` / `Password123!` (seeded with `af_war_room` entitlement)
- Outsider: `rwr_runtime_outsider` / `Password123!`
- Redraft season, legacy roster membership rows, league teams, redraft rosters, redraft players,
  matchups, projections, weekly stats, injuries, and news are all labeled synthetic/runtime-seed.

The package script `seed:redraft-war-room-runtime` runs the same helper directly.

### Playwright runtime spec
`e2e/redraft-war-room-runtime.spec.ts` verifies the real Next/auth route chain when `DATABASE_URL`
and `NEXTAUTH_SECRET`/`AUTH_SECRET` are present:

- member login and War Room tab/panel visibility
- real UI POSTs for `lineup`, `waivers`, `trade-analyze`, and `trade-find`
- non-entitled member `ask` returns the locked/402 state
- unauthenticated GET returns 401
- member privacy strips other team player lists and forbids targeting an opponent roster
- commissioner can read league-wide roster context
- entitled commissioner `ask` returns 200 and either an answer or the safe AI-unavailable fallback
- mobile Spanish/dark-mode smoke with the panel still reachable

Local execution in this worktree was parse-verified and ran as **4 skipped** because no DB/auth env
was available. The gating is intentional: it prevents accidental writes to an unknown database while
keeping the runtime proof executable in CI/staging with real credentials.

### Non-browser fallback coverage
Route-level integration tests still prove the server contract with mocked auth/data/AI boundaries and
real deterministic engines (`__tests__/redraft-war-room-routes.test.ts`, 15 passing):

| Requirement | Verified by test |
| --- | --- |
| GET state works for a member | ✅ 200 + context + needs |
| Member cannot read another roster's personalized context | ✅ other teams' `players` stripped in GET; `rosterId` targeting another team → **403** in POST |
| Commissioner can access league-wide context | ✅ other teams retain `players`; may target any `rosterId` |
| POST waivers / lineup / trade-analyze / trade-find | ✅ each returns expected shape |
| Missing provider data → clear missing-data flags | ✅ waivers `needsProviderIntegration: true`; `missingDataFlags` surfaced |
| OpenAI failure does not crash `ask` | returns 200 `{ aiUnavailable: true, answer: null, grounding }` |
| `ask` is AF War Room-gated | `war_room_draft_strategy` gate Response returned verbatim (402) |
| Unauthenticated / unknown action | 401 / 404 |

Component-level UI integration was also added in `__tests__/redraft-war-room-panel.test.ts` (2
passing). It renders the panel, proves the lineup/waivers/trade-analyze/trade-find buttons call the
client helpers, confirms provider-limited waiver messaging is surfaced, and confirms the locked
Ask note is displayed for a 402 response.

---

## Step 5 — Tests / lint / typecheck / diff

- **War Room UI/component suite:** `redraft-war-room-panel` - 2/2 passing.
- **Route integration suite:** `redraft-war-room-routes` - 15/15 passing.
- **Core deterministic suite:** `redraft-war-room` - 12/12 passing.
- **NFL redraft tab regression lock:** `nfl-redraft-core-tab-bar` updated and passing with War Room
  in the compact redraft tab list.
- **Full redraft/draft-room sweep:** 31 files / 610 tests passing (excluding only the playoff trade
  contract suite per the project restriction).
- **Playwright runtime spec:** `e2e/redraft-war-room-runtime.spec.ts` parse/list verified; local run
  skipped 4/4 because this worktree did not have `DATABASE_URL` and `NEXTAUTH_SECRET`/`AUTH_SECRET`.
- **Lint:** clean on all touched/new files, with pre-existing `LeagueShell.tsx` hook/no-img warnings.
- **Typecheck:** full repo `npm run typecheck` still fails on a large unrelated baseline. A
  touched-file graph check shows no remaining errors in the new E2E spec or seed helper after the
  CSRF-token narrowing fix; remaining errors are pre-existing imported-file issues.
- **`git diff --check`:** clean.
- **Route budget script:** GREEN (1678 production-adjusted), unchanged by this work (no route files added).

---

## Remaining blockers / recommendations
1. ~~14 additional pre-existing NFL-redraft source-pattern failures~~ — **RESOLVED** (see §RESOLVED
   above). All confirmed stale locks from intentional refactors; locks updated, no source bugs found.
   **Full redraft/draft-room sweep is green: 31 suites / 610 tests, 0 failures.**
2. **Live DB-backed browser verification** now has an executable seeded Playwright path, but it still
   must be run in an environment with `DATABASE_URL` and `NEXTAUTH_SECRET`/`AUTH_SECRET` before
   claiming full runtime clearance.
3. **Provider integrations** remain the functional gap for Phase 2 (free-agent/waiver pool, live
   stats/projections, injuries/news) — the War Room already degrades safely without them.

## Redraft cleared for War Room Phase 2?
**Partially.** The draft-room test blocker is cleared, the compact NFL redraft shell now exposes the
War Room tab, the deterministic route/UI contract is covered, and route budget is GREEN (1678
production-adjusted). Full Phase 2 clearance should wait for the DB-backed Playwright spec to pass in
CI/staging with real auth and database env.

## Should Vercel deploy?
**Yes for the route budget** — GREEN at 1678 production-adjusted signals, well under the 2048 cap.
The repo-wide pre-existing typecheck baseline (unrelated files) is not deploy-blocking for Vercel
(the build does not run vitest), and the redraft draft-room suite is now fully green for CI confidence.
