# ADR — Phase 5.7: Intelligence API Route Skeletons

**Status:** Accepted  
**Date:** 2026-06-30  
**Ticket:** Phase 5.7 — Intelligence API Route Skeletons  
**Depends on:** ADR_F5_5_INTELLIGENCE_API_BOUNDARY.md, ADR_F5_6_INTELLIGENCE_API_RESOLVERS.md  

---

## Context

Phase 5.5 defined the external API contracts (`api/contracts.ts`) and the tier/scope permission matrix.  
Phase 5.6 built pure resolver functions that map internal intelligence to curated external shapes.  

Phase 5.7 wires those resolvers to HTTP endpoints, but without opening public production access.  
Routes must be:
- **Disabled by default** — `DECISION_OS_INTELLIGENCE_API_ENABLED=true` required
- **API-key gated** — distinct from the existing session-based G15.5 commissioner routes
- **Resolver-driven** — privacy stripping happens in Phase 5.6 resolvers, not inline in routes
- **No internal exposure** — `warnings[]`, `derivedFrom`, `provenance` never appear in responses

The existing routes at `/api/v1/intelligence/leagues/{id}/...` (G15.5) use Next.js session auth
and serve internal users. Phase 5.7 routes serve external API key consumers.

---

## Options Considered

### Option A — Extend existing G15.5 route tree (REJECTED)

Add Phase 5.7 handlers inside the existing `leagues/[leagueId]/` App Router segments.

**Problems:**
- Session auth vs. API key auth are fundamentally different — mixing them creates implicit
  privilege escalation risk if a session header is accidentally accepted.
- G15.5 response shapes (internal) differ from Phase 5.5 V1 contracts (external) — mixing
  them in one handler tree invites leakage.
- Architecture Freeze: G15.5 is a separate slice; introducing Decision OS behavioral
  intelligence resolvers into it is a cross-slice dependency with no ADR.

### Option B — Flat query-param routes, namespace distinct from G15.5 (SELECTED)

New flat routes at `app/api/v1/intelligence/{platform,league,manager}/route.ts`.  
Singular names (`league`, `manager`) are visually distinct from the existing plural directories
(`leagues/`, `managers/` inside the G15.5 tree). Query params (`?leagueId=`, `?managerId=`) 
carry identifiers rather than path segments.

**Advantages:**
- Zero namespace collision with existing G15.5 routes
- API key auth model fully isolated
- Routes are thin — all logic in testable handler cores (`intelligence-handlers.ts`)
- Phase 5.8 only needs to implement `IntelligenceDataProvider` — route files never change

### Option C — Separate URL prefix `/api/v1/behavioral/` (REJECTED)

Breaks the Phase 5.5 documented endpoint paths (`/v1/intelligence/...`).

---

## Decision

**Option B.** Three new flat routes under `app/api/v1/intelligence/`:
- `platform/route.ts` → `GET /api/v1/intelligence/platform`
- `league/route.ts`   → `GET /api/v1/intelligence/league?leagueId={id}`
- `manager/route.ts`  → `GET /api/v1/intelligence/manager?leagueId={id}&managerId={id}`

---

## Architecture

```
NextRequest
  │
  ▼
checkIntelligenceGate(headers)
  ├─ DECISION_OS_INTELLIGENCE_API_ENABLED ≠ 'true' → 503 INTELLIGENCE_UNAVAILABLE
  ├─ X-AllFantasy-API-Key missing           → 401 UNAUTHORIZED
  ├─ Key format invalid                     → 401 UNAUTHORIZED
  └─ tier resolved from key lookup          → GateOk { tier, requestId, env }
  │
  ▼
hasScope(tier, requiredScope)
  └─ tier lacks required scope → 403 FORBIDDEN
  │
  ▼
param validation (leagueId / managerId from searchParams)
  └─ required param missing   → 400 INVALID_REQUEST
  │
  ▼
dataProvider.get*(…)
  └─ returns null              → 503 INTELLIGENCE_UNAVAILABLE   [Phase 5.7 stub]
  │
  ▼
resolve*(intel, requestId, tier)   ← Phase 5.6 resolvers (privacy stripping here)
  │
  ▼
NextResponse.json(IntelligenceApiResponse<T>, { status: 200 })
```

---

## Gate Design (`gate.ts`)

- **Feature flag:** `DECISION_OS_INTELLIGENCE_API_ENABLED=true` must be set explicitly.
  Default (unset / false) returns 503 — safe disabled-by-default.
- **Header:** `X-AllFantasy-API-Key: afk_{env}_{token}` (env ∈ {test, live}; token ≥16 alphanum)
- **requestId:** `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`
  (no crypto dependency; sufficient for distributed tracing in skeleton phase)
- **Tier resolution:**
  - Reads `INTELLIGENCE_API_TEST_KEYS` env var (JSON: `{"afk_test_{t}": "commissioner"}`)
  - `test` env + key in map → mapped tier
  - `test` env + key not in map → 'basic' (dev mode — enables local integration testing)
  - `live` env + key in map → mapped tier
  - `live` env + key not in map → 401 UNAUTHORIZED (live keys must be registered)

---

## Data Provider Stub

`IntelligenceDataProvider` interface (3 methods, all return `null` in Phase 5.7):
```typescript
interface IntelligenceDataProvider {
  getManagerIntelligence(managerId, leagueId): Promise<ManagerBehavioralIntelligence | null>
  getLeagueIntelligence(leagueId):             Promise<LeagueBehavioralIntelligence  | null>
  getPlatformIntelligence():                   Promise<PlatformBehavioralIntelligence | null>
}
```

`stubDataProvider` returns `null` for all methods → every live request returns 503  
until Phase 5.8 wires up the real behavioral intelligence pipeline.

Route files never import from the intelligence derivation pipeline directly — they call the
provider, which is swapped in Phase 5.8 without changing any route file.

---

## Scope Gating Matrix (from Phase 5.5)

| Endpoint      | Required scope               | Tiers with scope                  |
|--------------|------------------------------|-----------------------------------|
| `/platform`  | `intelligence:platform:basic`| basic, commissioner, manager, platform |
| `/league`    | `intelligence:league:read`   | commissioner, platform            |
| `/manager`   | `intelligence:manager:read`  | manager, platform                 |

Platform-tier callers on `/platform` additionally have `intelligence:platform:full` →
`resolvePlatformIntelligenceFull` is called; all other tiers → `resolvePlatformIntelligenceBasic`.

---

## Error Shape

All errors are `IntelligenceApiError` from `contracts.ts`:
```typescript
{ code: IntelligenceApiErrorCode; message: string; requestId: string }
```

| Condition                  | Status | Code                      |
|---------------------------|--------|---------------------------|
| Feature flag off           | 503    | INTELLIGENCE_UNAVAILABLE  |
| API key missing            | 401    | UNAUTHORIZED              |
| API key invalid format     | 401    | UNAUTHORIZED              |
| Unknown live key           | 401    | UNAUTHORIZED              |
| Tier lacks required scope  | 403    | FORBIDDEN                 |
| Missing query param        | 400    | INVALID_REQUEST           |
| Data provider returns null | 503    | INTELLIGENCE_UNAVAILABLE  |

---

## Consequences

**Positive:**
- Hosted Intelligence API boundary exists behind a safe gate before any tenant infrastructure
- Handler cores are fully testable without HTTP or Next.js runtime
- Phase 5.8 only needs to implement `IntelligenceDataProvider`; routes, gate, resolvers unchanged
- Clear audit boundary: every response shape is enforced by Phase 5.6 resolvers, not ad-hoc

**Not changed:**
- G15.5 commissioner intelligence routes (`leagues/[id]/...`)
- Phase 5.6 resolvers or contracts
- Stage 1 soak slices
- Any existing production routes
