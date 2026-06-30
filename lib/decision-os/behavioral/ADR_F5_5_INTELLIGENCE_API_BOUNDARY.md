# ADR — Phase 5.5: Intelligence API Boundary Design

**Status:** Accepted  
**Date:** 2026-06-30  
**Ticket:** Phase 5.5 — Intelligence API Boundary Design  
**Depends on:** ADR_F5_2_MANAGER_BEHAVIORAL_INTELLIGENCE.md, ADR_F5_3_LEAGUE_BEHAVIORAL_INTELLIGENCE.md, ADR_F5_4_PLATFORM_BEHAVIORAL_INTELLIGENCE.md  

---

## Context

Phases 5.2–5.4 delivered three tiers of deterministic behavioral intelligence:

| Phase | Output | Inputs |
|-------|--------|--------|
| 5.2 | `ManagerBehavioralIntelligence` | `ManagerBehavioralFacts` + `BehavioralEvent[]` |
| 5.3 | `LeagueBehavioralIntelligence` | `LeagueBehavioralFacts` + `ManagerBehavioralIntelligence[]` |
| 5.4 | `PlatformBehavioralIntelligence` | `LeagueBehavioralIntelligence[]` + `ManagerBehavioralIntelligence[]` + `BehavioralEvent[]` |

These are currently shadow-only — not wired to any production route. Before wiring them to production consumers (Phase 5.6 cutover) and before any external SDK or widget (Phase 5.7+), we need a clear API boundary: what signals are external-facing, who can access them, how they're priced, and what privacy guarantees we make.

**Core product principle:** third parties must receive **capabilities**, not source code or backend internals. The API should be stable against internal refactors. A consumer should never need to know that the intelligence is derived from `BehavioralEvent[]` or that `warnings[]` is an implementation-level signal.

This ADR governs the hosted Intelligence API design. It is **not** an implementation ticket — no routes, no DB access, no live auth plumbing. Those are Phase 5.6 deliverables. What this ADR delivers is:

1. The endpoint matrix
2. The auth / tenant model
3. The tier permission matrix
4. The external type contracts (in `api/contracts.ts`)
5. The privacy and anonymization rules
6. The rate limit model
7. The versioning and deprecation strategy
8. Widget and SDK integration notes for future phases
9. Telemetry requirements for the future route handler

---

## Options Considered

### Option A — Expose Internal Types Directly (REJECTED)

Publish `ManagerBehavioralIntelligence`, `LeagueBehavioralIntelligence`, and `PlatformBehavioralIntelligence` as the API contracts.

**Problems:**
- Internal fields leak: `warnings[]` contains strings like `"no_events_in_lookback_window"` — these are backend implementation notes, not consumer-facing signals.
- `derivedFrom`, `lookbackDays`, `provenance.leagueIntelligenceCount` are internal data-pipeline metadata with no meaning to a third-party consumer.
- Any internal refactor (renaming a warning, adding a field to facts) becomes a breaking API change.
- `ManagerBehavioralIntelligence.retentionRiskReasons` contains strings derived from internal signal names that would confuse external consumers.
- **Violates the core product principle** — this exposes internals, not capabilities.

### Option B — Curated External Contracts (SELECTED)

Define a separate `api/contracts.ts` with versioned external types (`*V1`) that are a curated, stable subset of the internal types. The future API route handler maps internal types → external types at the boundary. Internal types can evolve freely as long as they can still produce the external shape.

**Advantages:**
- Breaking changes require explicit version bumps (`V2`), not accidental field renames.
- Internal refactors are invisible to API consumers.
- Privacy rules (which fields to omit, which to anonymize) are enforced at the contract layer.
- Tier gating (who sees what) is cleanly expressed as a mapping function, not a conditional field.
- SDK and widget code imports `api/contracts.ts` — they never see internal Decision OS types.

**Disadvantages:**
- Requires maintaining a mapping layer between internal and external types (Phase 5.6 implementation).
- Some duplication between internal types and external contracts — accepted cost of a clean boundary.

### Option C — Full Separate Service (REJECTED)

Deploy Intelligence as a microservice with its own DB access, completely decoupled from the main app.

**Problems:**
- Premature architecture at this stage — the intelligence layer is still shadow-only.
- Adds operational complexity (separate deploy, auth service, DB credentials) before any external consumer exists.
- Nothing prevents decoupling later (Option B's contracts are service-agnostic).
- **Wrong phase** — this is a Phase 5.5 API design ticket, not a platform-split ticket.

---

## Decision

**Option B.** Curated external contracts in `lib/decision-os/behavioral/api/contracts.ts`.

The future route handler (Phase 5.6) will:
1. Resolve internal intelligence objects from the existing assemblers
2. Map them to external contract types using a dedicated adapter (no logic in the route itself)
3. Wrap in the standard `IntelligenceApiResponse<T>` envelope
4. Apply tier-gating to select the correct external type variant

This ADR governs the **design**. Implementation in Phase 5.6.

---

## Endpoint Matrix

All endpoints are under the `/v1/intelligence/` prefix. The future base URL will be
`https://api.allfantasy.com/v1/intelligence/` or embedded in the main app at
`/api/v1/intelligence/`.

| Endpoint | Method | Scope Required | Tier | Description |
|----------|--------|---------------|------|-------------|
| `/v1/intelligence/platform` | GET | `intelligence:platform:basic` | basic | Platform summary (aggregate only) |
| `/v1/intelligence/platform` | GET | `intelligence:platform:full` | platform | Full platform intelligence |
| `/v1/intelligence/leagues/{leagueId}` | GET | `intelligence:league:read` | commissioner | League intelligence |
| `/v1/intelligence/managers/{managerId}` | GET | `intelligence:manager:read` | manager | Manager intelligence |

**Notes:**
- The `/v1/intelligence/platform` endpoint returns `PlatformIntelligenceBasicV1` for `basic`-scoped
  keys and `PlatformIntelligenceV1` for `platform`-scoped keys. Both shapes share `completeness`
  and `derivedAt`. The `meta.tier` field in the response envelope tells the client which shape was served.
- `/v1/intelligence/managers/{managerId}` requires `?leagueId={leagueId}` — manager intelligence
  is always league-scoped (a manager can appear in multiple leagues).
- No `POST`, `PUT`, `PATCH`, or `DELETE` endpoints — the API is **strictly read-only**.
- No batch endpoints in v1. Bulk access (e.g., all managers in a league) is a v2 candidate; early
  feedback from consumers will inform whether it's needed.

### Future endpoints (not in v1)

| Endpoint | Proposed scope | Notes |
|----------|---------------|-------|
| `GET /v1/intelligence/leagues/{leagueId}/managers` | `intelligence:league:read` + `intelligence:manager:read` | All managers in a league — v2 |
| `GET /v1/intelligence/platform/trends` | `intelligence:platform:full` | Historical trend snapshots — requires time-series store (Phase 6) |
| `POST /v1/intelligence/webhooks` | `intelligence:platform:full` | Push on intelligence refresh — Phase 6 |

---

## Auth / Tenant Model

### API Key

All endpoints require an API key in the `X-AllFantasy-API-Key` header:
```
X-AllFantasy-API-Key: afk_live_t1k2...
```

**Key format:** `afk_{env}_{opaque-random-token}`  
- `env`: `live` (production) or `test` (sandbox)
- No tenant ID embedded in the key — the key resolves to a tenant via the key store

**API key metadata** (stored server-side, never in the key itself):
```typescript
IntelligenceApiKeyMetadata {
  tenantId:          string          // opaque, never returned in responses
  scopes:            IntelligenceApiScope[]
  tier:              IntelligenceTier
  allowedLeagueIds:  string[] | null // null = all tenant leagues
  rateLimitPerHour:  number
  expiresAt:         string | null
}
```

### Tenant Isolation

- A tenant is the platform operator (e.g., an AllFantasy enterprise customer or a partner integration).
- Every API key is scoped to exactly one tenant.
- All `leagueId` and `managerId` values in requests must belong to that tenant.
- The route handler verifies tenant ownership before returning data — a 403 with `LEAGUE_NOT_IN_TENANT`
  or `MANAGER_NOT_IN_TENANT` is returned if the IDs don't match.
- **Cross-tenant data never flows through a single request.** The intelligence assemblers are
  tenant-scoped at the port layer (they only load DB rows for the given leagueId/managerId).

### Commissioner vs Manager Scoping

- **Commissioner scope** (`intelligence:league:read`): the API key is typically held by the platform
  operator who manages the league, not by individual users. The caller queries by `leagueId`.
- **Manager scope** (`intelligence:manager:read`): same — the key is held by the platform operator.
  The caller queries by `managerId` + `leagueId`. The operator is responsible for ensuring their own
  users can only query their own `managerId` (the API trusts the operator's auth layer for this).
- AllFantasy does NOT provide end-user OAuth for v1. That is a v2 feature (Sign in with AllFantasy →
  manager-scoped JWT). In v1, the operator is always the API caller.

---

## Tier Permission Matrix

Tiers are named presets that map to scope sets (see `TIER_SCOPE_MAP` in `contracts.ts`).
A key can carry multiple scopes from different tiers simultaneously.

| Signal | basic | commissioner | manager | platform |
|--------|:-----:|:------------:|:-------:|:--------:|
| **Platform-level** | | | | |
| `platformEngagementScore` | ✅ | ✅ | – | ✅ |
| `platformEngagementTier` | ✅ | ✅ | – | ✅ |
| `leagueHealthSummary` (% only, no counts) | ✅ | ✅ | – | – |
| `leagueHealthDistribution` (full with counts) | ❌ | ❌ | – | ✅ |
| `commissionerQualityDistribution` | ❌ | ❌ | – | ✅ |
| `retentionDistribution` (manager + league) | ❌ | ❌ | – | ✅ |
| `tradeEcosystem` (tier only) | ✅ | ✅ | – | – |
| `tradeEcosystem` (rates + counts) | ❌ | ❌ | – | ✅ |
| `engagementTrends` (momentum + confidence) | ✅ | ✅ | – | ✅ |
| `engagementTrends` (counts + ratios) | ❌ | ❌ | – | ✅ |
| `activityHeatmap` | ❌ | ❌ | – | ✅ |
| `interventionOpportunities` | ❌ | ❌ | – | ✅ |
| `uncertainty` | ❌ | ❌ | – | ✅ |
| **League-level** | | | | |
| `leagueEngagementScore` + `tier` | ❌ | ✅ | – | ✅ |
| `participationDistribution` | ❌ | ✅ | – | ✅ |
| `tradeActivity` / `waiverActivity` / `draftActivity` | ❌ | ✅ | – | ✅ |
| `retentionRisk` (league) | ❌ | ✅ | – | ✅ |
| `commissionerWorkload` | ❌ | ✅ | – | ✅ |
| `recommendations[]` | ❌ | ✅ | – | ✅ |
| **Manager-level** | | | | |
| `participationTier` | – | ❌ | ✅ | ✅ |
| `retentionRisk` (manager) | – | ❌ | ✅ | ✅ |
| `retentionRiskReasons` | – | ❌ | ✅ | ✅ |
| `overallEngagementScore` | – | ❌ | ✅ | ✅ |
| `engagementDimensions` | – | ❌ | ✅ | ✅ |
| `daysSinceLastActivity` | – | ❌ | ✅ | ✅ |
| `nudges[]` | – | ❌ | ✅ | ✅ |

**Legend:** ✅ = included in response, ❌ = excluded from response, – = not applicable (wrong endpoint)

**Rationale for key exclusions:**
- `basic` tier excludes per-league counts to prevent revealing platform scale to competitors.
- `commissioner` tier excludes per-manager scores — per-manager data requires explicit `manager` scope,
  which the operator must separately license (privacy + pricing boundary).
- `platform` tier exposes everything because the caller is a platform operator who already has access
  to all league and manager data in their own system.

---

## Privacy and Anonymization Rules

### managerId handling

| Tier | managerId handling |
|------|--------------------|
| `basic` | `managerId` never appears — purely aggregate |
| `commissioner` | `managerId` never appears in League Intelligence response |
| `manager` | `managerId` is the caller's own ID (they provided it in the request); we echo it back as-is |
| `platform` | `managerId` in `interventionOpportunities` is the caller's own tenant-scoped ID |

**Key rule:** AllFantasy never exposes a `managerId` that the caller did not provide. We echo their
own identifiers back. The protection is that tenant isolation prevents seeing another tenant's IDs.

In v1, no raw internal DB IDs are ever exposed in API responses. The `managerId` in our system is
always the `platformUserId` supplied by the operator during league creation — it is their own value.

### Cross-tenant protection

The route handler (Phase 5.6) MUST:
1. Resolve the tenant from the API key before any DB query.
2. Pass the `tenantId` as a mandatory filter to every port query.
3. Return 403 `LEAGUE_NOT_IN_TENANT` if the requested `leagueId` does not belong to the tenant.
4. Return 403 `MANAGER_NOT_IN_TENANT` if the requested `managerId` does not belong to the tenant.
5. Never log `managerId` or `leagueId` in plaintext in telemetry — SHA-256 hash only.

### Aggregate-only rules for basic tier

The `basic` tier is designed to be embeddable in public dashboards or sold as a lightweight signal
to non-privileged consumers. Its contract MUST NOT contain:
- Any `leagueId`
- Any `managerId`
- Absolute event counts (only percentages/tiers)
- Absolute league counts (only `healthyPercent` / `atRiskPercent`)

This ensures a `basic`-tier response cannot be used to infer the number of leagues on the platform
or to correlate specific leagues with their engagement state.

### Intervention opportunity anonymization

`interventionOpportunities` in the `platform` tier contains `leagueId` and optionally `managerId`.
Both are the caller's own identifiers — they are not anonymized, since the operator already has
full access to their own data. However:
- The `message` field MUST contain no internal terminology (enforced at the intelligence layer).
- The `signal` field (machine-readable) is included; operators use it to route interventions in their
  own UIs without parsing natural-language messages.

### PII and GDPR considerations

- The Intelligence API does not store or return user PII (name, email, address).
- `managerId` is an opaque operator-assigned identifier — AllFantasy has no knowledge of the
  human behind it.
- AllFantasy is a data processor; the operator is the data controller for their managers' PII.
- DPA (Data Processing Agreement) is required for any tenant accessing `manager` or `platform` tier.
- The `basic` tier is aggregate-only and is exempt from DPA requirements.

---

## Rate Limits

Default limits by tier (overridable per API key):

| Tier | Default limit | Burst allowance | Window |
|------|:-------------:|:---------------:|:------:|
| `basic` | 1,000 req/hr | 50 req/min | rolling 1h |
| `commissioner` | 500 req/hr | 30 req/min | rolling 1h |
| `manager` | 500 req/hr | 30 req/min | rolling 1h |
| `platform` | 100 req/hr | 10 req/min | rolling 1h |

**Rate-limit response headers** on every request (see `IntelligenceRateLimitHeaders` in `contracts.ts`):
```
X-RateLimit-Limit: 500
X-RateLimit-Remaining: 487
X-RateLimit-Reset: 1751291400
```

On limit exceeded: HTTP 429 with `Retry-After: {seconds}` and `RATE_LIMIT_EXCEEDED` error body.

**Why `platform` is capped lower:** Platform Intelligence aggregates across all leagues and managers —
the assembler is more compute-intensive. In practice, platform consumers poll infrequently (once per
hour or on-demand after a significant event), so 100 req/hr is generous.

**Caching recommendation for callers:** Platform Intelligence is derived on demand. Callers should
cache the response (keyed by `derivedAt`) rather than polling. A `Cache-Control: max-age=900`
response header (15 minutes) will be set by the route handler to encourage client-side caching.

---

## Versioning Strategy

### URL versioning

All endpoints are prefixed with `/v1/`. Breaking changes require a new prefix (`/v2/`).

**What constitutes a breaking change:**
- Removing a field from a response type
- Changing the type of an existing field (e.g., `string` → `number`)
- Changing the semantics of an existing field (e.g., redefining what `completeness` measures)
- Adding a required request parameter
- Changing error codes that clients are expected to handle

**What is NOT a breaking change (additive — no version bump required):**
- Adding an optional field to a response type
- Adding a new optional request parameter
- Adding a new error code to an existing operation
- Adding a new endpoint under `/v1/`
- Tightening rate limits by ≤ 20% with 30-day notice

### Deprecation strategy

1. **Announce deprecation** — new version available, old version enters deprecation window.
2. **Set `Sunset` header** on deprecated endpoints for the full deprecation window:
   ```
   Sunset: Tue, 01 Jun 2027 00:00:00 GMT
   Link: <https://docs.allfantasy.com/intelligence-api/migration/v1-to-v2>; rel="deprecation"
   ```
3. **Minimum deprecation window:** 6 months from the date the new version is GA.
4. **Tenant notification:** registered webhook URL receives a `version.deprecated` event 90 days
   and again 30 days before the Sunset date.
5. **Sunset enforcement:** after the Sunset date, the old endpoint returns HTTP 410 Gone with
   `DEPRECATED_VERSION` error code and a `migrationUrl` in the error body.

### Type file versioning

The `api/contracts.ts` file uses `V1` suffixes on all external types. When v2 is introduced:
- A new `api/contracts-v2.ts` is created
- `contracts.ts` (v1) is frozen (no new fields after deprecation announced)
- The route handler selects contracts file based on the URL prefix

---

## Rollback Strategy

If Phase 5.6 routes malfunction after deployment:
1. The intelligence routes are **additive** — they do not modify any existing route.
2. Rolling back the deploy is the primary rollback mechanism (no DB migrations to reverse).
3. A feature flag `DECISION_OS_INTELLIGENCE_API_ENABLED` (default: `false`) gates all intelligence
   routes. Setting it to `false` returns HTTP 503 with `INTELLIGENCE_UNAVAILABLE` — clients should
   handle this gracefully.
4. Individual tier flags `DECISION_OS_INTELLIGENCE_TIER_PLATFORM_ENABLED` etc. allow disabling
   expensive tiers independently without disabling the whole API.

---

## Telemetry Requirements

The future route handler MUST emit an `IntelligenceApiTelemetryEvent` (see `contracts.ts`) on
every request — success and error. Key invariants:

1. **No PII in telemetry.** `tenantId`, `leagueId`, `managerId` are SHA-256 hashed before logging.
2. **Every event includes `requestId`** for cross-system correlation.
3. **`completeness` is always logged** — this is the primary signal for intelligence quality SLA.
4. **`latencyMs` is logged** — platform tier calls should alert if p95 > 2,000ms.
5. **Rate limit hits are logged as `rateLimitHit: true`** — used for capacity planning.
6. **Alert thresholds (to be configured in observability platform):**
   - `completeness < 50` on > 10% of requests in a 5-minute window → `intelligence_quality_degraded`
   - `latencyMs > 5000` → `intelligence_latency_critical`
   - `statusCode === 500` on > 1% of requests → `intelligence_error_rate_elevated`

---

## Widget Integration Notes (Future Phase 5.7+)

The widget layer is explicitly out of scope for Phase 5.5. These notes capture the design
constraints for the future phase.

### Embedding model

The AllFantasy Intelligence Widget will be a lightweight JavaScript snippet embeddable in third-party
sites:
```html
<script src="https://widgets.allfantasy.com/intelligence/v1.js"></script>
<af-league-health leagueId="..." apiKey="afk_live_..."></af-league-health>
```

**Key principle:** Widget API keys MUST be `basic` tier only. `commissioner`, `manager`, and
`platform` tier data must never flow through a browser-embeddable widget, because:
- Browser-embedded API keys are publicly inspectable.
- A `basic` key exposes only aggregate, non-PII signals.
- Commissioner/manager/platform data requires server-side-only key handling.

### Widget data flow

```
Browser                   Widget CDN               Intelligence API
  │                           │                           │
  ├─ <af-league-health>       │                           │
  ├──────────────────────────►│                           │
  │                           ├─ GET /v1/intelligence/    │
  │                           │   platform               │
  │                           │   X-AllFantasy-API-Key:  │
  │                           │   afk_live_basic_...      │
  │                           ├──────────────────────────►│
  │                           │◄──────────────────────────┤
  │◄──────────────────────────┤                           │
  │ (rendered widget)         │                           │
```

The Widget CDN acts as a reverse proxy — it holds the `basic`-tier API key server-side and proxies
the aggregate response to the browser. The browser never sees the API key.

### Widget contract guarantee

The widget layer imports from `api/contracts.ts`. The contract guarantee is:
- Widget displays `PlatformIntelligenceBasicV1` fields only.
- Widget MUST NOT display `leagueId` or `managerId`.
- Widget MUST display `completeness` or a derived quality indicator to signal data freshness.
- Widget is a read-only rendering layer — no user inputs flow back through the Intelligence API.

---

## SDK Integration Notes (Future Phase 5.8+)

An official TypeScript SDK will wrap `api/contracts.ts` types and provide:
- Typed request builders
- Response envelope unwrapping (consumer sees `data: T` directly)
- Retry logic with exponential backoff on 429 / 503
- Client-side caching with TTL aligned to `Cache-Control` response header

The SDK will be published as `@allfantasy/intelligence` on npm. The `api/contracts.ts` file in
this repo is the source of truth for the SDK's type definitions — the SDK will re-export them
without modification.

**SDK users import only from the SDK package — never from internal Decision OS modules.**
This is enforced by publishing the SDK as a separate package, not by monorepo conventions.

---

## Consequences

### Positive

- Internal intelligence types can evolve freely without breaking external consumers.
- Tier gating is enforced at a single adapter layer (Phase 5.6), not scattered across assemblers.
- Privacy rules are explicit and auditable in one file (`api/contracts.ts`).
- The `basic` tier creates a low-friction entry point for widget embedding and light integrations.
- Versioning and deprecation are governed by clear rules — no ad-hoc breaking changes.
- The widget and SDK have clear integration constraints before they're built.

### Accepted limitations

- v1 does not support end-user OAuth (manager querying their own data) — operator-held keys only.
  This is acceptable for Phase 5.5; it is a well-scoped v2 feature.
- No batch endpoints in v1. Operators needing "all managers in a league" must call the manager
  endpoint N times. Acceptable for early adopters; v2 will address based on observed usage.
- Platform Intelligence is computed on-demand (no pre-computed snapshots). Callers are advised to
  cache responses. A time-series snapshot store is a Phase 6 feature.
- The `activityHeatmap` is UTC-only. Operators displaying local peak hours must apply TZ offset
  themselves. Documented in the type comments; no v1 fix planned.

### Not changed

- `ManagerBehavioralIntelligence`, `LeagueBehavioralIntelligence`, `PlatformBehavioralIntelligence` (Phase 5.2/5.3/5.4)
- All Stage 1 soak slices
- All existing production routes
- No port, mapper, assembler, or shadow path modified

---

## References

- `lib/decision-os/behavioral/api/contracts.ts` — External type contracts (this phase)
- `lib/decision-os/behavioral/platform-intelligence.ts` — Phase 5.4 internal types
- `lib/decision-os/behavioral/league-intelligence.ts` — Phase 5.3 internal types
- `lib/decision-os/behavioral/manager-intelligence.ts` — Phase 5.2 internal types
- `lib/decision-os/ARCHITECTURE_FREEZE.md` — governance invariants
- `ADR_F5_4_PLATFORM_BEHAVIORAL_INTELLIGENCE.md` — upstream dependency
- `ADR_F5_3_LEAGUE_BEHAVIORAL_INTELLIGENCE.md` — upstream dependency
- `ADR_F5_2_MANAGER_BEHAVIORAL_INTELLIGENCE.md` — upstream dependency
