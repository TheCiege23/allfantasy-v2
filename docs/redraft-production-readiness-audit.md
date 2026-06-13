# Redraft Production-Readiness Audit

_Run 2026-06-13 on `origin/main` (base `b2fd56115`). Preserves `d045bd434` (C2C Phase 1) and `b2fd56115` (Redraft AF War Room Phase 1)._

Goal: clear production blockers before Redraft War Room Phase 2 — Vercel route budget, the
flagged NFL-redraft regression failures, and War Room Phase 1 verification. **No new War Room
features were added.** No DB schema changes.

---

## Step 1–2 — Vercel route budget: ALREADY SAFE (no consolidation needed)

The route limit is **not currently a blocker.** The 2091 figure was a prior state, since resolved
by ongoing route-budget work (456 route deletions across the last ~200 commits, multiple
"Fix Vercel route limit" commits) plus a build-time exclusion system.

Authoritative count via the canonical `scripts/audit-route-budget.cjs`:

| Metric | Value |
| --- | --- |
| Source app route files (incl. dev/admin) | 1858 (1565 `route.ts` + 293 `page.tsx`) |
| Build-excluded dev/admin/lab/e2e dirs | 43 dirs → 141 net routes excluded |
| **Production source routes (after exclusions)** | **1717** |
| Vercel config signals (crons) | 74 |
| **Production-adjusted signals** | **1791** |
| **Risk level** | **GREEN** (green < 1900, yellow 1900–2020, red 2021+) |

### Why it's safe
- Vercel runs `vercel-build` → `scripts/vercel-next-build.cjs`, which **temporarily moves
  dev/admin/lab/e2e/debug routes out of `app/` before `next build`** (141 routes), then restores
  them. These never count toward the production route budget.
- The exclusion list does **not** touch `app/api/leagues/[leagueId]/redraft-war-room/**` or any
  `leagues/*` production routes — the War Room's 2 routes are correctly counted and in production.
- Top clusters (`leagues/[leagueId]` 345, `commissioner/leagues` 59, `brackets/world-cup` 47) are
  live production features; consolidating them carries real breakage risk for zero budget benefit
  at GREEN.

### Decision
**No route consolidation performed.** Forcing dynamic-action refactors of large production clusters
(draft 56, commissioner 58) would risk breaking working features against the explicit "do not break
working features" constraint, with no budget need (we are 257 below the 2048 hard cap, 109 below the
1900 green threshold). The War Room already uses the consolidated 2-file pattern
(`route.ts` + `[action]/route.ts`). If budget pressure returns, the next safe lever is extending the
`vercel-next-build.cjs` exclusion list with more admin/diagnostic routes (the auditor lists
candidates under "Suspicious Production-Excludable Routes").

**Headroom for Phase 2:** ~257 routes to the hard cap; ~109 to GREEN threshold. Comfortable.

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

| Suite | Failures | Apparent class |
| --- | --- | --- |
| `nfl-redraft-snake-draft-board-state` | 7 | draft-room client/route patterns (pause/resume, fetch URL, `/drafts` redirect, `DraftBoard kind="live"`) |
| `nfl-redraft-responsive-ux-smoke` | 3 | testid refactors incl. the same `draft-chat-pick-headshot` → `PlayerAvatar` change |
| `nfl-redraft-player-card-data` | 3 | player image/injury/devy data-shape helpers |
| `nfl-redraft-pre-draft-validation-integration` | 1 | `DraftValidationOrchestrator` field shape (`rosterSize`) |

**Recommendation:** scope a focused follow-up to triage these 14 the same way (confirm each is an
intentional refactor before updating the lock; fix any that prove to be real draft-room regressions).
They do not touch the Redraft War Room or the route budget.

---

## Step 4 — Redraft War Room Phase 1 verification

No browser/auth runtime or seeded league was available, so per the Step 4 fallback the route contract
was proven with **route-level integration tests** (`__tests__/redraft-war-room-routes.test.ts`, 15
passing) that invoke the real handlers with the data/auth/AI boundaries mocked and the deterministic
engines running for real:

| Requirement | Verified by test |
| --- | --- |
| GET state works for a member | ✅ 200 + context + needs |
| Member cannot read another roster's personalized context | ✅ other teams' `players` stripped in GET; `rosterId` targeting another team → **403** in POST |
| Commissioner can access league-wide context | ✅ other teams retain `players`; may target any `rosterId` |
| POST waivers / lineup / trade-analyze / trade-find | ✅ each returns expected shape |
| Missing provider data → clear missing-data flags | ✅ waivers `needsProviderIntegration: true`; `missingDataFlags` surfaced |
| OpenAI failure does not crash `ask` | ✅ returns 200 `{ aiUnavailable: true, answer: null, grounding }` |
| `ask` is AF-gated | ✅ `requireAfSub` gate Response returned verbatim (402) |
| Unauthenticated / unknown action | ✅ 401 / 404 |

**Could not be verified without a runtime** (documented for a future manual/E2E pass): real Next.js
session cookies, live Prisma reads, the panel rendering in-browser, and Spanish/visual modes. The
panel itself is typecheck/lint-clean and its buttons call the real routes via `lib/redraft-war-room/client.ts`.

---

## Step 5 — Tests / lint / typecheck / diff

- **Fixed suites + War Room:** 126/126 passing (`nfl-redraft-pick-authority`, `-commissioner-controls`,
  `-core-tab-bar`, `-draft-chat-and-announcements`, `-league-dashboard`, `redraft-war-room`).
- **New route integration suite:** `redraft-war-room-routes` — 15/15 passing.
- **Lint:** clean on all touched/new files.
- **Typecheck:** zero errors in touched files (repo has a large pre-existing unrelated error baseline
  in other files; the touched test files add none).
- **`git diff --check`:** clean.
- **Route budget script:** GREEN (1791 production-adjusted), unchanged (no routes added).

---

## Remaining blockers / recommendations
1. **14 additional pre-existing NFL-redraft source-pattern failures** (table above) — triage in a
   focused follow-up; likely the same stale-lock class but require per-file confirmation.
2. **Live runtime verification** of the War Room panel + Spanish/visual modes still needs a seeded
   redraft league + authenticated session (or Playwright E2E).
3. **Provider integrations** remain the functional gap for Phase 2 (free-agent/waiver pool, live
   stats/projections, injuries/news) — the War Room already degrades safely without them.

## Should Vercel deploy?
**Yes for the route budget** — GREEN at 1791 production-adjusted signals, well under the 2048 cap.
The repo-wide pre-existing typecheck baseline and the 14 unrelated source-pattern test failures are
not deploy-blocking for Vercel (the build does not run these vitest suites), but should be cleared
before relying on the redraft draft-room test suite for CI confidence.
