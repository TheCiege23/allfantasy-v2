# ADR — Phase 5.3: League Behavioral Intelligence Foundation

**Status:** Accepted  
**Date:** 2026-06-30  
**Ticket:** Phase 5.3 — League Behavioral Intelligence Foundation  
**Depends on:** ADR_F5_2_MANAGER_BEHAVIORAL_INTELLIGENCE.md, ADR_PHASE5_1_BEHAVIORAL_EVENT_PORTS.md

---

## Context

Phase 5.2 delivered `ManagerBehavioralIntelligence` — per-manager participation tier, retention
risk, dimension engagement scores, and commissioner nudges, all deterministic and read-only.

The next layer aggregates those per-manager objects plus `LeagueBehavioralFacts` into
**league-level intelligence**: engagement tier, participation distribution, activity tiers (trade /
waiver / draft), retention risk at league scope, commissioner workload, recommended actions, and
structured health narrative inputs ready for a future AI narrative call.

Decision drivers:

1. **Commissioner-first bar** — the commissioner must be able to see the entire league's health
   at a glance: who is active, how active, what actions to take.
2. **Architecture Freeze** — additive only. Zero modifications to Phase 5.0/5.1 contracts, Phase
   5.2 types, or any Stage 1 soak slice.
3. **Read-only / pure** — no writes, no DB access, no mutations. Deterministic with clock injection.
4. **No fabrication (P2)** — all scores degrade honestly. No estimates for missing data.
5. **No AI generation (P3)** — health narrative *inputs* are structured strings, not LLM-generated.
   Phase 5.4+ may pass them to Claude; this layer never does.
6. **Shadow-only** — not wired to any production route until a Phase 5.4 cutover ADR is written.

---

## Decision Drivers

1. League intelligence must compose naturally on top of per-manager intelligence (Phase 5.2 output).
2. Activity tiers (trade / waiver / draft) must be per-manager-rate-based, not raw totals.
3. Commissioner recommendations must be customer-facing, prioritised, and deterministic.
4. Retention risk at league scope reflects the aggregate of per-manager risks, not just event counts.
5. Health narrative inputs are structured strings for future AI use — no LLM call here.

---

## Options Considered

### Option A — Aggregate only from `LeagueBehavioralFacts` (REJECTED)

Use only the league-level facts (trade counts, active manager IDs, etc.) without per-manager
intelligences.

**Problem:** `LeagueBehavioralFacts` tracks `activeManagerIds` (managers with ≥1 event) but cannot
distinguish managers who are currently inactive from those who are historically low-engagement. Per-
manager `retentionRisk` and `participationTier` are already computed in Phase 5.2 and are richer
than what can be re-derived from league facts alone.

### Option B — Build from `LeagueBehavioralFacts` + `ManagerBehavioralIntelligence[]` (SELECTED)

The assembler takes:
- `LeagueBehavioralFacts` — for aggregate transaction counts, draft data, completeness.
- `ManagerBehavioralIntelligence[]` — for participation tier distribution, per-manager risk,
  engagement score averaging.

**Advantages:**
- No re-derivation of per-manager logic (trusts Phase 5.2 output).
- `ManagerBehavioralIntelligence[]` carries `isInactive`, `participationTier`, `retentionRisk`,
  `overallEngagementScore` — all the signals needed for league aggregation.
- Clean pipeline: Facts → Manager Intel → League Intel.

### Option C — New DB port for league-level queries (REJECTED)

Hit the DB directly for aggregate queries.

**Problem:** Violates the read-only / no-IO contract. Phase 5.1 ports already cover all needed
raw data; the intelligence layer must be purely derived from assembled facts.

---

## Decision

**Option B.** New `lib/decision-os/behavioral/league-intelligence.ts` with:

1. `LeagueBehavioralIntelligence` — top-level derived intelligence type.
2. `LeagueEngagementTier` — `'elite' | 'active' | 'moderate' | 'passive' | 'dormant'`.
3. `LeagueActivityDimension` — per-activity (trade / waiver / draft) tier + per-manager rate.
4. `LeagueRetentionRisk` — `'low' | 'medium' | 'high' | 'critical'`.
5. `CommissionerWorkloadLevel` — `'light' | 'moderate' | 'heavy' | 'critical'`.
6. `LeagueCommissionerRecommendation` — deterministic, customer-facing action item.
7. `LeagueHealthNarrativeInputs` — structured strings for future AI narrative generation.
8. `deriveLeagueBehavioralIntelligence(facts, managerIntelligences, now?)` — pure assembler.

---

## Architecture After Phase 5.3

```
LeagueBehavioralFacts        ManagerBehavioralIntelligence[]  (Phase 5.2 output)
       │                                     │
       └─────────────────────────────────────┘
                         │
       deriveLeagueBehavioralIntelligence()    ← NEW (Phase 5.3)
                         │
         LeagueBehavioralIntelligence          ← NEW (Phase 5.3)
         ├── leagueEngagementScore (0–100)
         ├── leagueEngagementTier
         ├── participationDistribution
         │     ├── totalManagers
         │     ├── activeManagers / inactiveManagers
         │     └── activePercent / inactivePercent
         ├── inactiveManagerCount
         ├── tradeActivity / waiverActivity / draftActivity
         │     ├── tier (high/moderate/low/none)
         │     ├── count (raw total)
         │     └── perManagerRate (rounded to 2 dp)
         ├── retentionRisk + reasons
         ├── commissionerWorkload + workloadItems[]
         ├── recommendations[] (prioritised, customer-facing)
         ├── healthNarrativeInputs (structured, no AI)
         └── completeness / derivedFrom / warnings / derivedAt
```

Stage 1 soak slices (lineup, waiver, trade, commissioner-health) are **not touched**.

---

## Scoring Formulas

### League engagement score (0–100)
```
activePercent       = round((activeManagers / totalManagers) × 100)
avgManagerScore     = round(sum(m.overallEngagementScore) / totalManagers)
leagueEngagementScore = round(activePercent × 0.50 + avgManagerScore × 0.50)
```
`activeManagers` = managers where `isInactive === false`.
Both components weighted equally: breadth (who is participating) and depth (how much).

### League engagement tier
| Tier       | Conditions |
|------------|-----------|
| `elite`    | score ≥ 70 AND activePercent ≥ 80 |
| `active`   | score ≥ 50 AND activePercent ≥ 60 |
| `moderate` | score ≥ 30 AND activePercent ≥ 40 |
| `passive`  | score > 0 |
| `dormant`  | totalManagers = 0 OR score = 0 |

### Activity tiers (per-manager rate)

**Trade:**  0→none, >0→low, ≥0.5/manager→moderate, ≥2/manager→high  
**Waiver:** 0→none, >0→low, ≥1/manager→moderate, ≥3/manager→high  
**Draft:**  0→none, >0→low, ≥1pick/manager→moderate, ≥5picks/manager→high

### League retention risk
| Level      | Conditions |
|------------|-----------|
| `critical` | activeManagers = 0 OR inactivePercent > 50 |
| `high`     | criticalRiskManagers > 0 OR inactivePercent > 30 |
| `medium`   | highRiskManagers > 0 OR inactivePercent > 10 |
| `low`      | inactivePercent ≤ 10 AND no high/critical risk managers |

### Commissioner workload
| Level       | Conditions |
|-------------|-----------|
| `critical`  | workloadItems ≥ 3 OR inactivePercent > 50 |
| `heavy`     | workloadItems ≥ 2 OR inactivePercent > 30 |
| `moderate`  | workloadItems ≥ 1 |
| `light`     | no workload items |

Workload items are generated for: inactive managers, critical-risk managers, high-risk managers,
and leagues with no transaction activity and active members.

---

## Health Narrative Inputs

These are deterministic structured strings, NOT AI-generated:

```typescript
{
  engagementSummary: string        // e.g., "8 of 12 managers are active"
  topConcern: string | null        // most urgent signal; null when none
  standoutSignal: string | null    // most positive signal; null when none
}
```

A future Phase 5.4 commissioner surface may pass these (plus league facts and manager intel) to
Claude to generate a human-readable narrative. That call happens in the UI layer, never here.

---

## Consequences

**Positive:**
- Commissioner sees a single object covering all league health signals.
- Recommendations are deterministic and testable — no LLM call required.
- Health narrative inputs decouple the data layer from the presentation layer cleanly.
- Architecture Freeze preserved; Phase 5.2 contracts are consumed, not modified.

**Negative / accepted risks:**
- `ManagerBehavioralIntelligence[]` must cover ALL league members (including those with zero events)
  to produce an accurate `inactiveManagerCount`. Sparse arrays will undercount inactive managers.
  Documented in warnings as `'no_manager_intelligences_provided'` when the array is empty.
- `avgManagerScore` averages over all managers including inactive (score 0). This intentionally
  penalises leagues where many members are inactive rather than rewarding the active subset.

**Not changed:**
- `BehavioralEvent`, `ManagerBehavioralFacts`, `LeagueBehavioralFacts` (Phase 5.0)
- `ManagerBehavioralIntelligence` (Phase 5.2)
- Port loaders, mappers, assembler (Phase 5.1)
- All Stage 1 soak slices

---

## References

- `lib/decision-os/behavioral/facts.ts` — LeagueBehavioralFacts interface
- `lib/decision-os/behavioral/manager-intelligence.ts` — Phase 5.2 ManagerBehavioralIntelligence
- `lib/decision-os/ARCHITECTURE_FREEZE.md` — governance invariants
- `ADR_F5_2_MANAGER_BEHAVIORAL_INTELLIGENCE.md` — upstream dependency
