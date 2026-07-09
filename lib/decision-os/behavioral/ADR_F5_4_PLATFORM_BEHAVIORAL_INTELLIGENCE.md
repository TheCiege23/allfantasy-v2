# ADR — Phase 5.4: Platform Behavioral Intelligence Foundation

**Status:** Accepted  
**Date:** 2026-06-30  
**Ticket:** Phase 5.4 — Platform Intelligence Foundation  
**Depends on:** ADR_F5_3_LEAGUE_BEHAVIORAL_INTELLIGENCE.md, ADR_F5_2_MANAGER_BEHAVIORAL_INTELLIGENCE.md

---

## Context

Phase 5.3 delivered `LeagueBehavioralIntelligence` — per-league engagement tier, retention risk,
commissioner workload, activity tiers, and health narrative inputs.

The next layer aggregates those per-league objects plus per-manager objects and raw behavioral events
into **platform-wide intelligence**: which leagues and managers need intervention, how ecosystem
activity (trade/waiver/draft) is distributed across leagues, a logical activity heatmap for temporal
signal extraction, and a deterministic engagement trend proxy.

This is **NOT analytics**. It is **NOT BI**. It is deterministic, rule-based intelligence derived
purely from already-assembled inputs, composing Phase 5.2 and 5.3 outputs without re-deriving them.

Decision drivers:
1. **No customer-specific logic** — all scoring rules are generic; no league names or manager IDs
   embedded in rules.
2. **Architecture Freeze** — additive only; zero modifications to Phase 5.0/5.1/5.2/5.3 contracts.
3. **Read-only / pure** — no writes, no DB access, no IO, no input mutation.
4. **No fabrication (P2)** — all scores degrade to 0/null when data is absent.
5. **No AI generation (P3)** — all outputs are rule-based.
6. **Shadow-only** — not wired to any production route until a Phase 5.5 cutover ADR is written.

---

## Options Considered

### Option A — Aggregate only from `LeagueBehavioralIntelligence[]` (REJECTED)

Use only league-level derived intelligence; skip `ManagerBehavioralIntelligence[]` and events.

**Problem:** Cannot produce a cross-league manager retention distribution (which managers across ALL
leagues are at critical risk?). Cannot produce an activity heatmap (no temporal data in league
intelligence). Missing per-manager retention signals that do not aggregate naturally through
league-level retention risk alone.

### Option B — All three inputs: leagues + managers + events (SELECTED)

- `LeagueBehavioralIntelligence[]` — league distribution, ecosystem health, commissioner quality.
- `ManagerBehavioralIntelligence[]` — cross-league manager retention distribution.
- `BehavioralEvent[]` — temporal activity heatmap and engagement momentum signal.

**Advantages:**
- Manager retention distribution spans all leagues naturally.
- Activity heatmap captures real temporal clustering from the raw event stream.
- No re-derivation — all per-entity signals already computed by Phase 5.2/5.3.
- Clean composition: Phase 5.4 consumes, never duplicates.

### Option C — Re-derive from raw facts and events (REJECTED)

Skip Phase 5.2/5.3 outputs and re-compute everything from `ManagerBehavioralFacts` + events.

**Problem:** Duplicates Phase 5.2/5.3 computation entirely. Violates the pipeline composition
principle established in the Architecture Freeze. Makes Phase 5.4 brittle to upstream fact-schema
changes.

---

## Decision

**Option B.** New `lib/decision-os/behavioral/platform-intelligence.ts` with:

1. `PlatformBehavioralIntelligence` — top-level type.
2. `PlatformEngagementTier` — `'thriving' | 'healthy' | 'moderate' | 'struggling' | 'inactive'`.
3. `LeagueHealthDistribution` — breakdown of league engagement tiers.
4. `CommissionerQualityDistribution` — commissioner workload distribution across leagues.
5. `PlatformRetentionDistribution` — manager-level and league-level retention risk breakdowns.
6. `PlatformEcosystemDimension` — cross-league activity health (trade / waiver / draft).
7. `PlatformActivityHeatmap` — logical 2D activity grid (day-of-week × hour-of-day UTC).
8. `PlatformEngagementTrends` — recency-based momentum signal from event timestamps.
9. `PlatformInterventionOpportunity` — prioritised list of leagues/managers needing action.
10. `PlatformIntelligenceProvenance` — input counts and derivedAt timestamp.
11. `derivePlatformBehavioralIntelligence(leagues, managers, events, now?)` — pure assembler.

---

## Architecture After Phase 5.4

```
LeagueBehavioralIntelligence[]  ManagerBehavioralIntelligence[]  BehavioralEvent[]
           │                                 │                          │
           └─────────────────────────────────┴──────────────────────────┘
                                             │
               derivePlatformBehavioralIntelligence()    ← NEW (Phase 5.4)
                                             │
                    PlatformBehavioralIntelligence        ← NEW (Phase 5.4)
                    ├── platformEngagementScore (0–100)
                    ├── platformEngagementTier
                    ├── leagueHealthDistribution
                    │     ├── elite / active / moderate / passive / dormant counts
                    │     └── healthyPercent / atRiskPercent
                    ├── commissionerQualityDistribution
                    │     ├── light / moderate / heavy / critical counts
                    │     └── managedPercent / overloadedPercent
                    ├── retentionDistribution
                    │     ├── managers: critical/high/medium/low counts + percents
                    │     └── leagues: critical/high/medium/low counts + percents
                    ├── tradeEcosystem / waiverEcosystem / draftParticipation
                    │     ├── tier (high/moderate/low/none)
                    │     ├── activeLeagues / activeLeaguePercent
                    │     └── perLeagueRate / perManagerRate
                    ├── engagementTrends
                    │     ├── sevenDayEventCount / thirtyDayEventCount
                    │     ├── recentActivityRatio
                    │     └── momentumSignal / trendConfidence
                    ├── activityHeatmap
                    │     ├── cells[] (sparse day-of-week × hour-of-day)
                    │     └── peakCellKey / peakDayOfWeek / peakHour / peakCount
                    ├── interventionOpportunities[] (capped at 20, priority-ordered)
                    ├── completeness / uncertainty / warnings
                    └── provenance / derivedAt
```

Stage 1 soak slices and all Phase 5.0/5.1/5.2/5.3 contracts are **not touched**.

---

## Scoring Formulas

### Platform engagement score (0–100)
```
platformEngagementScore = round(sum(l.leagueEngagementScore) / totalLeagues)
```
Zero when `totalLeagues = 0`.

### Platform engagement tier
| Tier        | Conditions |
|-------------|-----------|
| `thriving`  | score ≥ 70 AND healthyPercent ≥ 70 |
| `healthy`   | score ≥ 50 AND healthyPercent ≥ 50 |
| `moderate`  | score ≥ 30 AND healthyPercent ≥ 30 |
| `struggling`| score > 0 |
| `inactive`  | totalLeagues = 0 OR score = 0 |

Where `healthyPercent = round((elite + active) / totalLeagues × 100)`.

### League health distribution
- Count leagues by `leagueEngagementTier`.
- `healthyPercent = round((elite + active) / totalLeagues × 100)` (0 when no leagues)
- `atRiskPercent  = round((passive + dormant) / totalLeagues × 100)` (0 when no leagues)

### Commissioner quality distribution
- Count leagues by `commissionerWorkload`.
- `managedPercent   = round((light + moderate) / totalLeagues × 100)` (0 when no leagues)
- `overloadedPercent = round((heavy + critical) / totalLeagues × 100)` (0 when no leagues)

### Retention distribution
**Manager-level:** count `managerIntelligences` by `retentionRisk`.  
- `managerCriticalRiskPercent = round(criticalCount / totalManagers × 100)` (0 when no managers)
- `managerAtRiskPercent = round((critical + high) / totalManagers × 100)`

**League-level:** count `leagueIntelligences` by `retentionRisk`.  
- `leagueCriticalRiskPercent = round(criticalCount / totalLeagues × 100)`
- `leagueAtRiskPercent = round((critical + high) / totalLeagues × 100)`

### Ecosystem dimensions (trade / waiver / draft)
```
activeLeagues      = count leagues where that activity tier ≠ 'none'
activeLeaguePercent= round(activeLeagues / totalLeagues × 100)
totalEvents        = sum of that activity dimension's count across all leagues
perLeagueRate      = round(totalEvents / totalLeagues, 2)    (0 when no leagues)
perManagerRate     = round(totalEvents / totalManagers, 2)   (0 when no managers)
```

Ecosystem tier (based on `activeLeaguePercent`):
- `high`:     ≥ 80
- `moderate`: ≥ 50
- `low`:      > 0
- `none`:     = 0

### Activity heatmap (logical model, UTC timestamps)
From `BehavioralEvent[]`:
- For each event, derive `dayOfWeek = Date.parseUTC(occurredAt).getUTCDay()` (0=Sun, 6=Sat) and
  `hour = getUTCHours()`.
- Build sparse `HeatmapCell[]` (only non-zero cells).
- `peakCellKey = "${dayOfWeek}-${hour}"` of the cell with maximum count.
- `peakDayOfWeek` / `peakHour` extracted from peak cell key.
- `peakCount` = count of peak cell.

### Engagement trends (recency proxy)
```
sevenDayEventCount   = count events where occurredAt >= now − 7 days
thirtyDayEventCount  = count events where occurredAt >= now − 30 days
recentActivityRatio  = sevenDayEventCount / totalEvents  (null when totalEvents = 0)
recentlyActiveManagers = manager IDs (across events) with any event in last 7 days
recentlyActiveManagerPercent = round(recentlyActiveManagers.size / totalManagers × 100)
                               (null when totalManagers = 0)
```

Momentum signal (from `recentActivityRatio`):
- `insufficient_data`: `totalEvents = 0`
- `accelerating`:      ratio ≥ 0.50
- `steady`:            ratio ≥ 0.20
- `decelerating`:      ratio > 0
- `dormant`:           ratio = 0 (events exist but all older than 7 days)

Trend confidence:
- `insufficient`: totalEvents = 0
- `low`:          totalEvents < 10 OR totalLeagues < 3
- `medium`:       totalEvents < 50 OR totalLeagues < 5
- `high`:         totalEvents ≥ 50 AND totalLeagues ≥ 5

### Intervention opportunities (capped at 20, priority-ordered)
Built in this priority order (no duplicates per leagueId):
1. **critical** — leagues where `retentionRisk === 'critical'` AND `commissionerWorkload === 'critical'`
2. **critical** — remaining leagues where `retentionRisk === 'critical'`
3. **critical** — managers where `retentionRisk === 'critical'` (up to 5, to prevent explosion)
4. **critical** — remaining leagues where `commissionerWorkload === 'critical'`
5. **high**     — leagues where `retentionRisk === 'high'`
6. **high**     — leagues where `commissionerWorkload === 'heavy'`

Total capped at 20. Deduped within each pass by `leagueId`.

### Platform completeness & uncertainty
```
completeness = round(avg(l.completeness) for all leagues)  (0 when no leagues)
```

Uncertainty (`PlatformUncertaintyLevel`):
| Level       | Conditions |
|-------------|-----------|
| `very_high` | completeness < 20 OR totalLeagues = 0 |
| `high`      | completeness < 40 OR totalLeagues < 3 |
| `medium`    | completeness < 70 OR totalLeagues < 5 |
| `low`       | completeness ≥ 70 AND totalLeagues ≥ 5 |

### Provenance
- `leagueIntelligenceCount = leagueIntelligences.length`
- `managerIntelligenceCount = managerIntelligences.length`
- `eventCount = events.length`
- `avgLeagueLookbackDays`: median lookbackDays across leagues (null when all leagues have null or mixed values)
- `derivedAt = now.toISOString()`

---

## Warnings (platform-level)

| Key | When |
|-----|------|
| `no_league_intelligences_provided` | `totalLeagues = 0` |
| `no_manager_intelligences_provided` | `totalManagers = 0` |
| `no_events_provided` | `totalEvents = 0` |
| `single_league_sample` | `totalLeagues = 1` (distribution stats unreliable) |
| `high_platform_retention_risk` | `managerCriticalRiskPercent > 20` |
| `commissioner_overload_detected` | `overloadedPercent > 30` |
| `low_platform_completeness` | `completeness < 50` |
| `activity_heatmap_uses_utc` | `totalEvents > 0` (peak hours are UTC, not local) |

---

## Consequences

**Positive:**
- Platform intelligence computable from already-derived per-entity objects with zero new IO.
- Activity heatmap derived without additional DB reads.
- Intervention opportunities deterministic and testable — no LLM, no ML.
- No customer-specific logic; fully generic across all platform deployments.
- Architecture Freeze preserved; Phase 5.2/5.3 contracts consumed, not modified.

**Accepted risks / limitations:**
- `engagementTrends` is a recency proxy, not a true historical trend. Without time-series
  snapshots, direction of change cannot be established. Documented via `trendConfidence`.
- Intervention list cap at 20 means high-volume platforms may not surface all opportunities.
  Acceptable for a first read-only pass; Phase 5.5+ can increase the cap with pagination.
- Activity heatmap uses UTC; leagues in non-UTC timezones show offset peak hours.
  Warned via `activity_heatmap_uses_utc`.

**Not changed:**
- `BehavioralEvent`, `ManagerBehavioralFacts`, `LeagueBehavioralFacts` (Phase 5.0/5.1)
- `ManagerBehavioralIntelligence` (Phase 5.2)
- `LeagueBehavioralIntelligence` (Phase 5.3)
- All Stage 1 soak slices
- No port, mapper, assembler, or production route modified

---

## References

- `lib/decision-os/behavioral/league-intelligence.ts` — Phase 5.3 input interface
- `lib/decision-os/behavioral/manager-intelligence.ts` — Phase 5.2 input interface
- `lib/decision-os/behavioral/events/types.ts` — Phase 5.0 event substrate
- `lib/decision-os/ARCHITECTURE_FREEZE.md` — governance invariants
- `ADR_F5_3_LEAGUE_BEHAVIORAL_INTELLIGENCE.md` — upstream dependency
- `ADR_F5_2_MANAGER_BEHAVIORAL_INTELLIGENCE.md` — upstream dependency
