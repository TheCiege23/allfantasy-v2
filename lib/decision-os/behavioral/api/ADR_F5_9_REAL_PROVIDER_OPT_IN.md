# ADR F5.9 — Intelligence API Real Provider Opt-In

## Status
Accepted 2026-06-30

## Context

Phase 5.8 built and exported `realDataProvider` but left the three route files
(`/api/v1/intelligence/platform|league|manager`) hardcoded to `stubDataProvider`.
Stub routes always return `503 INTELLIGENCE_UNAVAILABLE`, making the API untestable
with real data without a code change.

Phase 5.9 wires the routes to the real provider behind an explicit environment flag so
the API can be safely soak-tested on staging without a deploy and without touching
Stage 1 soak slices.

---

## Decision

### D1 — Env gate: `DECISION_OS_INTELLIGENCE_API_PROVIDER`

A single env var controls provider selection at call time:

| `DECISION_OS_INTELLIGENCE_API_PROVIDER` | Provider used          | When `DECISION_OS_INTELLIGENCE_API_ENABLED=true` |
|-----------------------------------------|------------------------|---------------------------------------------------|
| unset / empty / any value except `real` | `stubDataProvider`     | 503 INTELLIGENCE_UNAVAILABLE                      |
| `real`                                  | `realDataProvider`     | Live behavioral pipeline                          |

The value is read at **call time** (not module load), so env changes take effect without
restart (consistent with `INTELLIGENCE_LOOKBACK_DAYS` and `INTELLIGENCE_PLATFORM_MAX_LEAGUES`).

The outer gate (`DECISION_OS_INTELLIGENCE_API_ENABLED`) is evaluated first. Provider
selection is never reached if the API is disabled or the caller fails auth/scope.

---

### D2 — Selector function: `resolveDataProvider()`

Provider selection lives in a single testable function `resolveDataProvider()` in
`lib/decision-os/behavioral/api/provider-selector.ts`. Route files call it and inject
the result into the handler core. No provider logic sits in the route files.

```
Route file (thin)
  → resolveDataProvider()     ← reads DECISION_OS_INTELLIGENCE_API_PROVIDER
  → IntelligenceDataProvider  ← stubDataProvider | realDataProvider
  → handler core              ← unchanged from Phase 5.7
```

**Why not inline in route files?** The selector needs to be independently testable
(without Next.js) and the same logic must behave consistently across three routes.
A dedicated function avoids silent drift.

**Why not in the handler core?** Handler cores are pure (no env reads) per their Phase
5.7 ADR design. Injecting the provider from outside preserves that invariant.

---

### D3 — Failure propagation unchanged

If `realDataProvider` returns `null` (catastrophic DB error), the handler already
returns `503 INTELLIGENCE_UNAVAILABLE` — Phase 5.7 invariant, unchanged.

If individual leagues fail inside `getPlatformIntelligence`, the Phase 5.8 `Promise.allSettled`
pattern yields partial intelligence (not null), so partial data returns 200 not 503.

---

### D4 — Route file change scope

Each route file:
- Removes `stubDataProvider` import
- Adds `resolveDataProvider` import
- Replaces `stubDataProvider` argument with `resolveDataProvider()`

Three lines changed per file. No business logic added. Routes remain thin wrappers.

---

### D5 — Staging soak plan

Enable with:
```
DECISION_OS_INTELLIGENCE_API_ENABLED=true
DECISION_OS_INTELLIGENCE_API_PROVIDER=real
INTELLIGENCE_API_TEST_KEYS={"afk_test_<token>":"platform"}
```

Monitor for:
- 503 spikes (real provider DB errors)
- Unexpected 200s from unexpected callers (auth working correctly)
- Latency on platform endpoint (multiple league loads in series/parallel)

Disable instantly by unsetting `DECISION_OS_INTELLIGENCE_API_PROVIDER` (or setting to
any value other than `real`) with no deploy required.

---

## Architecture Freeze compliance

This phase is additive and thin:
- Phase 5.7 handler cores — **unchanged**
- Phase 5.8 real data provider — **unchanged**
- Phase 5.6 resolvers — **unchanged**
- Stage 1 soak slices — **untouched**

New files:
- `lib/decision-os/behavioral/api/ADR_F5_9_REAL_PROVIDER_OPT_IN.md` (this)
- `lib/decision-os/behavioral/api/provider-selector.ts` (selector function)

Modified files (thin changes only):
- `app/api/v1/intelligence/platform/route.ts`
- `app/api/v1/intelligence/league/route.ts`
- `app/api/v1/intelligence/manager/route.ts`
- `lib/decision-os/behavioral/index.ts` (barrel export)
