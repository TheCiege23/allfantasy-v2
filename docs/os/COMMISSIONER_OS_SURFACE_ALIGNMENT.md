# Commissioner OS Surface Alignment — Phase B, Increment 1

**Audit + one safe alignment. PR #183 (Decision OS Phase A) stays draft, untouched, not merged.**
No Redraft/Start-Draft/PR-#166 work. No Mission Control/League Analytics UI built. No fake demo
data. Primary business target: **The Replacements demo.**

**Date:** 2026-07-08 · **Branch:** `g15-event-foundation`.

---

## 1. Executive summary

**Finding: Commissioner OS is not one system today — it is at least four separate, non-interoperating
"intelligence" subsystems**, each with its own storage and its own surfaces. Decision OS Phase A
(Increments 1–5: imported activity, behavioral events, snapshots/trends) is **real and tested**, but
almost nothing in the current UI reads it yet — most surfaces read one of three *other*, older
systems instead.

**This increment implements exactly one safe, high-leverage alignment** (per the "implement only the
first safe alignment" instruction) and otherwise **stops at the audit**, per the "if too many
surfaces are misaligned, produce the sequence instead of guessing" instruction — because that is
what the evidence supports.

- ✅ **Aligned this increment:** `lib/decision-os/dashboard-intelligence.ts` — the composition that
  **already powers live UI** (Commissioner Hub, Dashboard Overview, `LeagueTab`) — now merges Decision
  OS Phase A's imported/external-league activity into the same behavioral-facts pipeline it already
  used. This is additive, low-risk, and immediately improves Manager Activity, Trade/Waiver/Roster/
  Draft activity, and Recommendations for **every manager, including ones with no AllFantasy
  account** — the literal Replacements-demo requirement.
- ⛔ **Not done this increment (need their own architecture decision, not a guess):** League Health,
  the Commissioner Intelligence Hub's 7 modules (all trace to a *third* system), Manager Hub's P2–P4
  contracts (a *fourth* system), and building Mission Control / League Analytics (don't exist).

---

## 2. The four subsystems (what "Decision OS output" currently means, depending who you ask)

| # | Subsystem | Storage | Consumers |
| --- | --- | --- | --- |
| **A. Decision OS behavioral pipeline** (Phase A's target) | `BehavioralEvent`s derived live from `WaiverClaim`/`AfLeagueTrade`/`AfRosterMoveHistory`/`DraftPick` + **redraft** tables + (as of this increment) `DecisionOsImportedActivity` | `lib/decision-os/behavioral/*` → `assemble.ts`/`manager-intelligence.ts` | `real-data-provider.ts` (flag-gated, **not called by any UI found**) AND `dashboard-intelligence.ts` (✅ **live UI**: Commissioner Hub, Dashboard Overview, `LeagueTab`) |
| **B. Phase 6 Decision Intelligence Layer** | Derived in-memory from subsystem A's output (no independent storage) | `lib/decision-os/phase6/*` (DNA, Recommendations, Archetype, Benchmarking) | `LeaguePulseCard`/`ManagerDnaCard`/`DecisionRecommendationsCard` on the Commissioner Hub dashboard — **via `dashboard-intelligence.ts`, so it inherits this increment's alignment too** |
| **C. G15 DomainEvent / IntelligenceQueryService** | `IntelligenceLeagueSnapshot` (single row per league, latest-state only, no history) + `IntelligenceManagerSnapshot` + `AuditFeedEntry` | `lib/intelligence/IntelligenceQueryService.ts` | **All 7 Commissioner Intelligence Hub modules** (`/league/[id]/intelligence`): Activity, Health, ActionItems, AuditFeed, Stories, **and** Trade Review + Rule Settings (both also read `IntelligenceLeagueSnapshot` under the hood) |
| **D. Manager Intelligence Platform (P2–P4)** | Own contracts (`lib/decision-os/manager-intelligence/{team-health,weekly-outlook,transaction-readiness}`) | Own resolvers, largely independent of A/B/C | Manager Hub (`/league/[id]/manager-hub`) |

**Plus, separately: `lib/league-health.ts`'s `monitorLeagueHealth`** — used by `/api/league-health`,
has **zero relationship** to any of the four subsystems above (confirmed in the Phase A audit).

None of these four subsystems currently read from each other in a coordinated way. Subsystem A is the
only one Decision OS Phase A extends; subsystems B/C/D are separate, older, independently-storaged
systems that predate Phase A.

---

## 3. Surface-readiness matrix

| Surface | Current source | Real Decision OS (subsystem A) available? | Gap | Needed implementation | Demo priority |
| --- | --- | --- | --- | --- | --- |
| **Mission Control** | ❌ does not exist by this name anywhere | N/A | Not built | New surface (explicitly out of scope this increment) | High (named target) — **defer** |
| **League Analytics** | ❌ does not exist by this name anywhere | N/A | Not built | New surface (explicitly out of scope this increment) | High (named target) — **defer** |
| **League Health** (`app/api/league-health`) | `monitorLeagueHealth` (`lib/league-health.ts`) — independent | No | Totally separate system; Phase A's finding stands | Decide: replace with subsystem-A-derived health, or federate the two (open question from Phase A, still open) | High — **needs an architecture decision, not a blind swap** |
| **Manager Intelligence** — Commissioner Hub / Dashboard Overview / `LeagueTab` (`dashboard-intelligence.ts`) | Subsystem A (behavioral pipeline) directly | **Yes — was already the real source** | Was missing the Phase A imported-activity merge (external managers invisible) | ✅ **DONE this increment** | **Highest — directly serves the Replacements case** |
| **Recommendations** (`DecisionRecommendationsCard`, dashboard) | Subsystem B (Phase 6), derived from subsystem A via `dashboard-intelligence.ts` | Yes, indirectly | Inherits the same gap as above | ✅ **Fixed as a side effect of the same change** (same composition function) | High |
| **Manager Intelligence Hub** (`/manager-hub`, Team Health / Weekly Outlook / Transaction Readiness) | Subsystem D (own contracts) | No — separate system | Doesn't read subsystem A at all | Needs its own audit of what P2–P4 actually read before any alignment (out of scope to guess this increment) | Medium |
| **Commissioner Intelligence Hub** — Activity module | Subsystem C (`IntelligenceQueryService` → `IntelligenceLeagueSnapshot`) | No | Different storage, different event taxonomy (G15 DomainEvents, not `BehavioralEvent`) | Requires a decision: migrate subsystem C onto subsystem A, or keep both and reconcile counts | High (named: "Activity") — **needs a decision** |
| Commissioner Intelligence Hub — **Health** module | Subsystem C | No | Same as above | Same as above | High (named: overlaps "league health") |
| Commissioner Intelligence Hub — Action Items | Subsystem C | No | Same as above | Same as above | Medium |
| Commissioner Intelligence Hub — Trade Review | Subsystem C (`IntelligenceLeagueSnapshot` trade counts) | No | Same as above | Same as above | High (named: "trade activity") |
| Commissioner Intelligence Hub — Rule Settings | Subsystem C-adjacent (stored config, not activity) | N/A | Not an activity/facts surface — out of scope for this alignment | None needed | Low |
| Commissioner Intelligence Hub — Stories | Subsystem C (`IntelligenceQueryService` + `StoryEngine`) | No | Same as above | Same as above | High (named: "storylines / narrative") |
| Commissioner Intelligence Hub — Audit Feed | Subsystem C (`AuditFeedEntry`) | No | Same as above | Same as above | Medium |
| **Reports** | ❌ no dedicated surface found | N/A | Not built | Undetermined — not requested to build | Low (not named as a hard requirement) |
| **Automations** | ❌ no unified surface; only scattered per-feature toggles (survivor challenges, waiver automation, etc.) | N/A | Not a Commissioner OS surface today | Undetermined | Low |
| **Notifications** | `app/alerts` — a user-facing alert-*settings* page, not an intelligence surface | N/A | Different purpose entirely; not a Decision OS consumer | N/A | Low |
| **Retention risk** | ❌ no discrete signal found anywhere (subsystem A/B/C/D) | No | This isn't a "wrong source" gap — **the signal itself doesn't exist yet** | New derivation needed in subsystem A or B (a Decision OS *feature* gap, not a surface-wiring gap) | High (named target) — **needs Decision OS work first, not surface wiring** |
| **Trend movement over time** | Phase A Increment 5 (`lib/decision-os/snapshot/*`) | ✅ **Yes — wired this increment** (Increment 2, §4b): `dashboard-intelligence.ts`'s `leagueTrend` field | Read path is live; **no scheduler yet writes snapshot rows**, so it honestly reports `no_snapshots` until Increment 5's writer is scheduled somewhere real | Schedule `captureAndWriteBehavioralSnapshots` (a cron or similar) so real history accumulates | High (named target) — **wiring done; data-accumulation is the remaining piece** |

---

## 4. What was aligned this increment (implemented)

**`lib/decision-os/dashboard-intelligence.ts`** — the `loadLeagueEvents` composition (already
independently duplicating `real-data-provider.ts`'s event-loading shape, plus its own additional
redraft sources) now also merges imported/external-league activity:

```
loadLeagueEvents(leagueId, since):
  Promise.all([ waivers, trades, rosterMoves, draft, redraftTrades, redraftRosterPlayers,
                redraftRosterMoves, importedActivity ])   // ← new, additive
  → map each to BehavioralEvent[] → spread into one array (unchanged shape/order otherwise)
```

- Reuses the **exact same** honestly-degrading loader `real-data-provider.ts` already uses
  (`defaultLoadImportedActivityRows`, now exported for this reuse) — no duplicated degradation logic,
  no new failure mode.
- **Purely additive**: if a league has no imported activity, the merge contributes `[]` and behavior
  is byte-identical to before (proven by a regression test).
- This is the composition **`resolveManagerIntelligencePayload`** calls, and that function is what
  powers the **already-live** Commissioner Hub dashboard, Dashboard Overview, and `LeagueTab` — so this
  one change reaches real, currently-rendered UI, not a dead code path.
- **Honest degradation preserved:** an external-only manager with real imported activity gets a real
  profile; a manager (AF or external) with zero activity still gets the same honest zero-activity
  baseline as before (`primaryIdentity: 'unknown'`, `confidence: 0`) — never fabricated.

## 4b. Increment 2 — behavioral snapshot/trend history wired into the same surface (implemented)

**Goal:** make "is this league's activity trending up or down over time" visible, using Phase A's
already-built, already-tested snapshot/trend module (Increment 5) — which, per §7 item 1 below (from
Increment 1's own recommendation), was **built but consumed by nothing.**

- **`lib/decision-os/snapshot/prismaBehavioralSnapshotStore.ts`** gains
  `defaultListLeagueBehavioralTrend(leagueId, options?)` — a default reader mirroring Increment 3's
  `defaultLoadImportedActivityRows` exactly: if the `decisionOsBehavioralSnapshot` model isn't
  generated/migrated, or the read fails, it returns `[]` — **never throws, never fabricates a point.**
- **`lib/decision-os/dashboard-intelligence.ts`** gains `resolveLeagueActivityTrend(leagueId)` (a
  standalone, independently-testable function) and an additive `leagueTrend` field on
  `ManagerIntelligencePayload` — the same payload `resolveManagerIntelligencePayload` already returns
  to the **already-live** Commissioner Hub / Dashboard Overview / `LeagueTab` composition.
- **Honest by construction, not just by accident:** `direction` describes **activity-volume movement**
  (period-over-period event count), explicitly `'increasing' | 'decreasing' | 'flat'` — **not**
  `'improving' | 'declining'`, because this codebase's actual *health score* is subsystem C
  (`monitorLeagueHealth`/`IntelligenceLeagueSnapshot`), a separate, still-unaligned system (§3/§7
  item 2). Naming it "increasing/decreasing" avoids implying a value judgment the data doesn't
  support — the same honest-degradation discipline this whole workstream has followed.
- **Availability contract** (mirrors `deriveEventCountDelta`'s own "< 2 points → `null`" rule):
  - 0 captured periods → `{ available: false, reason: 'no_snapshots' }`
  - 1 captured period → `{ available: false, reason: 'insufficient_history' }`
  - ≥2 captured periods → `{ available: true, periodsTracked, earliestPeriodKey, latestPeriodKey,
    latestEventCount, latestManagerCount, eventCountDelta, direction }`
- **Decoupled failure domains:** `leagueTrend` is resolved **independently** of the
  DNA/Recommendations computation (not inside the same `try/catch`) — a trend-read hiccup can never
  suppress a real `managerDna`/`recommendations` result, and a DNA/Recommendations failure can never
  hide a real trend result. Both directions are tested.
- **Imported/external activity flows through:** since Increment 5's snapshots already capture
  `activeManagerIds` from the full behavioral event stream (which, after Increment 1's alignment,
  includes imported/external-league managers), `latestManagerCount` on the trend honestly reflects
  external-only managers too — tested directly.

### Tests added (Increment 2)

`dashboard-intelligence-pipeline.test.ts` gains 9 tests (31/31 total in this file, up from 22/22):
empty league → `no_snapshots`; one snapshot → `insufficient_history`; two-plus snapshots → a real
`increasing` trend with correct delta/period fields; a declining count → `decreasing`; an unchanged
count → `flat`; an external-only manager's activity reflected in `latestManagerCount`; existing
managerDna/recommendations behavior unchanged when there's no trend history (regression guard); a
trend-store failure never affects managerDna/recommendations (decoupled-failure proof); and a wiring
proof that the reader is called with the league id, league-scope (no managerId).

**Full suite run:** `dashboard-intelligence-pipeline.test.ts` (31/31) + the full decision-os ingestion
suite (Increments 1–5, 78/78) — **109/109 total, zero regressions.** Full-repo typecheck: 158 baseline
errors (unchanged from Increment 1), **zero in any file this increment touched.** No schema change,
no migration, no Neon proof needed (pure read-composition wiring; the model + migration already
shipped in Phase A Increment 5).

## 5. Preserved honest degradation (Do #6)

- No imported activity for a league → the merge contributes nothing; existing AF-native/redraft-only
  behavior is unchanged (regression-tested).
- Imported-activity loader failing → caught by the existing outer `try/catch` in
  `resolveManagerIntelligencePayload`, resolves to `{ managerDna: null, recommendations: null }` —
  the same honest-failure contract every other source already has (tested).
- ~~Trend data is not yet wired to any surface~~ **Wired in Increment 2** (§4b) — and while
  wired-but-empty (no captured snapshot history yet, since no scheduler writes them), it reports
  `no_snapshots` honestly rather than a fabricated trend line.

## 6. Tests added

`__tests__/decision-os/dashboard-intelligence-pipeline.test.ts` (existing 16 tests untouched, still
green) gains:
- Regression: zero imported activity ⇒ unchanged existing behavior.
- Imported Sleeper trade activity **alone** (no AF-native/redraft data) now produces a real,
  non-baseline profile (`transactionStyle: 'trade_dominant'`).
- **An external-only manager (no AllFantasy account) gets a real profile keyed to their stable
  provider id** — the core Replacements-demo proof.
- Empty imported activity still yields the exact same honest zero-activity baseline as before (no
  demo-metric fabrication).
- Degraded-safe: the imported-activity loader throwing still resolves honestly (`null`/`null`), not a
  rejected promise.
- Wiring proof: `defaultLoadImportedActivityRows` is called with the league id + a since `Date`,
  alongside the other real sources.

**Full suite run:** `dashboard-intelligence-pipeline.test.ts` (22/22) + the full decision-os ingestion
suite (Increments 1–5, 78/78) — **100/100 total, zero regressions.** Full-repo typecheck: 158 baseline
errors (unchanged), **zero in any file this increment touched.**

## 7. Recommended implementation sequence (per "too many misaligned surfaces → produce a sequence")

Most of the matrix's gaps are **not** safe to guess at — each is a real architecture decision:

1. ~~Increment 2 (clean, low-risk, high demo value): wire Phase A's trend history into a surface.~~
   **✅ DONE (§4b)** — `leagueTrend` is now on the same payload the live dashboard/Commissioner Hub
   composition already returns. **Note carried forward:** no scheduler yet writes snapshot rows in any
   real environment, so this will report `no_snapshots` until Increment 5's writer is scheduled — that
   remains open (see Phase A's own remaining-work list).
2. **Increment 3 (architecture decision required): League Health.** Decide replace-vs-federate
   `monitorLeagueHealth` with subsystem-A-derived facts. This is the same open question Phase A
   already surfaced — still unresolved, needs an explicit answer before code.
3. **Increment 4 (larger, needs sign-off): Commissioner Intelligence Hub migration.** All 7 modules
   (Activity/Health/ActionItems/TradeReview/Stories/AuditFeed, +RuleSettings unaffected) trace to
   subsystem C (`IntelligenceQueryService`/`IntelligenceLeagueSnapshot`), a different event taxonomy
   than subsystem A. Migrating this is a real, multi-module undertaking — not a "prefer re-pointing"
   one-liner — and should get its own dedicated audit + explicit go-ahead, not be guessed here.
4. **Increment 5: Manager Intelligence Hub (P2–P4) audit.** Subsystem D hasn't been examined deeply
   enough this pass to know its exact gap; needs its own look before touching it.
5. **Retention risk signal.** This is a **Decision OS feature gap**, not a surface-wiring problem —
   no subsystem currently derives it. Needs a Phase-A-style derivation increment before any surface
   can show it.
6. **Only after 1–4 are resolved:** build Mission Control / League Analytics on top of a now-coherent
   set of real sources — building them earlier would mean building UI against subsystems that are
   about to be replaced or reconciled.

## 8. Boundaries honored
- PR #183 untouched, still draft, not merged.
- No Redraft/Start-Draft/PR-#166/AF-hosted-league work.
- No Mission Control, League Analytics, or broad UI built.
- No fake/demo data; all new tests assert honest degradation, not fabricated metrics.
- No production DB touched (this increment is code + tests only — no migration, no Neon proof needed
  since no new schema/table was introduced).
