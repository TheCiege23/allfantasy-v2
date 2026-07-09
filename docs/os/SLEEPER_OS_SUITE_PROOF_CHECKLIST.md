# Sleeper OS Suite Proof Checklist

**Status: verification procedure + harness. No production data touched. No fake data used anywhere
in this procedure — every step either reads real (if currently activity-empty) imported league data,
or honestly reports why a signal isn't populated yet.**

**Date:** 2026-07-08 · **Branch:** `g15-event-foundation`. **Phase D Increment 6** (successor to
[`FANTASY_OS_SUITE_CLIENT_AGNOSTIC_ROADMAP.md`](FANTASY_OS_SUITE_CLIENT_AGNOSTIC_ROADMAP.md),
[`USER_OS_MANAGER_OS_SLEEPER_PROOF_AUDIT.md`](USER_OS_MANAGER_OS_SLEEPER_PROOF_AUDIT.md), and
[`PLATFORM_OS_CLIENT_INTELLIGENCE_AUDIT.md`](PLATFORM_OS_CLIENT_INTELLIGENCE_AUDIT.md)).

---

## 1. What this proves, and what it honestly does not yet

This procedure proves that **Commissioner OS, User OS, and Platform OS all resolve correctly
against a real, non-prod database, for a real (Sleeper-imported) league** — the same code path used
in production, run against real infrastructure instead of a unit-test fixture.

**It does not yet prove those surfaces show real, non-zero trade/waiver/roster-activity signals**,
because of one already-documented, precisely-scoped gap (§5): the standard Sleeper import pipeline
populates `League`/`LeagueTeam`/`Roster` (so the league is real, navigable, and viewable), but does
**not** yet populate `DecisionOsImportedActivity` (the table Decision OS's behavioral pipeline reads
for trades/waivers/roster moves) from that same real Sleeper league's real transaction history. This
was already flagged in [`DECISION_OS_PHASE_A_IMPLEMENTATION.md`](DECISION_OS_PHASE_A_IMPLEMENTATION.md)
§3 ("wire `ingestSleeperImportedActivity` into the real production import flow — today it's invoked
from tests/a harness") and in
[`USER_OS_MANAGER_OS_SLEEPER_PROOF_AUDIT.md`](USER_OS_MANAGER_OS_SLEEPER_PROOF_AUDIT.md) §11. This
increment does not close that gap (see §5 for exactly what would be needed) — it makes the gap
precise and gives a real, repeatable way to see its effect (an honest zero-activity Mission
Control/League Analytics/User OS/Platform OS view for a real imported league) rather than leaving it
implicit.

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
`decision-os-world-conformance.ts`. **A failing or all-zero check here for a freshly-imported league
is expected, not a bug** — it's the direct, honest consequence of the gap in §5, and the script's own
output says so.

**New file: `scripts/decision-os-suite-conformance-helpers.ts`** — the pure, unit-tested seam behind
the script (host/production-refusal checks, explicit-only CLI arg parsing, the check-line
formatter), extracted specifically so this increment has a real seam to add tests against per its
own instruction. 12 tests in
`__tests__/decision-os/suite-conformance-helpers.test.ts` — all passing, no DB required.

---

## 5. The one still-open gap, named precisely

To see **real, non-zero** trade/waiver/roster-activity signals (not just "the composition resolves,
honestly reporting zero"), a league additionally needs real rows in `DecisionOsImportedActivity`.
The pieces that would compose this already exist and are already tested — nothing here needs new
derivation logic:

- Real Sleeper transaction/roster/draft-pick fetchers already exist:
  `lib/sleeper-client.ts`'s `getLeagueTransactions`, `getLeagueRosters`, `getDraftPicks`,
  `getLeagueDrafts` (real, public-API, already used by the production import flow for other
  purposes).
- The Sleeper-specific emitter already exists and is already tested against realistic fixtures:
  `lib/decision-os/ingestion/sleeperActivityEmitter.ts`'s `ingestSleeperImportedActivity`.
- The provider-neutral normalizer/writer/store already exist and are already tested:
  `lib/decision-os/ingestion/importedActivityNormalizer.ts` /
  `importedActivityWriter.ts` / `prismaImportedActivityStore.ts`.

**What's missing is the orchestrating step that connects them for a real, already-imported league**:
pulling that league's real Sleeper transactions/rosters/draft picks via the fetchers above, building
a real `ManagerIdentityIndex` for its members, and calling `ingestSleeperImportedActivity` with that
real data against the same league id from §3. This was not built in this increment, deliberately —
it's a real orchestration step with its own identity-mapping considerations (how real
`ExternalIdentityMapping` rows for this specific league's managers get created), not a "tiny,
obvious, low-risk wiring change," and building it without getting that mapping right risks a script
that looks like it works but silently mis-attributes activity. This is exactly the kind of gap this
whole workstream has consistently preferred to name precisely rather than rush.

---

## 6. Step 3 — Browser verification for Commissioner OS

1. Sign in as the importer account (`decision-os-nonprod-importer@allfantasy.local`, or whichever
   real account you used in §3) against the same non-prod environment.
2. Visit `/commissioner-hub`.
3. Confirm the **Mission Control** card renders for the imported league (league health status,
   activity trend, manager/activity counts, retention-risk section, recommended actions) —
   honestly showing zero/empty states per §5 until that gap closes.
4. Confirm the **League Analytics** card renders directly below it, showing the same underlying
   counts reshaped for the "what's happening over time" framing.

## 7. Step 4 — Browser verification for User OS

1. While signed in as any account with a real claimed team/roster in the imported league (the
   importer account itself, or a second account that has claimed a different roster in the same
   league — see
   [`USER_OS_MANAGER_OS_SLEEPER_PROOF_AUDIT.md`](USER_OS_MANAGER_OS_SLEEPER_PROOF_AUDIT.md) §14 for
   the confirmed access-control path), visit `/league/<leagueId>`.
2. Confirm the **Your Team** card (User OS) renders next to the existing Manager DNA/Recommendations
   cards, showing team health, an activity summary, and league trend — again honestly zeroed per §5
   until real activity is ingested.
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
- [ ] Ran `decision-os-suite-conformance.ts` against that league id (+ a manager id), reviewed the
      pass/fail + detail lines honestly (zero-activity expected per §5).
- [ ] Verified Mission Control + League Analytics render in the browser at `/commissioner-hub`.
- [ ] Verified the User OS card renders in the browser at `/league/<leagueId>`, for both a
      commissioner-role account and a plain-member account, if a second claimed account is
      available.
- [ ] Confirmed Platform OS's aggregate counts are internally consistent via the script output.
- [ ] Did NOT run any of this against the production database host.
- [ ] Did NOT fabricate any activity, league, or manager data at any step.

---

## 10. Boundaries honored (this increment)

- No production DB touched — every script hard-refuses the production host.
- No auto-discovery of leagues — `decision-os-suite-conformance.ts` requires explicit `--leagueIds`.
- No fake/demo data — real Sleeper import (existing script) or an honest zero/empty result; nothing
  fabricated.
- The DecisionOsImportedActivity ingestion gap (§5) was named precisely, not closed — closing it is
  a larger orchestration step, correctly out of scope for a "verification harness" increment.
- No Redraft/Start-Draft/PR-#166/AF-hosted-league work touched.
- No DFS OS work. No `the_replacements` provider work.
- No shadow-gated Phase 5.3/5.4/5.5 pipeline crossed — this procedure only exercises the
  already-cut-over Mission Control/League Analytics/User OS/Platform OS compositions.
- PR #183 untouched, still draft, not merged.
