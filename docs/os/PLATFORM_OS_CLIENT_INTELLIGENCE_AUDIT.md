# Platform OS / Client Intelligence — Audit

**Status: audit + plan. No code implemented.** Unlike the User OS audit, this one found a
**fully-built, fully-tested, cross-league aggregation function already wired end-to-end** in one
code path — but reaching it safely surfaces a real, pre-existing architecture gate this audit
recommends routing around, not crossing silently.

**Date:** 2026-07-08 · **Branch:** `g15-event-foundation`. **Phase D Increment 3** (successor to
[`FANTASY_OS_SUITE_CLIENT_AGNOSTIC_ROADMAP.md`](FANTASY_OS_SUITE_CLIENT_AGNOSTIC_ROADMAP.md)'s
Increment 1 reframing and
[`USER_OS_MANAGER_OS_SLEEPER_PROOF_AUDIT.md`](USER_OS_MANAGER_OS_SLEEPER_PROOF_AUDIT.md)'s
Increment 2). Depends on
[`DECISION_OS_PHASE_A_IMPLEMENTATION.md`](DECISION_OS_PHASE_A_IMPLEMENTATION.md) and
[`COMMISSIONER_OS_SURFACE_ALIGNMENT.md`](COMMISSIONER_OS_SURFACE_ALIGNMENT.md).

---

## 1. Executive Summary

Platform OS's derivation logic is not a gap — it's arguably the most complete, unbuilt-surface asset
in the whole Decision OS codebase. `derivePlatformBehavioralIntelligence` (Phase 5.4,
`lib/decision-os/behavioral/platform-intelligence.ts`) is a pure, deterministic, 88-test-covered
function that already computes exactly what a platform operator needs: league health distribution,
manager/league retention distributions, commissioner-workload distribution, trade/waiver/draft
ecosystem health, an activity heatmap, engagement trend/momentum, and a prioritized, capped,
customer-facing intervention-opportunity list. **It is even already wired end-to-end** — a real
caller (`lib/decision-os/behavioral/api/real-data-provider.ts`) fetches up to 20 leagues, computes
per-league intelligence for each, and calls this function with real aggregated data.

**The catch, found precisely in this audit:** that caller — `real-data-provider.ts` as a whole — has
never been cut over to any production route (its own code comment: *"Routes currently use
stubDataProvider (Phase 5.7); swap to this in Phase 5.9"* — that swap has never happened). And the
per-league intelligence it depends on (`deriveLeagueBehavioralIntelligence`, Phase 5.3) carries its
own explicit gate: *"shadow-only — not wired to any production route until a Phase 5.4 cutover ADR
is written"* — and Phase 5.4 itself carries an identical gate one level up (*"not wired to any
production route until a Phase 5.5 cutover ADR is written"*). Reusing the existing wiring wholesale
would mean crossing two stacked cutover gates in one move — a bigger, more foundational decision than
this audit should make unilaterally.

**The recommended path (§10) avoids that decision entirely**, mirroring the exact same choice made
for Mission Control's "recommended actions" in Commissioner OS Surface Alignment Increment 5: build
a new, narrower cross-league aggregation directly over the data that's **already cut over to
production** (the same `resolveDecisionOsLeagueHealth`/Mission Control composition Commissioner OS
already uses, live, today) — not the richer but still-gated Phase 5.3/5.4 pipeline. This gives up
some richness (the heatmap, the recency-based momentum signal) in exchange for staying entirely on
already-shipped, already-live ground.

---

## 2. Why Platform OS Matters

A fantasy platform operator can't see across their leagues from the outside. Individual leagues are
opaque without a manual audit of each one. Platform OS is the aggregate view: how many leagues are
healthy vs. at risk, where retention risk concentrates, how much trade/waiver/draft activity is
happening ecosystem-wide, and — most actionably — a ranked list of which leagues need attention
first. This is the layer that turns Commissioner OS from "a feature in one league" into "a retention
product a platform operator can actually manage from."

---

## 3. Difference Between Decision OS and Platform OS

Decision OS is the engine, not a surface — it has no audience of its own. Platform OS is one
specific audience's view of Decision OS's output: the fantasy app operator, not a commissioner or a
manager. Concretely:

| | Decision OS | Platform OS |
| --- | --- | --- |
| Scope | Per-event, per-manager, per-league derivation | Cross-league aggregation |
| Audience | None (an engine) | The platform operator |
| Core question | What is happening, and why? | Which leagues need attention, and how healthy is the platform overall? |
| Status | Real, live, powering Commissioner OS today | Derivation logic real + tested; **no live surface** |

---

## 4. Existing Platform Intelligence Inventory

**A. Phase 5.4 — `derivePlatformBehavioralIntelligence`** (`lib/decision-os/behavioral/platform-intelligence.ts`,
88 tests in `__tests__/decision-os/platform-behavioral-intelligence.test.ts`). Pure function:
`(leagueIntelligences: LeagueBehavioralIntelligence[], managerIntelligences:
ManagerBehavioralIntelligence[], events: BehavioralEvent[], now?) => PlatformBehavioralIntelligence`.
Its own ADR states explicit constraints: read-only, deterministic, no fabrication, **"no
customer-specific logic — scoring rules are generic across all deployments"** (written for exactly
this multi-client future), and **shadow-only until a Phase 5.5 cutover ADR is written.** Computes:
- `leagueHealthDistribution` — count + percent of leagues per engagement tier (elite/active/
  moderate/passive/dormant), plus `healthyPercent`/`atRiskPercent`.
- `commissionerQualityDistribution` — leagues by commissioner workload (light/moderate/heavy/
  critical), plus `managedPercent`/`overloadedPercent`.
- `retentionDistribution` — manager-level AND league-level retention-risk counts/percentages.
- `tradeEcosystem` / `waiverEcosystem` / `draftParticipation` — per-dimension platform-wide activity
  tier, total events, active-league percent, per-league/per-manager rates.
- `activityHeatmap` — a sparse day-of-week × hour-of-day grid (UTC) with a peak cell.
- `engagementTrends` — `momentumSignal` (accelerating/steady/decelerating/dormant/insufficient_data)
  derived from a 7-day/total-events recency ratio — **explicitly documented as "a recency proxy, not
  a true historical trend"** (no time-series snapshots feed it; do not conflate with Commissioner
  OS's own snapshot-based `leagueTrend`, which IS a true historical trend).
- `interventionOpportunities` — a prioritized (critical/high/medium), capped-at-20, customer-facing
  list of specific leagues/managers needing attention, each with a real machine-readable `signal`
  and human-readable `message`.
- `completeness`/`uncertainty`/`warnings`/`provenance` — the same honest-degradation discipline as
  every other Decision OS output.

**B. Phase 6.5 — `assemblePlatformBenchmark`** (`lib/decision-os/phase6/benchmark/benchmark.ts`) —
percentile ranks across 5 dimensions, archetype cohort stats. Not explicitly ADR-shadow-gated in its
own file, but **has no consumer anywhere outside its own module, tests, and a phase-completion
doc** — simply never called by anything live.

**C. `real-data-provider.ts`'s existing end-to-end wiring** (confirmed this audit, precisely) —
`createRealDataProvider()`'s platform-intelligence resolver:
1. Calls `d.findLeagueIds(maxLeagues)` (env `INTELLIGENCE_PLATFORM_MAX_LEAGUES`, default 20) —
   a real, already-written "list some leagues" query (`defaultPrisma.league.findMany({ orderBy:
   {createdAt:'desc'}, take, select: {id:true} })`).
2. For each league, loads events (`loadAllLeagueEvents`, this file's own event-loading composition —
   a near-duplicate of `dashboard-intelligence.ts`'s `loadLeagueEvents`) and calls
   `buildLeaguePipeline`, which **does call `deriveLeagueBehavioralIntelligence`** (Phase 5.3) for
   real, per league.
3. Aggregates all leagues' intelligence + events and calls `derivePlatformBehavioralIntelligence`
   with real data.
4. Returns the result, or `derivePlatformBehavioralIntelligence([], [], [])` (an honest empty
   result) if no leagues exist.

**This confirms the ENTIRE pipeline — A through this wiring — already runs correctly end-to-end on
real data.** The reason it's still "shadow" is not that it's broken or unfinished — it's that
`real-data-provider.ts` as a whole (this specific `IntelligenceDataProvider` implementation) has
never been the one production routes actually call; a `stubDataProvider` is used instead, per this
file's own comment.

**D. No operator/platform dashboard page exists anywhere** — confirmed via a repo-wide search; no
route, component, or doc references a "platform dashboard" or "operator dashboard" by any name.

---

## 5. Sleeper Site-Wide Proof Path

Because Platform OS is inherently cross-league, its Sleeper proof is naturally an extension of the
User OS proof path (Increment 2): once 2+ imported Sleeper leagues exist for a test account (one
commissioned, one manager-only, per the User OS audit), Platform OS's proof is aggregating across
**both** — total monitored leagues = 2, a real health distribution across them, real trade/waiver/
draft ecosystem counts summed across both, and (if either shows a retention-risk manager or a
critical/heavy commissioner workload) a real intervention-opportunity entry.

This does not require a large number of leagues to be a legitimate proof — `computeUncertainty`
already honestly reports `'very_high'`/`'high'` uncertainty for small league counts (< 3, < 5), so a
2-league proof would correctly show low confidence rather than a misleadingly confident percentage.
That honesty is a feature to point out in any demo, not a shortcoming to hide.

---

## 6. What Data Exists Today

- Real per-league behavioral facts and per-manager behavioral intelligence for every league already
  ingested (AF-native, redraft, and imported/Sleeper activity alike).
- Real per-league `LeagueBehavioralIntelligence` (Phase 5.3) — computed correctly today inside
  `real-data-provider.ts`, just never exposed live.
- Real cross-league `PlatformBehavioralIntelligence` (Phase 5.4) — same status: computed correctly,
  never exposed live.
- A real "list some leagues" query already written (`findLeagueIds`), reusable in principle.
- Real, already-live, already-cut-over per-league Commissioner OS data (`resolveDecisionOsLeagueHealth`,
  `resolveMissionControlSnapshot`, `resolveLeagueAnalyticsSnapshot`) — narrower than Phase 5.3/5.4,
  but genuinely in production today.

## 7. What Decision OS Already Provides

Everything needed for a rich platform view, without new derivation, **if** the Phase 5.3→5.4→5.5
gate sequence is crossed: league health distribution, retention distribution (manager AND league
scope), commissioner workload distribution, trade/waiver/draft ecosystem health, an activity
heatmap, a recency-based momentum signal, and a prioritized intervention list — all in one function
call, already tested 88 ways.

If that gate is deliberately NOT crossed yet (§10's recommendation), Decision OS still provides
everything needed for a **narrower** platform view via the already-cut-over Commissioner OS
composition: per-league health status, activity counts, manager counts, and retention-risk counts —
just aggregated across leagues rather than natively cross-league.

## 8. What Is Shadow-Gated Or Unwired

- **Phase 5.3** (`deriveLeagueBehavioralIntelligence`) — shadow-only until its own Phase 5.4 cutover
  ADR (already discussed in Mission Control's own audit trail).
- **Phase 5.4** (`derivePlatformBehavioralIntelligence`) — shadow-only until its own **Phase 5.5**
  cutover ADR (a distinct, one-level-higher gate — confirmed by reading its ADR directly).
- **`real-data-provider.ts` as a whole** — written, tested, internally correct, but not the
  `IntelligenceDataProvider` any production route actually uses (`stubDataProvider` is, per this
  file's own comment referencing an unfulfilled "Phase 5.9" swap).
- **Phase 6.5** (`assemblePlatformBenchmark`) — not ADR-gated in the same explicit way, but has zero
  consumers outside its own module/tests — simply unused.

## 9. What Is Missing

- **Any live platform/operator-facing page, card, or route** — confirmed via repo-wide search, none
  exists under any name.
- **A decision on whether to cross the Phase 5.3→5.4→5.5 gate sequence** — not a code gap, an
  architecture decision, and not one this audit makes unilaterally (§10 recommends deferring it).
- **A cross-league aggregation over the already-cut-over Commissioner OS composition** — this
  literally does not exist yet; League Analytics and Mission Control are both single-league.
- **A genuinely validated multi-league Sleeper proof** — no test has aggregated real (or
  realistically fixture-shaped) data across 2+ imported Sleeper leagues yet.

---

## 10. Minimum Platform OS Demo Surface

**Recommended approach: build new, narrow, additive — do not reuse `real-data-provider.ts`'s
existing platform pipeline wholesale.** Reusing it would silently cut over `real-data-provider.ts`
to production for the first time, and cross two ADR-gates (5.3→5.4) that were deliberately left
uncrossed in every Commissioner OS Surface Alignment increment to date. That is a legitimate future
decision — but it's a bigger one than "build a minimum Platform OS surface," and should be made
explicitly, not as a side effect.

Instead, mirror Mission Control/League Analytics' own precedent exactly: a new, small composition
(e.g. `lib/decision-os/platformIntelligence.ts`) that:
1. Lists a bounded set of leagues (reuses the same trivial `league.findMany` shape already proven in
   `real-data-provider.ts`, reimplemented directly rather than importing from that file, to avoid any
   accidental coupling to its stub/real switch).
2. Calls the **already-cut-over** `resolveDecisionOsLeagueHealth` (or
   `resolveMissionControlSnapshot`) for each league — the same function Mission Control and League
   Analytics already call in production.
3. Aggregates the results: total leagues monitored, a healthy/at-risk split (from each league's real
   `engine.overallStatus`), summed trade/waiver/draft/roster activity, a summed retention-risk
   count, and a simple cross-league intervention list (leagues whose own `recommendedActions`
   already contain an `'urgent'`-priority item, surfaced once more at the platform level — a
   reshape, not new derivation, the same discipline Mission Control's own "recommended actions"
   used).
4. Degrades honestly per-league (a league that fails to resolve is simply excluded, with an honest
   count of how many were excluded — never silently fabricated into the aggregate).

**What this gives up vs. the richer Phase 5.4 path:** the activity heatmap, the recency-based
momentum signal, and the more sophisticated multi-pass intervention prioritization. **What it gains:**
zero new architecture-gate crossings, and a surface built entirely on data already live in
production today.

### Minimum Platform OS Surface (concrete fields)

- **Total monitored leagues** — count of leagues aggregated.
- **Leagues at risk** — count where `engine.overallStatus` is `'at_risk'`/`'critical'`.
- **Healthy leagues** — count where `'excellent'`/`'healthy'`.
- **Manager activity summary** — aggregate active/inactive manager counts across all monitored
  leagues.
- **Transaction/activity summary** — summed trade/waiver/draft/roster activity across leagues.
- **Intervention queue** — leagues with an urgent recommended action, surfaced once more at
  platform scope.
- **Trend summary** — how many leagues report `available: true` trend vs. `no_snapshots`/
  `insufficient_history` (an honest coverage signal, not a fabricated platform-wide trend line —
  a true cross-league trend would need real snapshot history for most/all monitored leagues first).
- **Decision OS explanation** — a short, honest note that this aggregates the same real per-league
  data Commissioner OS already shows, degrades honestly, and is not a guaranteed outcome.

---

## 11. Platform OS Proof Requirements

- [ ] Aggregate across at least 2 imported Sleeper leagues for the same or different test accounts.
- [ ] Show a real total-monitored-leagues count.
- [ ] Show a real league health distribution (healthy vs. at-risk split) across those leagues.
- [ ] Show real active/inactive manager patterns aggregated across leagues.
- [ ] Show real trade/waiver/draft/roster activity summed across leagues.
- [ ] Show at least one real (or honestly absent) league needing commissioner intervention.
- [ ] Show cross-league trend coverage honestly (how many leagues have real trend data vs. don't).
- [ ] Show an honest unavailable/excluded state for any league whose data couldn't resolve, rather
      than silently omitting it from a count without saying so.

---

## 12. Recommended Implementation Sequence

1. **Do not cross the Phase 5.3/5.4/5.5 gate sequence in this pass.** Treat it as a deliberate,
   separate future decision — flag it for explicit sign-off if/when the richer Phase 5.4 output
   (heatmap, momentum, multi-pass interventions) is genuinely wanted.
2. **Build the minimum Platform OS surface (§10)** over already-cut-over Commissioner OS data —
   same shape as Mission Control/League Analytics: a thin composition + a card reusing
   `DecisionOsCardPrimitives`, zero new visual system.
3. **Prove it on 2+ real (or realistically fixture-shaped) imported Sleeper leagues**, ideally the
   same commissioner-owned + manager-only pair the User OS proof path already needs — one proof
   pass serves both audits.
4. **Only after both User OS and this minimum Platform OS surface exist:** revisit whether the
   richer Phase 5.3/5.4/5.5 pipeline is worth formally cutting over, as its own explicit,
   sign-off-gated decision — not before.

## 13. Risks / Honest Gaps

- **The richer Phase 5.4 aggregator is real and tested, but this audit deliberately does not
  recommend wiring it directly** — reusing it would silently flip `real-data-provider.ts`'s
  stub-vs-real switch to production for the first time ever, a decision with a much larger blast
  radius than "add a Platform OS card," and should not be made as a side effect of this increment.
- **The recommended narrower path gives up real richness** (heatmap, momentum signal, sophisticated
  intervention prioritization) in exchange for staying on already-live ground — a genuine tradeoff,
  not a free lunch.
- **No real multi-league aggregation has been proven yet**, narrow or rich — this audit plans it,
  it does not execute it.
- **Platform-level `momentumSignal` (Phase 5.4) is explicitly a recency proxy, not a true trend** —
  if the richer pipeline is ever wired, this distinction must be preserved and not conflated with
  Commissioner OS's own real, snapshot-based `leagueTrend`.
- **No retention/engagement/ROI outcome has been measured** at the platform level, on any data —
  this audit makes no such claim.

---

## 14. Operator Value For Fantasy Apps

- Helps a platform operator see, at a glance, which of their leagues need attention, instead of
  manually auditing each one.
- Helps identify commissioner-success opportunities — which commissioners are overloaded, which
  leagues are thriving and could be case studies, which are quietly failing.
- Helps monitor platform-wide engagement without a bespoke analytics build per client.
- Helps package Commissioner OS (and, once built, User OS) as a retention product with a
  platform-level rollup an operator's own team can act on, not just a per-league feature.
- **Does not promise unmeasured ROI.** No retention lift, engagement lift, or dollar figure is
  claimed anywhere in this document, and none should be implied when this surface is eventually
  demoed — the same discipline every other document in this workstream has held to.

---

## 15. Boundaries honored (this increment)

- No code implemented — audit + plan only, per explicit instruction (no "tiny, obvious, low-risk"
  wiring change was found safe enough to also ship this increment; reusing the existing wiring would
  not have been tiny/low-risk, for the reasons in §1/§10).
- No DFS OS work.
- No adapter code, no `IMPORT_PROVIDERS` change.
- No fake/demo data anywhere in this document.
- No production DB touched; no production cron enabled.
- PR #183 untouched, still draft, not merged.
- No Redraft/Start-Draft/PR-#166/AF-hosted-league work touched.
- No retention-lift, ROI, or engagement-improvement claims anywhere in this document.
