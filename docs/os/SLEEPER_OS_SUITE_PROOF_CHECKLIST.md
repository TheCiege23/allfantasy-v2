# Sleeper OS Suite Proof Checklist

**Status: verification procedure + harness. No production data touched. No fake data used anywhere
in this procedure — every step either reads/writes real (if currently activity-empty, or now
real-activity-populated per Increment 7) imported league data, or honestly reports why a signal
isn't populated yet.**

**Date:** 2026-07-08 · **Branch:** `g15-event-foundation`. **Phase D Increment 6, updated by
Increment 7** (successor to
[`FANTASY_OS_SUITE_CLIENT_AGNOSTIC_ROADMAP.md`](FANTASY_OS_SUITE_CLIENT_AGNOSTIC_ROADMAP.md),
[`USER_OS_MANAGER_OS_SLEEPER_PROOF_AUDIT.md`](USER_OS_MANAGER_OS_SLEEPER_PROOF_AUDIT.md), and
[`PLATFORM_OS_CLIENT_INTELLIGENCE_AUDIT.md`](PLATFORM_OS_CLIENT_INTELLIGENCE_AUDIT.md)).

---

## 1. What this proves, and what it honestly does not yet

This procedure proves that **Commissioner OS, User OS, and Platform OS all resolve correctly
against a real, non-prod database, for a real (Sleeper-imported) league** — the same code path used
in production, run against real infrastructure instead of a unit-test fixture.

**As of Increment 7, it can also populate real, non-zero trade/waiver/draft-activity signals** for
that same league — see the new §3b. The standard Sleeper import pipeline (§3) populates
`League`/`LeagueTeam`/`Roster` (so the league is real, navigable, and viewable) but never populated
`DecisionOsImportedActivity` (the table Decision OS's behavioral pipeline reads) on its own — this
was already flagged in
[`DECISION_OS_PHASE_A_IMPLEMENTATION.md`](DECISION_OS_PHASE_A_IMPLEMENTATION.md) §3 and
[`USER_OS_MANAGER_OS_SLEEPER_PROOF_AUDIT.md`](USER_OS_MANAGER_OS_SLEEPER_PROOF_AUDIT.md) §11.
**Increment 7's new orchestration script (§3b) closes this gap** — it fetches that same league's
real trades/waivers/roster-moves/draft-picks from the public Sleeper API and runs them through the
already-built Phase A pipeline. **Honesty caveat, carried forward from every prior "real Sleeper"
step in this workstream:** this script's logic is real and type-correct, reusing only already-tested
pipeline pieces, but has **not been executed against a live Sleeper league in this sandbox** — there
is no live network access here. Running it for real, against a real non-prod database and a real
Sleeper league, is the next concrete step (§9).

---

## 2. Prerequisites

- A non-production `DATABASE_URL` (e.g. a throwaway Neon project, the same kind used for every
  other real-DB proof in this workstream — never the production host, `ep-curly-block`, which every
  script below hard-refuses).
- Node + `npx tsx` available (already a repo dependency).
- No production DB credentials should ever be set in the shell running these commands.

---

## 3. Step 1 — Seed one real imported Sleeper league (existing script, unchanged)

```
DATABASE_URL=<your-nonprod-db> npx tsx scripts/decision-os-import-sleeper-nonprod.ts \
  --account=<a real Sleeper username> \
  --league=<a real Sleeper league id, recommended over discovery>
```

This runs the **actual production import pipeline** (`runImportedLeagueNormalizationPipeline` →
`buildCanonicalImportBundle` → `persistImportWithCanonicalAudit`), sourced from the **public Sleeper
API** (a real, live fetch — not a fixture), against your non-prod database only. It creates a
dedicated, clearly-named importer account (`decision-os-nonprod-importer@allfantasy.local`) to own
the import, and prints:

```
IMPORTED_LEAGUE_ID=<leagueId>
```

**Save this `leagueId`** — every following step uses it explicitly. This script was not written or
modified for this increment; it already existed and is reused as-is.

---

## 3b. Step 1.5 — Ingest that same league's REAL Sleeper activity (new, Increment 7)

```
DATABASE_URL=<same-nonprod-db> npx tsx scripts/decision-os-ingest-sleeper-activity-nonprod.ts \
  --league=<leagueId from step 1> \
  [--weeks=<N, default 18>]
```

**New file: `scripts/decision-os-ingest-sleeper-activity-nonprod.ts`** — closes the gap that used to
be described in this section as still-open. Reuses the existing, unchanged Phase A pipeline
end-to-end (`ingestSleeperImportedActivity` → normalizer → writer → `PrismaImportedActivityStore`) —
this script's only new logic is orchestration:

1. Looks up the already-imported AF `League` row (from §3) and confirms it's a real
   `platform: 'sleeper'` league with a real `platformLeagueId` — refuses honestly otherwise.
2. Fetches that league's **real rosters** from the public Sleeper API
   (`lib/sleeper-client.ts`'s `getLeagueRosters`), and collects every real Sleeper roster-owner user
   id.
3. Builds a **real** manager identity mapping for each owner: looks up
   `UserProfile.sleeperUserId` (the real, persisted, unique reverse-lookup already used elsewhere in
   this codebase, e.g. `app/league/[leagueId]/page.tsx`) to find a linked AllFantasy account if one
   exists; falls back to an honest `stable_key`-only, external-only mapping when none does — never
   fabricating an AF account.
4. Fetches that league's **real transactions** (Sleeper's endpoint is per-week — loops over
   `--weeks` weeks, default 18, a fixed honest NFL-season upper bound) and **real draft picks** (via
   the league's real drafts list), using the draft's own real `start_time` when present, or an
   honest `null` (never invented) when it isn't.
5. Calls `ingestSleeperImportedActivity` with all of the above — the SAME emitter/normalizer/writer
   code Phase A already built and tested on fixtures, now fed real Sleeper API data for the first
   time.
6. Prints a full writer summary (created/updated/skipped counts, skip reasons, external-only-manager
   count, per-activity-type counts) — honest, never claims success it can't show.

**New file: `scripts/decision-os-ingest-sleeper-activity-helpers.ts`** — the pure, unit-tested seam
behind the script: real-Sleeper-API-shape reconciliation (`SleeperTransaction` →
`SleeperTransactionRaw`; a raw draft-pick response item → `SleeperDraftPickRaw`, returning `null`
rather than fabricating a pick when required fields are missing), the week-range builder, real
draft-timestamp extraction, and the identity-mapping builder (with an injectable AF-account lookup
so it's testable without a database). 16 tests in
`__tests__/decision-os/ingest-sleeper-activity-helpers.test.ts`.

**Honesty caveat:** this script has not been run against a live Sleeper league in this sandbox (no
live network access here) — the logic is real and reuses only already-tested pieces, but running it
for real against a real non-prod database and a real Sleeper league is the concrete next step, not
something this increment could execute itself.

---

## 4. Step 2 — Run the OS Suite conformance script (new this increment)

```
DATABASE_URL=<same-nonprod-db> npx tsx scripts/decision-os-suite-conformance.ts \
  --leagueIds=<leagueId from step 1> \
  --managerId=<the importer AppUser's id, or any other real claimed manager's id>
```

**New file: `scripts/decision-os-suite-conformance.ts`** — READ-ONLY, mirrors the exact safety
contract of every existing `scripts/decision-os-*-nonprod.ts` script (skips cleanly without
`DATABASE_URL`, hard-refuses the production host). Unlike the sibling
`decision-os-world-conformance.ts`, it has **no auto-discovery fallback** — `--leagueIds` is
required and explicit, by design, matching this increment's own instruction.

For each supplied league, it calls the real, production compositions directly:
- `resolveMissionControlSnapshot` (Commissioner OS)
- `resolveLeagueAnalyticsSnapshot` (Commissioner OS, sibling surface)
- `resolveUserOsSnapshot` (User OS — only if `--managerId` is supplied, checked against the first
  supplied league)
- `resolvePlatformOsSnapshot` (Platform OS — aggregates across ALL supplied leagues in one call)

...and reports a pass/fail line per check plus a real detail string (e.g.
`status=healthy activeManagers=8 trades=0 waivers=0`), using the same `✅`/`❌` reporter convention as
`decision-os-world-conformance.ts`. **A failing or all-zero check here is expected for a league §3b
hasn't been run for yet, not a bug** — run §3b first if real, non-zero activity is wanted.

**New file: `scripts/decision-os-suite-conformance-helpers.ts`** — the pure, unit-tested seam behind
the script (host/production-refusal checks, explicit-only CLI arg parsing, the check-line
formatter), extracted specifically so this increment has a real seam to add tests against per its
own instruction. 12 tests in
`__tests__/decision-os/suite-conformance-helpers.test.ts` — all passing, no DB required.

---

## 5. The gap that WAS open, now closed at the code level (Increment 7)

~~Previously: to see real, non-zero trade/waiver/roster-activity signals, a league additionally
needed real rows in `DecisionOsImportedActivity`, and no orchestrating step connected the real
Sleeper fetchers to the already-built ingestion pipeline for an already-imported league.~~

**Increment 7 built that orchestrating step** — §3b, `scripts/decision-os-ingest-sleeper-activity-nonprod.ts`.
It pulls a real, already-imported league's real Sleeper transactions/rosters/draft picks and runs
them through the exact same emitter/normalizer/writer pipeline Phase A already built and tested on
fixtures, with a real (not fabricated) manager identity mapping built from the persisted
`UserProfile.sleeperUserId` reverse-lookup.

**What remains, honestly:** this script has not been executed against a live Sleeper league in this
sandbox (no live network access here). Running §3 → §3b → §4 in sequence, against a real non-prod
database and a real Sleeper league, is the concrete way to fully close this out — see §9.

---

## 6. Step 3 — Browser verification for Commissioner OS

1. Sign in as the importer account (`decision-os-nonprod-importer@allfantasy.local`, or whichever
   real account you used in §3) against the same non-prod environment.
2. Visit `/commissioner-hub`.
3. Confirm the **Mission Control** card renders for the imported league (league health status,
   activity trend, manager/activity counts, retention-risk section, recommended actions) — real
   counts if §3b was run for this league; honest zero/empty states otherwise.
4. Confirm the **League Analytics** card renders directly below it, showing the same underlying
   counts reshaped for the "what's happening over time" framing.

## 7. Step 4 — Browser verification for User OS

1. While signed in as any account with a real claimed team/roster in the imported league (the
   importer account itself, or a second account that has claimed a different roster in the same
   league — see
   [`USER_OS_MANAGER_OS_SLEEPER_PROOF_AUDIT.md`](USER_OS_MANAGER_OS_SLEEPER_PROOF_AUDIT.md) §14 for
   the confirmed access-control path), visit `/league/<leagueId>`.
2. Confirm the **Your Team** card (User OS) renders next to the existing Manager DNA/Recommendations
   cards, showing team health, an activity summary, and league trend — real if §3b was run for this
   league; an honest zero baseline otherwise.
3. **This is the concrete way to prove the manager-only role** — repeat with a second account that
   is a plain member (not commissioner) of the same league, confirming the same card renders
   identically for them.

## 8. Step 5 — Platform OS (script-only, no browser step)

Platform OS has no route or UI (see
[`PLATFORM_OS_CLIENT_INTELLIGENCE_AUDIT.md`](PLATFORM_OS_CLIENT_INTELLIGENCE_AUDIT.md) §15 for why —
an unresolved operator-authorization question, not an oversight). Its proof is entirely the §4
script run — confirm `Platform OS aggregates N explicit league(s)` reports the correct
`totalMonitoredLeagues` matching however many `--leagueIds` were supplied, and that
`healthy`/`atRisk`/`unavailable` sum correctly.

---

## 9. Summary checklist

- [ ] Ran `decision-os-import-sleeper-nonprod.ts` against a non-prod DB, got a real
      `IMPORTED_LEAGUE_ID`.
- [ ] Ran `decision-os-ingest-sleeper-activity-nonprod.ts` against that same league id, reviewed the
      writer summary (created/updated/skipped counts, external-only-manager count).
- [ ] Ran `decision-os-suite-conformance.ts` against that league id (+ a manager id), reviewed the
      pass/fail + detail lines — non-zero activity expected now that §3b has run.
- [ ] Verified Mission Control + League Analytics render in the browser at `/commissioner-hub`,
      showing real counts.
- [ ] Verified the User OS card renders in the browser at `/league/<leagueId>`, for both a
      commissioner-role account and a plain-member account, if a second claimed account is
      available.
- [ ] Confirmed Platform OS's aggregate counts are internally consistent via the script output.
- [ ] Did NOT run any of this against the production database host.
- [ ] Did NOT fabricate any activity, league, or manager data at any step.

---

## 10. Boundaries honored (this increment)

- No production DB touched — every script hard-refuses the production host.
- No auto-discovery of leagues — `decision-os-suite-conformance.ts` and
  `decision-os-ingest-sleeper-activity-nonprod.ts` both require explicit, single/multi leagueId(s).
- No fake/demo data anywhere — every value is either a real Sleeper API response, a real persisted
  AF row, or an honest zero/empty/skipped result; nothing fabricated, including manager identity
  (an AF account is only linked when a real `UserProfile.sleeperUserId` match exists).
- The DecisionOsImportedActivity ingestion gap is now closed at the code level (§3b/§5) — not yet
  executed against a live Sleeper league in this sandbox (no live network access here); that
  execution is the concrete remaining step, not a design gap.
- No Redraft/Start-Draft/PR-#166/AF-hosted-league work touched.
- No DFS OS work. No `the_replacements` provider work.
- No shadow-gated Phase 5.3/5.4/5.5 pipeline crossed — this procedure only exercises the
  already-cut-over Mission Control/League Analytics/User OS/Platform OS compositions and Phase A's
  already-built ingestion pipeline.
- PR #183 untouched, still draft, not merged.
