# ADR F5.8 — Intelligence API Real Data Provider

## Status
Accepted 2026-06-30

## Context

Phase 5.7 shipped route handlers backed by `stubDataProvider` (all methods return `null` →
`503 INTELLIGENCE_UNAVAILABLE`). Phase 5.8 replaces the stub with a real read-only provider that
completes the behavioral intelligence pipeline end-to-end:

```
Phase 5.1 ports (DB read)
  → Phase 5.1 mappers (rows → BehavioralEvents)
  → Phase 5.1 assembler (events → ManagerBehavioralFacts / LeagueBehavioralFacts)
  → Phase 5.2 deriver (facts → ManagerBehavioralIntelligence)
  → Phase 5.3 deriver (facts + managers → LeagueBehavioralIntelligence)
  → Phase 5.4 deriver (leagues + managers + events → PlatformBehavioralIntelligence)
  → Phase 5.6 resolvers (strip privates → external contract shape)
  → Phase 5.7 handler cores (envelope + error)
  → Phase 5.7 route files (NextResponse)
```

Route handler cores and route files are **unchanged** — the provider is injected.

---

## Decision

### D1 — Manager-ID source: events-derived (Option A)

**Selected: Option A — derive managerIds from behavioral events.**
Any manager with at least one event in the lookback window appears in intelligence.
Managers with zero events are silently absent.

**Option B — LeagueTeam join (REJECTED).**
Query `LeagueTeam.claimedByUserId` to enumerate all members.
Rejected: requires a cross-table join not in the Phase 5.1 port layer; `claimedByUserId` is
nullable for unclaimed teams; adds complexity not justified for this phase.

**Known limitation of Option A:** silent managers (zero events in the lookback window) are not
surfaced in per-manager or league participation counts. A future phase can supplement via
`LeagueTeam.claimedByUserId` join. This is documented in the provider file header and is
intentional — it follows the "honest, never fabricated" invariant.

---

### D2 — Lookback window

Default: **90 days**. Configurable via `INTELLIGENCE_LOOKBACK_DAYS` env var (integer, days).
Minimum: 1 day (clamped). Read at call time so env overrides take effect without restart.

`loadDraftRows` does not accept a `since` param — draft history is finite and always included
in full.

---

### D3 — Platform league cap

Default: **20 most-recent leagues** (by `createdAt desc`).
Configurable via `INTELLIGENCE_PLATFORM_MAX_LEAGUES` env var (integer).
Minimum: 1 (clamped).

Platform scope runs leagues in parallel via `Promise.allSettled`. Individual league failures
are silently skipped — partial platform intelligence is better than null. If zero leagues
exist, `derivePlatformBehavioralIntelligence([], [], [])` is returned (degraded but valid,
not null).

---

### D4 — Error handling / degraded responses

| Condition                          | Outcome                                 |
|------------------------------------|------------------------------------------|
| Empty events (sparse history)      | Non-null degraded intelligence (valid)   |
| Unknown managerId (no events)      | Non-null degraded intelligence (valid)   |
| Port throws                        | `null` → `503 INTELLIGENCE_UNAVAILABLE`  |
| `findLeagueIds` throws             | `null` → `503 INTELLIGENCE_UNAVAILABLE`  |
| One league in platform batch fails | Skip; aggregate from remaining leagues   |

The derivers handle zero-event inputs gracefully (returns `participationTier: 'inactive'`,
`completeness: 0`, etc.). This behaviour is from Phase 5.2–5.4 and is unchanged.

---

### D5 — Dependency injection

The factory `createRealDataProvider(deps?)` accepts optional overrides of the port functions
and `findLeagueIds` (Prisma `League.findMany`). This follows the project's `WaiverLoaderDeps`
pattern and enables testing without module-level mocking.

Default deps use the real Phase 5.1 port functions and the Prisma singleton.

---

### D6 — Tenant isolation

Phase 5.8: caller-supplied `leagueId` and `managerId` are trusted. No cross-tenant enforcement
at the provider level. Outer boundary is the API key + scope system (Phase 5.5/5.7).

Cross-tenant isolation is a Phase 5.9+ concern and will be documented in a future ADR when
API keys are associated with specific tenant IDs.

---

### D7 — Route file wiring

Route files (`app/api/v1/intelligence/*/route.ts`) are **left using `stubDataProvider`**.
The real provider is exported from the barrel (`realDataProvider`) for explicit opt-in.
Wiring routes to the real provider is a separate Phase 5.9 step that will include env-flag
gating and a staging soak period.

---

## Architecture Freeze compliance

This phase is additive:
- Phase 5.1 ports, mappers, assembler — **unchanged**
- Phase 5.2/5.3/5.4 derivers — **unchanged**
- Phase 5.6 resolvers — **unchanged**
- Phase 5.7 handler cores and route files — **unchanged**
- Architecture Freeze (`ARCHITECTURE_FREEZE.md`) is preserved

New files:
- `lib/decision-os/behavioral/api/ADR_F5_8_REAL_DATA_PROVIDER.md` (this document)
- `lib/decision-os/behavioral/api/real-data-provider.ts` (real provider + factory + types)

Barrel additions (additive only):
- `export type { RealDataProviderDeps }` from `./api/real-data-provider`
- `export { createRealDataProvider, realDataProvider }` from `./api/real-data-provider`
