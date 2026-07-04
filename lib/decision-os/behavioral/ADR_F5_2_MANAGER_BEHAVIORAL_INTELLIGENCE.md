# ADR — Phase 5.2: Manager Behavioral Intelligence Foundation

**Status:** Accepted  
**Date:** 2026-06-30  
**Ticket:** Phase 5.2 — Manager Behavioral Intelligence Foundation  
**Depends on:** ADR_PHASE5_0_BEHAVIORAL_EVENT_FOUNDATION.md, ADR_PHASE5_1_BEHAVIORAL_EVENT_PORTS.md

---

## Context

Phase 5.0 defined the `BehavioralEvent` discriminated union and `ManagerBehavioralFacts` interfaces.
Phase 5.1 delivered the read-only DB ports, pure mappers (raw row → event), and the pure assembler
(`BehavioralEvent[]` → `ManagerBehavioralFacts`).

The next layer is **derived intelligence**: given assembled facts and the raw event stream, produce
scored, prioritised, actionable signals that the commissioner can act on without manual analysis.

The decision drivers are:

1. **Commissioner-first bar** — the commissioner must be able to identify inactive managers,
   low-engagement patterns, and recommended actions from a single derived object.
2. **Architecture Freeze** — no redesign of Phase 5.0/5.1 contracts. Additive enrichment only.
3. **Read-only invariant** — no writes, no DB access, no mutations. Pure functions only.
4. **No fabrication (P2)** — every zero is honest. Scores degrade to 0 when data is absent rather
   than being estimated from priors.
5. **No AI generation (P3)** — intelligence is deterministic. Nudges are rule-based, not
   LLM-generated. AI may consume this output, never produce it.
6. **Shadow-only** — not wired to any production route. Consumed only in conformance tests until
   a Phase 5.3 cutover ADR is written.

---

## Decision Drivers

1. Preserve the Architecture Freeze (no modification to `BehavioralEvent`, `ManagerBehavioralFacts`,
   or any Stage 1 soak slice).
2. The intelligence must be reproducible: same facts + same events + same clock → same output.
3. Commissioner nudges must be customer-facing (no internal terminology).
4. Engagement scoring must be multi-dimensional (lineup, waiver, trade, draft are independent).
5. Inactivity thresholds must be explicit and testable (not hidden behind fuzzy heuristics).

---

## Options Considered

### Option A — Extend `ManagerBehavioralFacts` with scored fields (REJECTED)
Add participation tier, engagement scores, and nudges directly to the Phase 5.0 contract.

**Problem:** Violates the Architecture Freeze. `ManagerBehavioralFacts` is the raw aggregation
contract (counts, completeness). Mixing intelligence into it would require modifying the frozen
Phase 5.0 interface and all existing tests that assert its shape.

### Option B — New `ManagerBehavioralIntelligence` type + pure assembler (SELECTED)
Create a new file (`manager-intelligence.ts`) with a new type hierarchy and a single pure
assembler function `deriveManagerBehavioralIntelligence(facts, events, now?)`.

**Advantages:**
- Zero modification to any Phase 5.0/5.1 contract or file.
- The function is trivially testable (no IO, deterministic with `now` injection).
- The barrel export (`index.ts`) gets a Phase 5.2 section identical in style to Phase 5.1.

### Option C — Inline derivation in each consumer (REJECTED)
Let each future consumer (Commissioner Hub, League Intelligence) re-derive scores independently.

**Problem:** Logic duplication, divergent scoring across consumers, no shared test coverage.

---

## Decision

**Option B.** New `lib/decision-os/behavioral/manager-intelligence.ts` with:

1. `ManagerBehavioralIntelligence` — the top-level derived intelligence type.
2. `ManagerEngagementDimension` — per-dimension (lineup / waiver / trade / draft) score.
3. `ManagerNudge` — a deterministic, customer-facing commissioner action item.
4. `ParticipationTier` — `'elite' | 'active' | 'moderate' | 'passive' | 'inactive'`.
5. `ManagerRetentionRisk` — `'low' | 'medium' | 'high' | 'critical'`.
6. `deriveManagerBehavioralIntelligence(facts, events, now?)` — the pure assembler.

---

## Architecture After Phase 5.2

```
BehavioralEvent[]            ManagerBehavioralFacts
     │                              │
     │  (Phase 5.1 assembler)       │
     └──────────────────────────────┘
                     │
     deriveManagerBehavioralIntelligence()   ← NEW (Phase 5.2)
                     │
       ManagerBehavioralIntelligence         ← NEW (Phase 5.2)
       ├── participationTier
       ├── retentionRisk + reasons
       ├── lineupEngagement (score, level, lastEventAt)
       ├── waiverEngagement
       ├── tradeEngagement
       ├── draftEngagement
       ├── overallEngagementScore
       ├── daysSinceLastActivity / isInactive / inactivityWarning
       ├── nudges[]  (commissioner action items)
       └── completeness / derivedFrom / warnings / derivedAt
```

Stage 1 soak slices (lineup, waiver, trade, commissioner-health) are **not touched**.

---

## Scoring Formulas

### Engagement dimensions (0–100 per dimension)

| Dimension | Count source | Thresholds |
|-----------|-------------|------------|
| Lineup    | `lineupSaveCount`     | 0→0, 1–2→40, 3–5→65, 6–9→80, 10+→95 |
| Waiver    | `waiverClaimCount`    | 0→0, 1→30, 2–4→55, 5–9→75, 10+→90 (+5 if any success, capped 100) |
| Trade     | `tradeProposalCount`  | 0→0, 1→40, 2–3→65, 4+→85 (+5 if any accepted, capped 100) |
| Draft     | `draftPickCount`      | 0→0, 1–5→50, 6–12→75, 13+→90 |

### Composite score
```
overall = lineup × 0.40 + waiver × 0.25 + trade × 0.25 + draft × 0.10
```
Rounded to nearest integer, clamped to [0, 100].

### Participation tier (from composite score + facts)
| Tier      | Condition |
|-----------|-----------|
| `elite`   | score ≥ 70 AND lineupSaves ≥ 3 AND (trades + waivers) ≥ 2 |
| `active`  | score ≥ 45 AND lineupSaves ≥ 1 |
| `moderate`| score ≥ 20 |
| `passive` | score > 0 (or eventCount > 0 with zero dimension engagement) |
| `inactive`| eventCount = 0 |

### Inactivity thresholds
- `isInactive = eventCount === 0 OR daysSinceLastActivity === null OR daysSinceLastActivity > 14`
- Nudge severity: 0→`nudge_never_engaged` (critical), 28d+→`nudge_inactive_28d` (critical),
  14d–28d→`nudge_inactive_14d` (high), 7d–14d→`nudge_inactive_7d` (medium).

### Retention risk
| Level      | Condition |
|------------|-----------|
| `critical` | eventCount = 0 OR daysSinceLastActivity > 28 |
| `high`     | daysSinceLastActivity > 14 OR (eventCount > 0 AND lineupSaves = 0) |
| `medium`   | participationTier = 'passive' |
| `low`      | participationTier in {moderate, active, elite} |

---

## Response Speed — Deferred to Phase 5.3

The original Phase 5.2 signal list included "response speed if derivable."

Analysis: `trade_accepted` and `trade_rejected` events have `managerId: null` (the receiver's
identity is not recorded in Phase 5.1 — only the proposer is). Without knowing which manager
accepted/rejected, trade response speed cannot be computed deterministically from the event stream.

Lineup response speed (how quickly a manager sets their lineup after news) would require correlating
`news_signal` timestamps (Phase F2.7 enrichment, not a behavioral event) with `lineup_saved`
timestamps. This cross-layer correlation is deferred to Phase 5.3 league intelligence enhancement.

---

## Consequences

**Positive:**
- Commissioner can identify inactive managers, ghost risks, and action items from a single call.
- Fully deterministic and testable — no network calls, no DB access.
- Composable: League Intelligence (Phase 5.3) can aggregate these per-manager objects.
- Architecture Freeze is preserved — zero modifications to Phase 5.0/5.1 contracts.

**Negative / accepted risks:**
- Engagement scoring is calibrated for a single-season redraft lookback. Dynasty leagues with
  multi-year histories may skew scores higher. Accepted: `lookbackDays` is surfaced in the output
  so consumers can qualify the interpretation.
- `trade_accepted` / `trade_rejected` don't carry `managerId`, so trade engagement only counts
  proposals, not counter-acceptance. This under-counts reactive traders. Documented in `warnings`
  when tradeAcceptedCount > 0 but tradeProposalCount = 0 (currently impossible by Phase 5.1 mapper
  design, but guarded for forward compatibility).

**Not changed:**
- `BehavioralEvent` shape (Phase 5.0)
- `ManagerBehavioralFacts` / `LeagueBehavioralFacts` interfaces (Phase 5.0)
- Port loaders, mappers, assembler (Phase 5.1)
- All Stage 1 soak slices (lineup, waiver, trade, commissioner-health)
- Any production route

---

## References

- `lib/decision-os/behavioral/events/types.ts` — BehavioralEvent discriminated union
- `lib/decision-os/behavioral/facts.ts` — ManagerBehavioralFacts interface
- `lib/decision-os/behavioral/assemble.ts` — Phase 5.1 assembler
- `lib/decision-os/ARCHITECTURE_FREEZE.md` — governance invariants
- `ADR_PHASE5_0_BEHAVIORAL_EVENT_FOUNDATION.md` — upstream dependency
- `ADR_PHASE5_1_BEHAVIORAL_EVENT_PORTS.md` — upstream dependency
