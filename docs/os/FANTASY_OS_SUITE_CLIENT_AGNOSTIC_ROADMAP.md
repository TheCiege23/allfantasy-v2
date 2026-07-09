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

**Phase D Increment 11 update (2026-07-08):** that authorization gap is now closed —
`PLATFORM_OS_CLIENT_INTELLIGENCE_AUDIT.md` §17. Rather than inventing a new authorization system,
this increment reused the existing internal site-admin gate (`requireAdmin`/`lib/adminAuth.ts` — the
same one every `/api/admin/*` route already uses) via a new, narrow, injectable-deps wrapper,
`lib/decision-os/platformOsAuthorization.ts`. A new, authorized-and-tested route now exists —
`GET /api/decision-os/platform-os` — requiring an explicit `leagueIds` query param (never a default
or discovered list) and recording every query in the existing `AdminAuditLog`. **Still no UI/card**:
authorization is solved, but how an operator would actually supply a league-id list has no existing
UI convention to build on, and choosing one is a separate design decision this increment deliberately
left open rather than improvising. 12 new tests, 2751/2751 total, zero regressions, zero new
typecheck errors.

**Phase D Increment 12 update (2026-07-09):** Platform OS now has its first real UI —
`PLATFORM_OS_CLIENT_INTELLIGENCE_AUDIT.md` §19. New `components/admin/PlatformOsOperatorPanel.tsx`,
wired into the existing `/admin` dashboard (`app/admin/page.tsx`) as one more collapsed
`AccordionSection`, no new page. An operator pastes an explicit, comma-separated league-id list into
a plain textarea and clicks Fetch — there is no default list and nothing auto-fetches on mount, so
the panel is inert until a real operator types something real. The button calls the unchanged
`GET /api/decision-os/platform-os` route (Increment 11) and renders every field of the returned
`PlatformOsSnapshot`: league counts, manager/activity totals, the intervention queue, trend coverage,
provenance, and warnings. 7 new component tests (`@testing-library/react`), 2758/2758 total, zero
regressions. Live browser verification wasn't completed — the dev server's first compile didn't
finish inside this sandbox's available time, and `/admin` needs a real admin session this sandbox
doesn't have regardless — so the component tests exercise the interactive flow directly instead.

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
| Platform OS | Composition + authorized route + minimal admin UI exist (Increments 4/11/12) |
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

**Phase D Increment 10 update (2026-07-08):** the real Sleeper proof chain is now execution-ready.
Verified all three write/read scripts' CLI contracts are copy/paste-correct, then built
[`SLEEPER_PROOF_EXECUTION_PACKET.md`](SLEEPER_PROOF_EXECUTION_PACKET.md) — a short, fill-in-the-
blanks operator packet (six labeled placeholders, exact command order, browser steps) — as a
companion to the fuller `SLEEPER_OS_SUITE_PROOF_CHECKLIST.md`. Added one small, genuinely-missing
safety check: `decision-os-ingest-sleeper-activity-nonprod.ts` now supports `--dryRun`, running every
real step (league lookup, real Sleeper fetches, real identity mapping) but stopping before the actual
write — a zero-risk checkpoint for a first real run. Did not add a dry-run to the import-seeding
script (pre-existing, reused-as-is, lower-risk to leave alone) or the conformance script (already
fully read-only). Also built
[`OS_PROGRESS_DASHBOARD.md`](OS_PROGRESS_DASHBOARD.md) — a scannable status table across all five OS
products, the shadow-gate decisions, and Phase D's full increment history. **Still not executed
against a live Sleeper league or a real non-prod database in this sandbox** (no live network access
here) — that remains the concrete next step, now with a packet ready for whoever runs it.

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

## 23. Phase E — Live Proof Executed (2026-07-09)

Every claim in §12/§13 above is no longer just a design intention — it happened for real. Phase E
(`715b9209f`) executed the complete Sleeper proof chain against a real Sleeper account (`theciege24`),
a real completed league, and a dedicated isolated non-prod database: real import, real activity
ingestion, real snapshot capture, and real authenticated verification of Commissioner OS, User OS
(both commissioner and member roles), and Platform OS. Zero code defects found; zero code changed.
**Verdict: READY FOR CUSTOMER DEMO.** Full detail:
[`PHASE_E_LIVE_PROOF_EXECUTION_REPORT.md`](PHASE_E_LIVE_PROOF_EXECUTION_REPORT.md).

## 24. Phase OS-A — Fantasy OS Operating-System Alignment

**A new workstream, distinct from Phase D/E**: updating the existing Decision OS / Commissioner OS /
User OS / Platform OS codebase so it reads and behaves like an **operating system**, not an AI
dashboard bolted onto a single league. Seven primary product decisions govern this workstream:

1. **AI is background infrastructure, not the selling point.** Decision OS's intelligence should show
   up as correct, well-labeled signals throughout the product — not as a chatbot or "AI feature" the
   product is sold around.
2. **Commissioner OS's default view is a multi-league command center**, not a single selected league —
   the current Commissioner Hub (Mission Control/League Analytics for `commissionerLeagues[0]`) is a
   first step, not the final shape.
3. **Selecting a league switches INTO a league-focused Commissioner OS view** — the command center and
   the single-league view are two distinct modes of the same product, not two different products.
4. **Decision OS is global/app-wide intelligence, not username-scoped** — its outputs should be usable
   platform-wide (Platform OS), not conceptually tied to "whichever Sleeper account was used to prove
   it."
5. **`theciege24` (and the Phase E "Parbur" league) are proof data only** — never a hardcoded
   dependency, default, or assumption baked into any product code path.
6. **Paid/free league context is crucial and must be modeled provider-agnostically** — not coupled to
   Sleeper chat, a single escrow provider, or any one specific payment rail. **Phase OS-A1 (below)
   builds this foundation.**
7. **Notifications become an OS output surface for high-importance events** — a future, not-yet-built
   consumer of Decision OS signals (retention risk, financial-context changes, intervention-queue
   entries), not a separate, disconnected feature.

### OS-A1 — League Context Foundation (2026-07-09)

The first piece: a provider-agnostic **League Context** model answering "what does Decision OS believe
about this league's financial state, and how confident is that belief" — deliberately separate from
`LeagueFinance` (the existing AF-native Stripe/PayPal treasury system for leagues that opt into
AllFantasy's own paid-league feature; see `LEAGUE_CONTEXT_FOUNDATION.md` §1 for the full distinction).

New Prisma model `DecisionOsLeagueContext` (schema + migration `20260709000000_decision_os_league_context`
written and validated, **not applied to any database** this phase) with `financialStatus`
(`UNKNOWN|FREE|PAID|VERIFIED_PAID`), `escrowProvider` (`LEAGUESAFE|FANCRED|YAHOO|ESPN|MANUAL|OTHER|UNKNOWN`
— adapter hooks only, nothing integrated), and `financialConfidence`
(`UNKNOWN|USER_CONFIRMED|PROVIDER_CONFIRMED|ESCROW_VERIFIED|INFERRED`) as three independent axes. New
pure module `lib/decision-os/leagueFinancialContext.ts` — `defaultLeagueFinancialContext` (identical
fully-`UNKNOWN` result for every provider, Sleeper included — no chat/name/heuristic inference
anywhere), `applyManualFinancialConfirmation` (the only path to `FREE`, and to `PAID` short of a real
verification), `applyEscrowVerification` (the adapter hook for a future real integration — the only
path to `VERIFIED_PAID`/`ESCROW_VERIFIED`), plus confidence-gating and description helpers. 14 tests
covering the Sleeper-unknown default, manual paid/free confirmation, escrow-verified context, and an
explicit "unknown context never fakes confidence" case (including a PAID status with no real
confidence behind it — status alone can never imply confidence). 2772/2772 total, zero regressions,
zero new typecheck errors. **Foundation only** — no persistence-layer resolver, no route, no
Commissioner OS UI control yet; see `LEAGUE_CONTEXT_FOUNDATION.md` §6 for the recommended next phase.

### OS-A2 — League Context Wiring (2026-07-09)

Wires the OS-A1 foundation into real Commissioner OS flows. New Prisma-backed resolver
`lib/decision-os/leagueContext.ts` — `resolveLeagueFinancialContext` mirrors the established
honest-degradation pattern (no row/no delegate → the pure `UNKNOWN` default, never a crash);
`persistLeagueFinancialConfirmation` throws a real, catchable error rather than reporting false
success if the store can't persist. New `lib/decision-os/leagueContextAuthorization.ts` — combines the
league's own `getLeagueRole` (commissioner/co-commissioner) with the existing site-admin gate
(`requireAdmin`, the same one Platform OS uses) rather than inventing a new one; a plain member or
viewer is denied. New route `GET`/`POST /api/decision-os/league-context` — reads follow the exact
same session-only precedent every sibling Decision OS read route already sets; writes require the
authorization above. New Commissioner OS control, `LeagueContextCard`, wired into
`CommissionerHubPageClient.tsx` — safe to hardcode `canManage` since Commissioner Hub only ever
renders for leagues the signed-in user already commissions; the route re-verifies independently
regardless. The card's own copy explicitly distinguishes this from `LeagueFinance`/payment collection.
30 new/extended tests (pure-function additions, resolver, authorization, route contract), 2802/2802
total, zero regressions, zero new typecheck errors. **Still not exercised against a real database** —
the OS-A1 migration remains unapplied anywhere; see `LEAGUE_CONTEXT_FOUNDATION.md` §8 for OS-A3
candidates.

### OS-A3 — League Context Live DB Verification (2026-07-09)

The OS-A1 migration applied to the real, isolated Phase E non-prod project (`cool-lab-87438174`) —
the exact same database the Sleeper live proof used. Full round-trip verified against the real
"Parbur" league through the real route with a real, properly-signed session: `GET` before any row →
real `UNKNOWN`; `POST confirm_paid` → real `PAID`/`USER_CONFIRMED`, independently confirmed via direct
SQL that the row genuinely persisted; `GET` again → the same real row read back; `POST reset` → real,
SQL-confirmed full reset. Authorization verified live (not just mocked) — a real member account got a
genuine `403` on write, `200` on read. Zero bugs found, zero code changes made. Full detail:
`LEAGUE_CONTEXT_FOUNDATION.md` §8.

## 25. Phase OS-B — Commissioner Multi-League Command Center

The first increment of OS-A product decisions #2/#3 (§24 above): Commissioner Hub's default view is
no longer a single, automatically-picked league.

### OS-B1 — Commissioner Multi-League Command Center Foundation (2026-07-09)

New Decision OS composition `lib/decision-os/commissionerCommandCenter.ts` — a sibling to
`platformOs.ts`, not a wrapper (both call the same `resolveMissionControlSnapshot` per league, but
this one keeps per-league detail for ranking instead of discarding it after summing, avoiding a
redundant second fetch). New session-scoped route `GET /api/decision-os/commissioner-command-center`
— never accepts a client-supplied league list, always resolving the caller's own commissioner leagues
server-side via `getDashboardLeagueListForUser` (the exact same source of truth already driving every
other section of Commissioner Hub — deliberately not `getLeagueRole`, whose commissioner definition
genuinely diverges for Sleeper-imported leagues; live verification confirmed this mattered in
practice, not just in theory — see `COMMISSIONER_COMMAND_CENTER.md` §3). Five new reusable UI
modules — Overview stats, League Health Ranking, Attention Queue (explicitly designed for OS-B3's
future Notification Engine to read from directly), Recent Changes, League Switcher — composed into a
new "Multi-League Overview" section, now Commissioner Hub's default view. Selecting a league reveals
the existing League Focus experience (Mission Control, League Analytics, League Context, Manager DNA)
unchanged — a minimal-diff wiring change (`representativeLeagueId`'s *source* changed from an
automatic default to explicit selection state; every existing fetch/render that already depended on
it is untouched).

**A real naming collision was found and resolved before any UI was written**: `CommissionerShowcasePanel`
already owns the on-page label "Commissioner Command Center" for a separate, pre-existing, mostly-
static foundation-readiness widget. This phase's new section is titled "Multi-League Overview"
instead — both surfaces remain on the page, neither touched or merged into the other. Full detail:
`COMMISSIONER_COMMAND_CENTER.md` §1.

27 new tests, 2819/2819 in `__tests__/decision-os` (2802 baseline + 17) plus all 10 pre-existing
`commissioner-hub-*-wiring` tests unchanged — zero regressions. 158/158 baseline typecheck errors
unchanged (one real type mismatch found and fixed during this phase — `trend.direction`'s real third
value is `'flat'`, not `'stable'`). Live-verified against the real Phase E database: the real route
correctly returned an honest empty snapshot for a real account that — by the page's own established
"commissioner" definition — genuinely commissions zero leagues today (a real, validating finding, not
a bug); the browser correctly rendered that account's honest empty state with zero new console errors.

### OS-B2 — Decision OS Attention Queue (2026-07-09)

Turns OS-B1's Attention Queue from a relabeling of Mission Control's `recommendedActions` into a real,
deterministic priority engine, per the phase's own rule: Decision OS owns signal generation,
Commissioner OS owns presentation. New pure module `lib/decision-os/attentionSignals.ts` —
`DecisionOsAttentionSignal` (5 signal types: draft approaching, league context incomplete, low/high
league health, league requires review) + `deriveLeagueAttentionSignals` + `sortAttentionSignals`
(severity-then-recency, spec-stable). New standalone resolver `lib/decision-os/attentionQueue.ts`
(`resolveAttentionQueueSnapshot`) for future consumers without a resident Mission Control snapshot
(Notification Engine, Daily Brief, Platform OS, mobile). `commissionerCommandCenter.ts` derives
signals INLINE using the snapshot it already fetches — a documented decision to avoid double-fetching
Mission Control, the same "sibling not wrapper" discipline this whole suite already follows. Two
originally-suggested signal types ("Trade Activity Change", "Waiver Activity Change") deliberately NOT
built — no per-activity-type historical trend exists anywhere in this codebase, only an aggregate
event-count delta; building either would be a fabrication. 39 new tests, `__tests__/decision-os`
2819 → 2858/2858, combined with unchanged wiring tests 2868/2868 — zero regressions. 158/158 baseline
typecheck unchanged. Full detail: `ATTENTION_QUEUE.md`.

### OS-B3 — Daily Brief Composition Engine (2026-07-09)

Reorders the recommended sequence after OS-B2: build the composition layer that decides WHAT gets
delivered BEFORE building a Notification Engine with read/dismiss state, keeping that future engine
thin (`Decision OS → Brief/Notification Composition → Delivery Channels`, not
`Decision OS → Notification Engine (business logic) → Everything else`). New pure module
`lib/decision-os/dailyBrief.ts` — `composeDailyBrief` reshapes an already-produced Attention Signal
list + per-league trends + 3 already-aggregated counts into a `DailyBrief` (overview, top-5 priority
items, league highlights, positive highlights, deduplicated recommended actions, a deterministic
summary sentence) — never recomputes a health score, ranking, or signal. New standalone resolver
`lib/decision-os/dailyBriefResolver.ts` (`resolveDailyBrief`) for future consumers without a resident
snapshot (email digest, OS-B4 Notification Engine, mobile, Platform OS). The Commissioner Hub's own
"Today's Brief" card does NOT call that resolver — `CommissionerCommandCenterSection.tsx` composes the
brief directly from data it already fetched for its sibling cards, zero additional request (the same
no-double-fetch discipline OS-B2 established). Positive Highlights deliberately narrower than this
phase's own suggested examples — only real `high_league_health` signals; "completed drafts" and a
generic "strong engagement" threshold were both rejected as inventing new intelligence nothing else in
the suite already computes. 30 new tests, `__tests__/decision-os` 2868 → 2898/2898 — zero regressions.
158/158 baseline typecheck unchanged (error set byte-identical to the OS-B2 baseline). Full detail:
`DAILY_BRIEF.md`.

### OS-B4 — Notification Engine Foundation (2026-07-09)

Completes the separation of concerns started in OS-B3: "Decision OS owns intelligence. Daily Brief owns
digest composition. Notification Engine owns delivery-ready notification objects. Commissioner OS only
displays them." New pure module `lib/decision-os/notifications.ts` — `DecisionOsNotification`
(6 types: 4 named 1:1 from real Attention Signal types, plus `attention_signal` as the generic bucket
for `league_requires_review`, plus `daily_brief`) + a deterministic severity→delivery-policy mapping
(`critical`→immediate, `high`→prominent, `medium`→center, `low`/`informational`→inbox) + `id`-based
deduplication (no fuzzy matching). Deliberately stateless — no `read`/`dismissed` fields on the model
itself, since those are per-viewer session state, not something Decision OS can decide; built instead
as session-local React state inside the new `NotificationCenter.tsx` (mark read, dismiss — no database
persistence, per explicit instruction). New standalone resolver `lib/decision-os/notificationResolver.ts`
(`resolveNotificationFeed`) for future consumers without a resident snapshot — the Commissioner Hub's
own Notification Center does NOT call it, composing instead from data already on the page (the third
time this exact no-double-fetch discipline has been applied). **A real bug found and fixed**: the
Notification Center's list-item test-id was initially keyed on severity alone, colliding whenever two
notifications shared a severity — caught by a real "multiple elements found" test failure, fixed by
keying on the notification's own unique id. The identical pre-existing pattern in
`CommissionerAttentionQueue.tsx` (OS-B2) was flagged as a separate out-of-scope task rather than fixed
here. 35 new tests, `__tests__/decision-os` 2898 → 2933/2933 — zero regressions. 158/158 baseline
typecheck unchanged (error set byte-identical to the OS-B3 baseline). Full detail:
`NOTIFICATION_ENGINE.md`.

### OS-B Architecture Audit + OS-B4.5 — Platform OS Attention Signal Alignment (2026-07-09)

Requested as a short review before OS-B5: confirm one canonical path per model
(`DecisionOsAttentionSignal`/`DailyBrief`/`DecisionOsNotification`), verify no duplicate resolver
chains, check Manager OS/Platform OS could reuse the models without Commissioner assumptions. Findings
(`OS_B_ARCHITECTURE_AUDIT.md`): each model has exactly one canonical type + derivation site; the two
orchestration entry points per model (standalone resolver + zero-fetch UI composition) are a
documented tradeoff, not drift — traced line-by-line, no behavioral divergence found; one minor
duplication (`resolveFinancialContextSafely`, copy-pasted in 2 files); Platform OS (`platformOs.ts`,
Phase D — predates OS-B2) does NOT consume the Attention Signal model, running its own older, narrower
`interventionQueue` instead.

**OS-B4.5 closed that gap.** `platformOs.ts`'s `interventionQueue: PlatformOsInterventionEntry[]` →
`attentionQueue: DecisionOsAttentionSignal[]`, deriving signals inline (same no-double-fetch discipline
as `commissionerCommandCenter.ts` — this route is ALREADY LIVE with real traffic, unlike OS-B2–B4's own
standalone resolvers). Consolidated the audit's own duplication finding: `resolveLeagueFinancialContextSafely`
(previously 2 local copies) and `ATTENTION_QUEUE_CAP` (previously 2 local copies) are now single shared
exports (`leagueContext.ts`/`attentionSignals.ts`), used by all 3 composition files. **A real bug found
during migration**: 3 test files mocked the wrong function (`resolveLeagueFinancialContext`, not
`resolveLeagueFinancialContextSafely` — a known ESM-mocking gotcha where `{...actual, x: vi.fn()}`
doesn't rebind one export's internal call to a sibling export in the same module), silently corrupting
4 test assertions; fixed by mocking the function actually called. Also added `.catch(() => null)` at
all 3 composition call sites — a genuine defense-in-depth gap the bug investigation surfaced, not just
a test fix. 4 new tests, 2935/2935 total — zero regressions. 158/158 baseline typecheck unchanged
(byte-identical to OS-B4). Full detail: `OS_B4_5_PLATFORM_OS_ALIGNMENT.md`.

---

## 26. Boundaries honored

- No code changes to this document's own original content — §23/§24/§25 are additive.
- No multi-channel delivery built (OS-B5) — `resolveNotificationFeed`/`surfacePolicy` are designed to be
  read by one later, but nothing sends an email/push notification today.
- No Manager OS changes in OS-B1 through OS-B4.5; no Platform OS changes before OS-B4.5.
- No backend schema changes in OS-B1 through OS-B4.5 — `LeagueSettings.draftDateUtc` and
  `DecisionOsLeagueContext` are both real, pre-existing sources; OS-B2 added zero new columns/tables.
- No AI-generated or fabricated signals in OS-B2 — every signal type traces to an existing, already-real
  data source; two originally-suggested types were deliberately left unbuilt for lacking real data.
- No email delivery, push notifications, notification persistence/read-dismiss state, background jobs,
  or scheduling built in OS-B3 — `dailyBriefResolver.ts` is a pure request/response function, not a job.
- No Notification Engine behavior changed in OS-B4.5 — `notifications.ts`/`notificationResolver.ts`
  untouched; Platform OS still does not produce or consume `DecisionOsNotification`.
- No email sending, push notifications, cron/scheduled jobs, notification database persistence, new
  Decision OS signal generation, or LeagueSafe/FanCred integration built in OS-B4.
- The Replacements documents were not deleted, only recontextualized via pointer updates.
- No adapter code written for any client. `IMPORT_PROVIDERS` not modified.
- No DFS OS work — explicitly deferred pending legal/compliance review.
- No fake/demo data anywhere in this document.
- No production DB touched; no production cron enabled; the OS-A1 migration was written and
  validated but never applied to any database.
- No LeagueSafe/FanCred/payment/escrow integration built — `applyEscrowVerification` is an adapter
  hook only, per explicit instruction.
- No chat-based or heuristic inference of league financial status, for Sleeper or any provider.
- PR #183 untouched, still draft, not merged.
- No Redraft/Start-Draft/PR-#166/AF-hosted-league work touched.
- No retention-lift or ROI numbers claimed anywhere in this document.
