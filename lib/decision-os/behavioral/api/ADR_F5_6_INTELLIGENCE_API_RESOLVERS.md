# ADR — Phase 5.6: Intelligence API Internal Resolvers

**Status:** Accepted  
**Date:** 2026-06-30  
**Ticket:** Phase 5.6 — Intelligence API Internal Resolvers  
**Depends on:** ADR_F5_5_INTELLIGENCE_API_BOUNDARY.md  

---

## Context

Phase 5.5 defined the external API contracts (`api/contracts.ts`) and the tier permission matrix. The
contracts are curated subsets of the internal intelligence types — they exclude internal implementation
fields (`warnings[]`, `derivedFrom`, `signal`, `supportingEventIds`, `provenance`, etc.) and apply
privacy rules (no cross-tenant IDs, aggregate-only for `basic` tier).

Before any HTTP route can be wired (Phase 5.7), we need a pure bridge layer that maps the internal
intelligence types into the external contract shapes. This layer is the authoritative enforcement
point for the privacy rules defined in the Phase 5.5 ADR.

The resolver functions must be:
- **Pure** — no IO, no DB access, no auth, no network calls
- **Testable in isolation** — the route handler remains untested at this phase
- **Authoritative** — every privacy stripping rule is enforced here, not ad-hoc in the route
- **Stable** — the resolver contract is what the future SDK and widget rely on indirectly

---

## Options Considered

### Option A — Inline adapter logic in each route handler (REJECTED)

Put the mapping code directly inside the future `GET /v1/intelligence/...` route handlers.

**Problems:**
- Not testable without spinning up HTTP infrastructure
- Duplicates stripping logic if multiple endpoints share a response shape
- Route handler grows to mix concerns: auth, rate-limit, IO, and privacy stripping
- No enforcement boundary — a future developer could inadvertently add an internal field to a response

### Option B — Pure resolver functions (SELECTED)

Dedicated `api/resolvers.ts` with one pure function per intelligence type and tier variant:

```
resolveManagerIntelligence(intel, requestId, tier) → IntelligenceApiResponse<ManagerIntelligenceV1>
resolveLeagueIntelligence(intel, requestId, tier)  → IntelligenceApiResponse<LeagueIntelligenceV1>
resolvePlatformIntelligenceBasic(intel, requestId) → IntelligenceApiResponse<PlatformIntelligenceBasicV1>
resolvePlatformIntelligenceFull(intel, requestId)  → IntelligenceApiResponse<PlatformIntelligenceV1>
```

**Advantages:**
- Fully testable without HTTP — just call the function
- Single authoritative location for every privacy stripping rule
- TypeScript's structural type checker enforces the contract shapes at compile time
- Route handler becomes trivial: resolve intel → call resolver → return JSON

### Option C — Class-based mapper with DI (REJECTED)

A `IntelligenceApiMapper` class injected into route handlers.

**Problems:**
- Pure functions are the right tool here — no mutable state, no injected dependencies
- Over-engineered for what is straightforward field projection
- Adds boilerplate without benefit

---

## Decision

**Option B.** Pure resolver functions in `lib/decision-os/behavioral/api/resolvers.ts`.

---

## Privacy Stripping — Authoritative Field Matrix

Every omitted field is annotated with a `// STRIPS:` comment at the call site.

### Manager Intelligence — fields EXCLUDED from external response

| Internal field | Reason for exclusion |
|---------------|----------------------|
| `nudge.signal` | Machine-readable internal trigger key — implementation detail |
| `nudge.supportingEventIds` | Internal event IDs — not meaningful to API consumers |
| `engagementDimension.eventCount` | Raw event counts without context invite misuse |
| `engagementDimension.lastEventAt` | Not in external contract; use `daysSinceLastActivity` |
| `engagementDimension.warnings` | Internal gap signals |
| `inactivityWarning` | Internal; `isInactive` boolean carries the same signal |
| `derivedFrom` | Internal data-pipeline metadata |
| `lookbackDays` | Internal assembly parameter |
| `warnings` | Internal gap signals — not consumer-facing |

### League Intelligence — fields EXCLUDED from external response

| Internal field | Reason for exclusion |
|---------------|----------------------|
| `recommendation.signal` | Machine-readable internal trigger key |
| `activityDimension.count` | Raw event counts without league-size context |
| `activityDimension.warnings` | Internal gap signals |
| `retentionRiskReasons` | Internal; `retentionRisk` tier is the consumer-facing signal |
| `commissionerWorkloadItems` | Internal implementation strings |
| `healthNarrativeInputs` | Internal structured strings for a future AI narrative layer |
| `inactiveManagerCount` | Covered by `participationDistribution.inactiveManagers` |
| `derivedFrom` | Internal |
| `managerCount` | Internal |
| `lookbackDays` | Internal |
| `warnings` | Internal |

### Platform Intelligence Basic — fields INCLUDED (all others excluded)

Only these top-level fields appear in `PlatformIntelligenceBasicV1`:
`platformEngagementScore`, `platformEngagementTier`, `leagueHealthSummary` (% only),
`momentumSignal`, `trendConfidence`, `completeness`, `derivedAt`.

No `leagueId`, `managerId`, absolute counts, distributions, heatmap, or intervention list.

### Platform Intelligence Full — fields EXCLUDED from external response

| Internal field | Reason for exclusion |
|---------------|----------------------|
| `ecosystem.totalEvents` | Raw counts — use rates for cross-platform comparison |
| `ecosystem.activeLeagues` | Covered by `activeLeaguePercent` |
| `ecosystem.totalLeagues` | Platform scale — not for external disclosure on this signal |
| `ecosystem.warnings` | Internal |
| `engagementTrends.warnings` | Internal |
| `activityHeatmap.warnings` | Internal |
| `warnings` (top-level) | Internal |
| `provenance` | Internal data-pipeline metadata |

---

## Consequences

**Positive:**
- Phase 5.7 route handler implementation is straightforward: resolve intel → call resolver → return JSON
- Privacy rules are testable without HTTP infrastructure
- TypeScript enforces external contract shapes at compile time
- A future security audit has a single file to review for external field exposure

**Not changed:**
- Internal intelligence types (Phase 5.2/5.3/5.4)
- `api/contracts.ts` (Phase 5.5)
- Stage 1 soak slices
- No production routes modified
