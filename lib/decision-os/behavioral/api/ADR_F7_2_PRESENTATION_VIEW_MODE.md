# ADR — Phase 7.2: Intelligence API Presentation View Mode

**Status:** Accepted  
**Date:** 2026-07-01  
**Ticket:** Phase 7.2 — Intelligence API Presentation Responses  
**Depends on:** ADR_F5_7_INTELLIGENCE_API_ROUTES.md, ADR_F5_5_INTELLIGENCE_API_BOUNDARY.md, PHASE_7_0_INTELLIGENCE_PRESENTATION_MODEL_ADR.md

---

## Context

Phase 5.7 established three Intelligence API routes (`/api/v1/intelligence/league`, `/manager`, `/platform`).  
Phase 7.0 built the Intelligence Presentation Model (IPM) — a deterministic, provider-agnostic layer
that maps raw behavioral intelligence to display-ready contracts: cards, metrics, badges, recommendations,
and severity tokens.

Today the API returns raw v1 intelligence contracts (curated from internal behavioral intelligence).
Widget consumers, white-label SDK callers, and dashboard builders must re-implement presentation logic
on top of these raw contracts. Phase 7.2 adds an optional `view=presentation` response mode that returns
fully assembled IPM shapes — eliminating the re-implementation burden on callers and proving the hosted
API can serve the widget platform directly.

---

## Decision

### Query Parameter

```
?view=presentation   → IPM LeagueApiPresentation / ManagerApiPresentation / PlatformApiPresentation
?view=raw            → identical to default (no view param); kept for forward-compatibility
(no view param)      → raw v1 contract, unchanged (full backward compatibility)
```

### Invalid view values

Unknown `view` values (anything other than `presentation` or `raw`) are rejected with:
```json
{ "code": "INVALID_REQUEST", "message": "Unknown view parameter value. Use 'presentation' or 'raw'.", "requestId": "..." }
```

**Rationale:** Silent fallback would mask client typos. Explicit 400 forces callers to fix their request
and makes the API surface self-documenting.

### Response envelope for `view=presentation`

Extends the existing `IntelligenceApiMeta` with `presentationVersion` and `view` discriminant:

```typescript
{
  data: LeagueApiPresentation,  // or ManagerApiPresentation / PlatformApiPresentation
  meta: {
    requestId: string,
    derivedAt: string,
    completeness: number,
    version: 'v1',
    tier: IntelligenceTier,
    view: 'presentation',
    presentationVersion: '7.0.0',
  }
}
```

The `presentationVersion` stamp lets consumers detect IPM evolution without breaking on version bumps.

### Adapter layer

A new `presentation-adapters.ts` file bridges `*BehavioralIntelligence` internal types to
`build*ApiPresentation()` calls. This keeps:
- `intelligence-handlers.ts` — thin, delegates to adapters
- `presentation-adapters.ts` — pure bridge functions (testable in isolation)
- `presentation/api-presentation.ts` — unchanged IPM builders

Fields absent in raw behavioral intelligence (archetype, benchmark) are modelled as `null` with honest
completeness propagation. These will be non-null when Phase 6 enrichment is wired into the data provider.

---

## Architecture Constraints (all preserved)

| Constraint | How this ADR satisfies it |
|-----------|--------------------------|
| No internal field leakage | `presentation-adapters.ts` applies the same STRIPS discipline as resolvers.ts |
| No Route business logic | Handlers call adapters; adapters call IPM builders |
| Backward compatibility | Default behavior (no `view` param) is completely unchanged |
| Architecture Freeze | No changes to any existing Phase 5.5–5.9 or Phase 7.0 files |
| No Stage 1 soak changes | Presentation view mode is additive; soak env vars untouched |
| No UI code in API | IPM ColorToken / SeverityToken are semantic; no CSS/Tailwind in adapters |
| Tier permissions preserved | `view` param is post-auth; same scope checks apply before either path |
| Deterministic | `presentation-adapters.ts` is a pure function; same input → same output |

---

## Files Changed

| File | Change |
|------|--------|
| `behavioral/api/presentation-adapters.ts` | NEW — pure bridge functions |
| `behavioral/api/intelligence-handlers.ts` | EXTENDED — `view` param parsed, presentation path added |
| `behavioral/api/ADR_F7_2_PRESENTATION_VIEW_MODE.md` | NEW — this document |

### Not changed

- `app/api/v1/intelligence/league/route.ts` — route files remain thin wrappers, unchanged
- `app/api/v1/intelligence/manager/route.ts` — unchanged
- `app/api/v1/intelligence/platform/route.ts` — unchanged
- `behavioral/api/contracts.ts` — external contract types unchanged; one optional extension type added to `intelligence-handlers.ts`
- `behavioral/api/resolvers.ts` — unchanged
- All Phase 5.5–5.9, Phase 7.0 presentation files — frozen

---

## Rejected Alternatives

### Option A: Separate `?format=ipm` parameter

Synonymous with `view` but less expressive for future expansion (a `view=summary` or `view=compact` mode
would read naturally; `format=summary` would not). `view` is the conventional REST pattern.

### Option B: Separate endpoint `/api/v1/intelligence/league/presentation`

Duplicates the auth/scope/provider infrastructure needlessly. A single endpoint with a negotiation
parameter is the standard pattern (analogous to `Accept:` header content negotiation).

### Option C: Merge presentation into the default response

Would break every existing caller that parses `data.leagueEngagementScore` etc. Unacceptable for a
production API even in a pre-GA state — backward compatibility is a hard constraint.

### Option D: Silent fallback on unknown `view` values

Hidden typo behaviour makes debugging harder. Explicit 400 is consistent with the existing `INVALID_REQUEST`
pattern used for missing required params.

---

## Test Coverage

`__tests__/decision-os/phase7/intelligence-api-presentation.test.ts`

- Default raw contract unchanged (no view param)
- `view=raw` equals default
- `view=presentation` returns `LeagueApiPresentation` / `ManagerApiPresentation` / `PlatformApiPresentation`
- `view=presentation` meta includes `view: 'presentation'` and `presentationVersion`
- Unknown `view` values return 400 INVALID_REQUEST
- Tier permissions enforced before view parsing (403 precedes `view=presentation` path)
- Stub data provider → 503 regardless of view param
- No internal field leakage in presentation response
- No frontend-specific code (no CSS class strings) in adapter output
- Presentation version stamp present on all IPM shapes
