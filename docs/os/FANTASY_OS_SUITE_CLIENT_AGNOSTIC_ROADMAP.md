# Fantasy OS Suite — Client-Agnostic Roadmap

**Status: product-framing + roadmap document. No code in this increment.** This document reframes
prior work away from a single named client and toward the actual product: a licensable intelligence
OS layer for fantasy sports platforms in general. Sleeper is the current proof source because it's
the provider already partially wired into this repo — not because the product is Sleeper-specific.

**Date:** 2026-07-08 · **Branch:** `g15-event-foundation`. **Phase D Increment 1** (successor to
Commissioner OS Surface Alignment Phase B and Commissioner OS External Licensing Phase C).
**Depends on:** [`DECISION_OS_PHASE_A_IMPLEMENTATION.md`](DECISION_OS_PHASE_A_IMPLEMENTATION.md),
[`COMMISSIONER_OS_SURFACE_ALIGNMENT.md`](COMMISSIONER_OS_SURFACE_ALIGNMENT.md), and the five
Replacements documents (demo package, provider adapter plan, technical discovery handoff, call
script, demo-readiness checklist) — all of which remain useful as **first-client collateral**, not
as the top-level product definition (see §17).

---

## 1. Executive Summary

AllFantasy is not building a feature for one prospective partner. It's building an **OS layer for
fantasy sports platforms** — a family of intelligence products, all powered by one real, tested
engine (**Decision OS**), each answering a different audience's question about the same underlying
league activity:

- **Commissioner OS** — already real and visible (Mission Control, League Analytics).
- **User OS / Manager OS** — a per-manager counterpart, largely unbuilt/unaligned today (closest
  existing artifact: the separate Manager Intelligence Platform hub — see §5).
- **Platform OS / Client Intelligence** — an app-wide, cross-league view for a platform operator;
  real derivation logic already exists (Phase 5.4, shadow-only) but is wired to nothing (see §6).
- **DFS OS** — a future, explicitly out-of-scope vertical, pending its own legal/compliance review.

The Replacements is the **first prospective conversation**, not the product's boundary. Sleeper is
the **current proof path** — the provider already partially integrated in this codebase — used to
demonstrate the whole OS suite works site-wide, on real (if synthetic-shaped) activity, before any
external client's data is involved. The architecture must stay, and already is, provider-agnostic:
nothing built so far depends on Sleeper's specific shapes past one thin, swappable emitter layer.

---

## 2. Product Thesis

Every fantasy sports platform — AllFantasy included — has the same latent problem: real league and
manager activity happens constantly, but almost none of it is turned into an actionable signal for
the people who could act on it. A commissioner doesn't know a league is dying until it's too late. A
manager doesn't get a clear read on how they're actually doing relative to their own habits. A
platform operator can't see which leagues, across their whole userbase, are at risk of going
inactive.

**Decision OS is the thesis:** a single, deterministic, provider-agnostic intelligence engine that
turns raw activity (trades, waivers, roster moves, drafts) into behavioral facts, and those facts
into tiered intelligence for whoever needs it — a commissioner, a manager, or a platform operator.
Everything else in this document (Commissioner OS, User OS, Platform OS, eventually DFS OS) is a
**presentation layer** on top of that one engine, not a separate intelligence system each time.

---

## 3. Why Fantasy Sports Apps Need An OS Layer

- **Retention is invisible until it's too late.** Most platforms only learn a league or manager has
  disengaged after they've already left — there's rarely an earlier, structured signal.
- **Commissioners are unpaid volunteers with no tooling.** They're expected to keep a league alive
  with no visibility into who's actually engaged, why, or what to do about it.
- **Managers get no feedback loop.** A manager who trades rarely, ignores waivers, or is trending
  toward disengagement has no system telling them so — only their own perception.
- **Platform operators lack a cross-league view.** Individual leagues are opaque from the outside;
  there's no aggregate signal for "which of our leagues need intervention" without manually auditing
  each one.
- **Every platform reinvents this, or doesn't build it at all.** An intelligence layer built once,
  provider-agnostically, is more defensible and more valuable licensed out than rebuilt per-platform.

---

## 4. Decision OS as the Core Brain

Decision OS is the only place real derivation happens. Everything above it (Commissioner OS, User
OS, Platform OS) reads its outputs; none of them re-derive intelligence independently. Concretely,
today:

```
Raw activity (trades, waivers, roster moves, drafts)
  → normalized into BehavioralEvents (provider-agnostic; AF-native, redraft, and imported/external)
  → assembled into League/Manager Behavioral Facts
  → derived into Manager Behavioral Intelligence (participation tier, retention risk + reasons,
    per-dimension engagement)
  → derived into League Behavioral Intelligence (league-level engagement, activity tiers,
    commissioner workload, deterministic recommendations — Phase 5.3, currently shadow-gated,
    see §5)
  → derived into Platform Behavioral Intelligence (cross-league distributions, engagement trends,
    intervention opportunities — Phase 5.4, currently shadow-only and unwired, see §6)
  → snapshotted daily into trend history (idempotent, provider-agnostic)
  → federated into League Health scoring (Commissioner OS's current source)
  → composed into Commissioner OS's Mission Control / League Analytics (real, visible today)
```

**Decision OS answers: "what is happening across the platform, and why?"** — every other OS answers
a narrower, audience-specific version of that same question (§8).

---

## 5. Commissioner OS

**Status: real, tested, visible.** The most mature OS product today. Built across Commissioner OS
Surface Alignment Phase B/C:

- **Mission Control** — league health status, activity trend, manager counts, trade/waiver/draft/
  roster activity, named managers at retention risk with reasons, recommended commissioner actions.
- **League Analytics** — a sibling, lighter view: the same counts and trend, a bare retention-risk
  count, no named list or actions.
- Both are real cards on the existing Commissioner Hub dashboard, powered by the Decision OS
  behavioral pipeline via a federated League Health composition — no fabricated data, honest
  unavailable states throughout.

**Answers:** "what should this commissioner do to keep the league healthy?"

---

## 6. User OS / Manager OS

**Status: largely unbuilt/unaligned. The closest existing artifact is a separate system, not
Decision OS-aligned.** A prior workstream (Manager Intelligence Platform) built a Manager Hub
(`/league/[id]/manager-hub`) with Team Health, Weekly Outlook, and Transaction Readiness contracts —
but this is **subsystem D** in Commissioner OS Surface Alignment's own four-subsystem audit: its own
independent contracts, not reading the Decision OS behavioral pipeline (subsystem A) that
Commissioner OS now uses. It has not been audited for what it would take to align, and this document
does not assume that audit's outcome.

**What User OS conceptually needs to answer, once built/aligned:** for a manager who is *not* the
commissioner of a league — someone who only plays in it — a single view of their own engagement,
how their activity compares to their own habits over time, and concrete suggestions to compete
better (e.g. trade activity, waiver usage, lineup discipline). This is structurally the SAME
Decision OS manager-tier intelligence (`ManagerBehavioralIntelligence`, already real and already
used by Commissioner OS to derive per-manager retention risk) — just presented to the manager
themselves instead of to their commissioner.

**Answers:** "what should this manager do to compete better?"

**This is the explicit recommended next step (Phase D Increment 2, §16)** — audit whether/how to
align Manager Hub with Decision OS, or build a minimal new manager-facing view directly on top of
the same `ManagerBehavioralIntelligence` Commissioner OS already computes, the same way Mission
Control was built directly on top of already-real League Health data rather than a new derivation.

---

## 7. Platform OS / Client Intelligence

**Status: real derivation logic exists, but is shadow-only and wired to nothing.** Phase 5.4 already
built `derivePlatformBehavioralIntelligence` (`lib/decision-os/behavioral/platform-intelligence.ts`)
— a pure, deterministic aggregator over `LeagueBehavioralIntelligence[]` +
`ManagerBehavioralIntelligence[]` + `BehavioralEvent[]`, explicitly designed with **"no
customer-specific logic: scoring rules are generic across all deployments"** (its own ADR's words).
It already models league-health distribution across a platform, commissioner-quality distribution,
platform-wide retention distribution, an activity heatmap, engagement trends, and intervention
opportunities. **None of this is wired to any surface today** — it is real, tested, and unused,
mirroring the exact same "shadow-only, gated behind its own future cutover ADR" pattern already
found and respected for Phase 5.3's league-level recommendations (see
`COMMISSIONER_OS_SURFACE_ALIGNMENT.md` §4e).

Phase 6.5 (Platform Benchmarking — percentile ranks, archetype cohorts across 5 dimensions) is a
second, related, already-built-but-unwired piece of platform-level intelligence.

**What Platform OS conceptually needs to answer, once wired:** for a fantasy platform operator (not
a commissioner, not a manager) — which leagues across their whole platform are healthy vs. at risk,
what the aggregate engagement trend looks like, and where the highest-value intervention
opportunities are (e.g. "these 40 leagues show early churn signals").

**Answers:** "what should the fantasy app operator do to improve engagement and retention?"

**Not scoped for this document to build.** Wiring Phase 5.4/6.5 into a real surface is its own
architecture decision (does it read the SAME federated League Health data Commissioner OS uses, or
directly the underlying facts?) and is not attempted here — flagged as a future roadmap item (§15).

**Phase D Increment 3 update (2026-07-08):** the audit is done —
[`PLATFORM_OS_CLIENT_INTELLIGENCE_AUDIT.md`](PLATFORM_OS_CLIENT_INTELLIGENCE_AUDIT.md). It found
`derivePlatformBehavioralIntelligence` isn't just built and tested — it's already wired end-to-end
in `lib/decision-os/behavioral/api/real-data-provider.ts` (which fetches real leagues, computes
per-league intelligence for each, and aggregates them). The reason it still isn't a live surface:
`real-data-provider.ts` as a whole has never been the provider any production route actually uses,
and reaching it means crossing a stacked Phase 5.3→5.4→5.5 cutover-ADR gate sequence, one level
higher than the gate already avoided for Mission Control. The audit recommends NOT crossing that
gate as a side effect of building a demo surface — instead building a narrower Platform OS
aggregation directly over the already-cut-over Commissioner OS composition (Mission Control/League
Analytics' own data, summed across leagues), giving up some richness (an activity heatmap, a
recency-based momentum signal) for zero new architecture-gate crossings.

**Phase D Increment 4 update (2026-07-08):** that narrower minimum surface is now built —
`lib/decision-os/platformOs.ts`'s `resolvePlatformOsSnapshot(leagueIds, now?)`, an explicit-league-
list aggregation over `resolveMissionControlSnapshot` (7 tests, zero regressions; see
`PLATFORM_OS_CLIENT_INTELLIGENCE_AUDIT.md` §15 for full detail). **No route or UI card was built** —
unlike Mission Control/League Analytics (session-scoped to "my own league"), this composition
accepts an arbitrary caller-supplied league list, which needs an operator-level authorization model
that doesn't exist yet; exposing a route without deciding that first was judged unsafe, so this
increment deliberately stopped at composition + tests.

---

## 8. DFS OS Future Scope

**Status: does not exist. Not started. Not scoped.** Daily Fantasy Sports is a structurally
different product (single-slate, salary-cap, no season-long retention dynamics) and very likely
carries its own legal/compliance considerations (gambling-adjacent regulation varies by
jurisdiction) that have not been reviewed. This document does not propose engineering scope for DFS
OS — only that it exists conceptually as a fifth, later vertical in the same OS family, subject to
its own review before any implementation planning begins.

**Would eventually answer:** "what DFS-specific intelligence would matter" — deliberately
unanswered here, pending legal/compliance review.

---

## 9. Sleeper as the Current Proof Path

Sleeper is not a target client — it's the **already-partially-integrated provider** used to prove the
whole OS suite works on real (if realistically-shaped, non-live-API) external activity before any
actual external client is involved. Concretely, Decision OS Phase A already built and tested:

- A Sleeper-specific activity emitter (`lib/decision-os/ingestion/sleeperActivityEmitter.ts`) that
  converts real Sleeper API shapes into the provider-neutral `RawImportedActivity` format.
- Idempotent ingestion proven on realistically-shaped Sleeper fixtures, including trades, waivers,
  and draft picks, and including managers with **no AllFantasy account** — external-only identity
  attribution already works.
- Real-database idempotency proofs (a throwaway, non-production Neon project) for both the imported-
  activity and behavioral-snapshot models.

**What hasn't been done:** a live pull from a real Sleeper league via their actual API (all proofs
to date use realistically-shaped fixture data, not a live API call), and wiring the Sleeper emitter
into the production Sleeper backfill/sync call site (it's invoked from tests/a harness today).

---

## 10. Provider-Agnostic Integration Model

The architecture already enforces this, not just intends it. Every layer below the provider-specific
emitter is, and must remain, provider-blind:

```
Provider-specific emitter (Sleeper today; Yahoo/ESPN/Fantrax/MFL/a future external client tomorrow)
  ↓ emits the SAME shape regardless of provider:
RawImportedActivity  (provider, leagueId, activityType, providerEventId, occurredAt, managerSourceIds, payload)
  ↓
Provider-agnostic normalizer → writer → store → DecisionOsImportedActivity (unchanged, no matter the source)
  ↓
Provider-agnostic behavioral pipeline → facts → manager/league/platform intelligence
  ↓
Commissioner OS / (future) User OS / (future) Platform OS surfaces
```

Adding a new provider (Sleeper→Yahoo→ESPN→a future external client) means writing exactly one new
emitter — never touching the normalizer, writer, store, model, behavioral pipeline, or any surface.
This was proven structurally correct when the Replacements provider-adapter plan was written: it
required zero new lines in any layer below the (not-yet-built) emitter.

---

## 11. Demo Surfaces Built Today

| Surface | Status |
| --- | --- |
| Commissioner Hub dashboard | Real, live |
| Mission Control card | Real, tested, visible |
| League Analytics card | Real, tested, visible (first minimal version) |
| Decision OS-federated League Health | Real, tested |
| Behavioral snapshot/trend history | Real, tested; **not scheduled to run automatically** anywhere |
| Sleeper activity ingestion | Real, tested against realistic fixtures; **not wired to the live production backfill call site** |
| Manager Hub (subsystem D) | Real, live, but **not Decision OS-aligned** — a separate, older contract system |
| Platform Behavioral Intelligence (Phase 5.4/6.5) | Real, tested, **shadow-only, wired to nothing** |
| League-level deterministic recommendations (Phase 5.3) | Real, tested, **shadow-only** behind its own cutover-ADR gate |
| User OS | Does not exist as a distinct surface |
| Platform OS | Does not exist as a distinct surface |
| DFS OS | Does not exist |

---

## 12. What Sleeper Data Must Prove Site-Wide

The Sleeper proof path is not "done" once one league renders Mission Control. It needs to prove the
OS suite works **across the different roles a real user actually has on a real platform**:

1. **Ingest real Sleeper activity** — trades, waivers, roster moves, draft picks — idempotently,
   for more than one league.
2. **Show Commissioner OS for leagues the user commissions** — Mission Control + League Analytics
   populated from that real (Sleeper-sourced) activity.
3. **Show User OS for leagues where the user is only a manager** — not yet built (see §6); this is
   the proof path's current biggest gap, and the recommended next increment (§16).
4. **Show Decision OS aggregate intelligence across all of a user's imported leagues** — a
   cross-league view is conceptually Platform OS's job (§7), currently unwired.
5. **Show real league health and trend movement** — already proven for a single league; needs
   proving across multiple imported Sleeper leagues with genuinely different activity levels.
6. **Show active/inactive managers correctly**, including managers with no AllFantasy account.
7. **Show trade/waiver/draft/roster movement** correctly attributed and counted.
8. **Show honest unavailable states** wherever data is genuinely missing — never fabricate to make
   the proof look more complete than it is.

## 13. Sleeper Proof Requirements

Restated as concrete, checkable goals (the same list as §12, phrased as a checklist):

- [ ] Ingest real Sleeper activity for at least 2 leagues with different roles for the same test
      user (commissioner of one, manager-only in another).
- [ ] Commissioner OS (Mission Control + League Analytics) renders correctly for the
      commissioner-owned league, sourced from real Sleeper-derived activity.
- [ ] A User OS view (even a minimal one, per §16) renders correctly for the manager-only league.
- [ ] Decision OS's aggregate view (however minimal) shows a real cross-league signal, not just a
      single league in isolation.
- [ ] League health and activity trend are real and correct for both leagues.
- [ ] Active/inactive manager counts are correct, including any manager with no AllFantasy account.
- [ ] Trade/waiver/draft/roster activity counts are correct and match the real Sleeper source data.
- [ ] Every honestly-unavailable state (`no_snapshots`, `insufficient_history`,
      `league_health_unavailable`, empty retention-risk/actions lists) appears correctly where real
      data is genuinely missing — never fabricated to look more complete.

---

## 14. Leagues Where User Is Commissioner

Already proven end-to-end: Commissioner OS (Mission Control, League Analytics) reads real behavioral
facts for a league the signed-in user commissions, federated through League Health, degrading
honestly wherever data is thin. This is the fully-built half of the Sleeper proof path.

## 15. Leagues Where User Is Only Manager

**Not yet proven, and the current gap.** The same underlying `ManagerBehavioralIntelligence` already
computed for every active manager in a league (including the signed-in user, whether or not they
commission it) exists today — Commissioner OS just doesn't currently expose a manager-facing view of
it. Proving this half of the Sleeper path means either:
(a) auditing and aligning the existing Manager Hub (subsystem D) with Decision OS, or
(b) building a minimal new manager-facing view directly over `ManagerBehavioralIntelligence`, the
same way Mission Control was built directly over League Health rather than waiting for a larger
migration.
Both options are laid out, not decided, in §16/Phase D Increment 2.

**Phase D Increment 2 update (2026-07-08):** the audit is done —
[`USER_OS_MANAGER_OS_SLEEPER_PROOF_AUDIT.md`](USER_OS_MANAGER_OS_SLEEPER_PROOF_AUDIT.md). Its
finding sharpens option (b) above into the clear lower-risk path: `resolveManagerIntelligencePayload`
is already provider-agnostic, already role-agnostic, and already reachable without a commissioner
gate on at least one existing page (`LeagueTab.tsx`'s unconditional manager-intelligence fetch) —
option (a), aligning the separate, provider-specific Manager Hub (redraft-only, zero Decision OS
calls), is now the higher-risk path and not recommended first. One real open question remains before
building anything: whether an imported Sleeper league, viewed by a non-commissioner member, actually
routes through a page that already makes this fetch — unverified, and why no code was written this
increment.

**Phase D Increment 5 update (2026-07-08):** that open question is resolved (confirmed YES, by
reading `app/league/[leagueId]/page.tsx` + `lib/league/permissions.ts` directly — any user with a
claimed team/roster reaches `LeagueTab.tsx` regardless of platform), and the minimum User OS surface
is now built: `lib/decision-os/userOs.ts` (composes Phase 5.2's already-live
`deriveManagerBehavioralIntelligence` + the already-provider-agnostic
`resolveManagerIntelligencePayload`), a session-scoped `/api/decision-os/user-os` route, and a
`UserOsCard` wired into `LeagueTab.tsx` right next to the existing Manager DNA/Recommendations
cards. 18 new tests, zero regressions. See
`USER_OS_MANAGER_OS_SLEEPER_PROOF_AUDIT.md` §14 for full detail. **All three OS roles now have a
real, visible (or composition-level, for Platform OS) proof: Commissioner OS, User OS, and Platform
OS.**

**Phase D Increment 6 update (2026-07-08):** a real, repeatable end-to-end proof procedure now
exists — [`SLEEPER_OS_SUITE_PROOF_CHECKLIST.md`](SLEEPER_OS_SUITE_PROOF_CHECKLIST.md). It reuses the
existing `scripts/decision-os-import-sleeper-nonprod.ts` (which runs the real production import
pipeline against the real, public Sleeper API into a non-prod DB) and adds a new, read-only,
explicit-league-only `scripts/decision-os-suite-conformance.ts` that exercises Mission Control,
League Analytics, User OS, and Platform OS directly against real infrastructure. It also names,
precisely, the one remaining gap for seeing non-zero activity signals: no existing script yet
orchestrates pulling a real imported league's actual Sleeper transactions/rosters/draft picks and
running them through the already-built `ingestSleeperImportedActivity` emitter — the pieces all
exist, the connecting orchestration (with real per-league identity mapping) does not, and closing it
is deliberately out of scope for a verification-harness increment.

**Phase D Increment 7 update (2026-07-08):** that named gap is closed at the code level. New
`scripts/decision-os-ingest-sleeper-activity-nonprod.ts` fetches an already-imported league's real
Sleeper transactions/rosters/draft picks and runs them through the existing, unchanged
`ingestSleeperImportedActivity` pipeline, building a real manager identity mapping from the
persisted `UserProfile.sleeperUserId` reverse-lookup (a real AF-account link when one exists, an
honest external-only `stable_key` when none does — never fabricated). Full procedure updated in
`SLEEPER_OS_SUITE_PROOF_CHECKLIST.md` §3b. Not yet executed against a live Sleeper league in this
sandbox (no live network access here) — that real execution is the concrete remaining step.

**Phase D Increment 8 update (2026-07-08):** the checklist is now hardened into an operator-ready
runbook. Renamed the ingestion script's `--league` flag to `--afLeagueId` (it was easy to confuse
with the seeding script's own `--league`, which means the opposite — the Sleeper source id).
Added an honest warning when a fetch might have silently failed (rosters resolved but zero
transactions and zero draft picks came back — `lib/sleeper-client.ts`'s fetchers swallow every
error and return `[]`). Clarified that the conformance script's `✅`/`❌` mean "resolved" vs "failed
to resolve," not "has activity" vs "empty" — a real distinction that was previously conflated in the
doc's own wording. Documented the `--managerId` value convention (a real AF `userId`, or the exact
`sleeper:<id>` stable-key form for an external-only manager). Added a Troubleshooting section
covering the concrete failure modes an operator is actually likely to hit. 3 new tests for the new
warning helper; 2739/2739 total, zero regressions, zero new typecheck errors.

**Phase D Increment 9 update (2026-07-08):** the shadow-gated Platform Intelligence cutover question
(§7) is formally decided —
[`PLATFORM_INTELLIGENCE_CUTOVER_ADR.md`](PLATFORM_INTELLIGENCE_CUTOVER_ADR.md). The audit found the
question conflates two separate paths: (1) an internal AllFantasy UI reading Phase 5.3/5.4 directly
— still genuinely shadow-gated, no ADR authorizes it, **decision: do not cut over**, the minimum
Platform OS composition remains correct; (2) the external hosted Intelligence API
(`/api/v1/intelligence/*`) — has its **own**, already-Accepted ADR chain (5.5-5.10), is
**staging-verified with real test API keys** (`.env.staging`), and is only missing a **production**
enablement decision (a business/ops call, not a code gap). Neither path is cut over by this ADR. One
small, safe fix made: corrected a stale comment in `real-data-provider.ts` that incorrectly claimed
routes were still hardcoded to the stub provider (they've called `resolveDataProvider()` since Phase
5.9) — zero behavior change, no gate crossed.

---

## 16. What Each OS Must Show

| OS | Core question | What it must show |
| --- | --- | --- |
| **Decision OS** | What is happening across the platform, and why? | The underlying facts/intelligence every other OS reads — not itself a UI surface. |
| **Commissioner OS** | What should this commissioner do to keep the league healthy? | League health, trend, manager/activity counts, named at-risk managers + reasons, recommended actions. **Built.** |
| **User OS / Manager OS** | What should this manager do to compete better? | This manager's own engagement/participation tier, how their activity compares to their own history, concrete suggestions. **Not built.** |
| **Platform OS** | What should the fantasy app operator do to improve engagement and retention? | Cross-league health distribution, platform-wide engagement trend, intervention opportunities. **Derivation logic exists (Phase 5.4/6.5), unwired.** |
| **DFS OS** | (Deferred — subject to legal/compliance review.) | Not defined yet. |

---

## 17. What Is Built vs Partial vs Missing

**Built (real, tested, wired to a live surface):**
- Decision OS behavioral pipeline (facts, manager-tier intelligence).
- Imported/external activity ingestion (provider-agnostic, Sleeper-proven).
- Behavioral snapshot + trend history (capture logic; not auto-scheduled).
- League Health federation.
- Commissioner OS: Mission Control + League Analytics.

**Partial (real derivation exists, not wired to any surface, or wired to an unaligned surface):**
- League-level deterministic recommendations (Phase 5.3) — shadow-gated behind its own cutover ADR.
- Platform Behavioral Intelligence (Phase 5.4) and Platform Benchmarking (Phase 6.5) — real, tested,
  unwired.
- Manager Hub (subsystem D) — real, live, but not Decision OS-aligned.
- Sleeper ingestion — proven on fixtures, not wired to the live production backfill call site.
- Snapshot-capture scheduling — job/route exist, nothing invokes them automatically.

**Missing (does not exist in any form):**
- User OS / Manager OS as a distinct, Decision OS-aligned surface.
- Platform OS as a distinct surface.
- DFS OS, entirely.
- Any real, external (non-AllFantasy) client's provider adapter.
- Any measured retention/engagement/ROI outcome, for any client, on any data.

---

## 18. Client-Agnostic Integration Contract

The same contract any future client (The Replacements, Yahoo, ESPN, Fantrax, MFL, or otherwise)
would need to satisfy — this is the general version of what the Replacements-specific documents
already described for one prospective partner:

- **Stable league IDs.**
- **Stable manager/team IDs**, independent of any AllFantasy account.
- **Stable activity event IDs** (idempotency — re-sending the same event must never duplicate).
- **Real timestamps** for every activity item.
- **Trade / waiver / roster / draft activity**, each attributable to the manager(s) involved.
- **Optional: scoring/settings/roster metadata** — improves a small number of League Health fields
  that otherwise stay at schema defaults; not required for Commissioner OS's core signals.
- **Optional: subscription/platform engagement data** (renewals, league creation volume, feature
  usage) — not required for Commissioner OS or User OS; would matter for a future Platform OS
  surface once one is built and wired.

Any client satisfying this contract gets the same OS suite framework — the only per-client work is
one provider-specific emitter (§10), never a change to the shared pipeline.

---

## 19. Roadmap To Client-Ready Licensing

1. **Prove the Sleeper path site-wide** (§12/§13) — commissioner AND manager-only roles, real
   ingestion, honest degradation throughout. Currently blocked on User OS not existing (§15).
2. **Audit + build (or align) User OS** (Phase D Increment 2, §16 below).
3. **Wire Platform OS** (Phase 5.4/6.5) to a real, minimal surface — once User OS exists, to avoid
   solving two large alignment problems at once.
4. **Only after 1–3:** revisit a specific external client (The Replacements or otherwise) with a
   complete, multi-role, multi-OS demo — not just a single-surface, commissioner-only one.
5. **Provider adapter work for any specific client** (Replacements or otherwise) follows the
   provider-agnostic contract (§18/§10) and is scoped per-client only at the emitter layer.

## 20. What Not To Overpromise

- **No specific client has a working adapter.** Not The Replacements, not any other named platform.
- **No retention, engagement, or ROI number has been measured**, for any client, on any data.
- **User OS and Platform OS are not built** — described here conceptually, grounded in real existing
  derivation logic where it exists, but not demoable today.
- **DFS OS does not exist** and has no legal/compliance review yet — do not imply a timeline.
- **This roadmap is not a commitment to any specific client conversation's outcome** — it is an
  internal reframing so that any client conversation (Replacements or future) is understood as one
  instance of a broader product, not the product's ceiling.

---

## 21. The Replacements Is First-Client Collateral Only

The five Replacements-specific documents
([demo package](THE_REPLACEMENTS_COMMISSIONER_OS_DEMO_PACKAGE.md),
[provider adapter plan](THE_REPLACEMENTS_PROVIDER_ADAPTER_PLAN.md),
[technical discovery handoff](THE_REPLACEMENTS_TECHNICAL_DISCOVERY_HANDOFF.md),
[call script](THE_REPLACEMENTS_CALL_SCRIPT.md),
[demo-readiness checklist](THE_REPLACEMENTS_DEMO_READINESS_CHECKLIST.md)) remain fully useful and are
**not deprecated or deleted.** They should now be understood as:

- **A client-specific instantiation of the broader Fantasy OS Suite** described in this document —
  not the definition of the product itself.
- The template for what any future client's equivalent collateral would look like: a demo package, a
  provider-adapter plan, a technical discovery handoff, a call script, and a readiness checklist —
  each scoped to that specific client's data and conversation.
- Still the right documents to use **if and when** a Replacements conversation actually happens —
  nothing in them needs to change for that purpose.

Future clients (Yahoo, ESPN, Fantrax, MFL, or any other fantasy platform) would get the same
five-document treatment, built from this roadmap's client-agnostic contract (§18), not from
Replacements-specific assumptions.

---

## 22. Boundaries honored (this increment)

- No code changes — this is a positioning/roadmap document.
- The Replacements documents were not deleted, only recontextualized via pointer updates.
- No adapter code written for any client. `IMPORT_PROVIDERS` not modified.
- No DFS OS work — explicitly deferred pending legal/compliance review.
- No fake/demo data anywhere in this document.
- No production DB touched; no production cron enabled.
- PR #183 untouched, still draft, not merged.
- No Redraft/Start-Draft/PR-#166/AF-hosted-league work touched.
- No retention-lift or ROI numbers claimed anywhere in this document.
