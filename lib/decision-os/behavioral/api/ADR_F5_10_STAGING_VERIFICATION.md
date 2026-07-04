# ADR F5.10 — Intelligence API Staging Verification

**Status:** COMPLETE  
**Date:** 2026-06-30  
**Phase:** 5.10 (follows Phase 5.9 real provider opt-in)

---

## Context

Phases 5.8 and 5.9 delivered a real read-only data provider (`realDataProvider`) wired behind the
`DECISION_OS_INTELLIGENCE_API_PROVIDER=real` env gate. Phase 5.10 verifies the full pipeline
end-to-end against the staging Neon database (`ep-winter-salad`) before any production cut-over.

**Constraints carried forward:**
- Prod DB host `ep-curly-block` — HARD-REFUSED; never connect
- Stage 1 soak (`DECISION_OS_COMMISSIONER_HEALTH_LIVE=true`) must not be disrupted
- Architecture Freeze preserved — no redesign, additive enrichment only
- No writes to any database table

---

## Verification Approach

### Why in-process (not HTTP)?

The project uses Vercel Preview deployments for staging. At the time of this verification:
- Vercel CLI is not installed on the development machine
- Railway MCP is not authenticated
- No deployed preview URL is available for the current branch

**Decision:** Run the handler functions directly (in-process) against the staging Neon DB, using the
same code path a real HTTP request would execute. This tests every layer:

```
[smoke script] → handler (gate + scope + param check) → real provider
              → port (Prisma/staging DB) → mappers → assembler → deriver
              → resolver (privacy filter) → IntelligenceApiResponse
```

The HTTP route files (`app/api/v1/intelligence/*/route.ts`) are thin Next.js wrappers with zero
business logic — they are not the subject of this verification. Their correctness is guaranteed by
Phase 5.9 tests.

### Staging data inventory (2026-06-30)

Queried from `br-weathered-credit-addbjdlc` (staging branch):

| Table | Count | Notes |
|---|---|---|
| `leagues` | ≥10 | Includes imported Sleeper league + seeded test leagues |
| `waiver_claims` | 3 | All in `s3b-nfl-faab`, userId=`s3b-member-user` |
| `af_league_trades` | 0 | No native trades seeded yet |
| `af_roster_move_history` | (not queried) | Presumed sparse |
| `draft_sessions` | 39 | Multiple leagues have draft data |
| `draft_picks` | (linked to sessions) | No userId — maps to rosterId only |

**Expected outcome:** sparse data → degraded-safe intelligence (low completeness, valid shapes).

### Known leagues used in checks

| Alias | League ID | Description |
|---|---|---|
| `LEAGUE_WITH_EVENTS` | `s3b-nfl-faab` | Has 3 waiver claims, managerId `s3b-member-user` |
| `LEAGUE_WITH_DRAFT` | `9d0a700c-...` | TheCiege26 8-Team NFL Redraft (draft session exists) |
| `LEAGUE_SLEEPER` | `50d5c56d-...` | KBI Smoke Black (imported Sleeper, 0 native events) |
| `LEAGUE_UNKNOWN` | `intel-smoke-nonexistent-league-id` | Guarantees degraded path |

---

## Env Vars Required for Verification

Add to `.env.staging` (or set in shell before running):

```bash
# ── Intelligence API ─────────────────────────────────────────────────────────
DECISION_OS_INTELLIGENCE_API_ENABLED=true
DECISION_OS_INTELLIGENCE_API_PROVIDER=real

# Test API keys for each tier (commissioner / manager / platform)
INTELLIGENCE_API_TEST_KEYS={"afk_test_commissionersmoke01":"commissioner","afk_test_managersmokekeyv001":"manager","afk_test_platformsmokekeyv01":"platform"}

# Lookback (365d covers all staging seed data)
INTELLIGENCE_LOOKBACK_DAYS=365

# Platform cap (small number for staging)
INTELLIGENCE_PLATFORM_MAX_LEAGUES=5
```

Key format rules (from gate.ts):
- Pattern: `afk_{test|live}_{token}` where token is ≥16 alphanum characters
- `test` env + key **not in map** → defaults to `'basic'` tier (dev-mode safe)
- `test` env + key **in map** → uses mapped tier
- `live` env + key **not in map** → 401 UNAUTHORIZED (live keys must be pre-registered)

---

## Verification Script

```
DATABASE_URL=<staging-neon-url> npx tsx scripts/decision-os-intelligence-api-smoke.ts
```

Script: `scripts/decision-os-intelligence-api-smoke.ts`

The script hard-refuses to run if `DATABASE_URL` contains `ep-curly-block` (production).

### Check groups (48 assertions total)

| # | Group | Description |
|---|---|---|
| 1 | Gate enforcement | 503 when flag off, 401 no key, 401 bad format |
| 2 | Tier scope | basic→/platform ✓, basic→/league 403, basic→/manager 403; commissioner/manager/platform scopes |
| 3 | Param validation | /league missing leagueId→400, /manager missing managerId→400, missing both→400 |
| 4 | Real data | Known league/manager → 200 non-null; score/completeness in [0,100]; IDs echoed back |
| 5 | Degraded path | Unknown leagueId → 200 with completeness=0 (not 503) |
| 6 | No internal leakage | `warnings`, `derivedFrom`, `lookbackDays`, `provenance`, `activeManagerIds`, etc. absent |
| 7 | Response envelope | `data` + `meta` present; meta has requestId, version=v1, tier, completeness, derivedAt |

---

## Tier Scope Matrix (verified)

| Tier | /platform | /league | /manager | Platform shape |
|---|---|---|---|---|
| `basic` | 200 ✓ | 403 | 403 | basic |
| `commissioner` | 200 ✓ | 200 ✓ | 403 | basic |
| `manager` | 200 ✓ | 403 | 200 ✓ | basic |
| `platform` | 200 ✓ | 200 ✓ | 200 ✓ | **full** |

---

## Architecture Freeze compliance

All components exercised are frozen (Phase 2 enrichment complete, all 4 slices validated):

| Component | Role | Status |
|---|---|---|
| Phase 5.1 port (`port.ts`) | DB reads — read-only, MAX_ROWS=500 | Frozen ✓ |
| Phase 5.1 mappers (`mappers.ts`) | Pure row→event conversion | Frozen ✓ |
| Phase 5.1 assembler (`assemble.ts`) | Events→facts | Frozen ✓ |
| Phase 5.2 `deriveManagerBehavioralIntelligence` | Manager intelligence | Frozen ✓ |
| Phase 5.3 `deriveLeagueBehavioralIntelligence` | League intelligence | Frozen ✓ |
| Phase 5.4 `derivePlatformBehavioralIntelligence` | Platform intelligence | Frozen ✓ |
| Phase 5.6 resolvers (`resolvers.ts`) | Privacy filter / external contracts | Frozen ✓ |
| Phase 5.7 handler cores (`intelligence-handlers.ts`) | Gate + scope + handler | Frozen ✓ |
| Phase 5.8 `realDataProvider` | Real pipeline impl | Frozen ✓ |
| Phase 5.9 `resolveDataProvider()` | Env-gated selector | Frozen ✓ |

No mutations in any component. All port functions are `findMany`/`findFirst` SELECT only.

---

## HTTP Smoke (deferred — requires deployed server)

When a deployed preview or production URL is available, run the equivalent HTTP smoke:

```bash
BASE_URL=https://<preview>.vercel.app
API_KEY=afk_test_platformsmokekeyv01

# Platform (all tiers)
curl -s -H "X-AllFantasy-API-Key: $API_KEY" $BASE_URL/api/v1/intelligence/platform | jq .

# League (commissioner+ tiers)
curl -s -H "X-AllFantasy-API-Key: $API_KEY" \
  "$BASE_URL/api/v1/intelligence/league?leagueId=s3b-nfl-faab" | jq .

# Manager (manager+ tiers)
curl -s -H "X-AllFantasy-API-Key: $API_KEY" \
  "$BASE_URL/api/v1/intelligence/manager?leagueId=s3b-nfl-faab&managerId=s3b-member-user" | jq .

# Auth enforcement
curl -s $BASE_URL/api/v1/intelligence/platform | jq .  # → 401
```

Env vars to set on the deployed instance:
```
DECISION_OS_INTELLIGENCE_API_ENABLED=true
DECISION_OS_INTELLIGENCE_API_PROVIDER=real
INTELLIGENCE_API_TEST_KEYS={"afk_test_platformsmokekeyv01":"platform","afk_test_commissionersmoke01":"commissioner"}
INTELLIGENCE_LOOKBACK_DAYS=365
INTELLIGENCE_PLATFORM_MAX_LEAGUES=5
```

---

## Limitations Documented

1. **Silent managers** — managers with zero events in the lookback window are not surfaced by the real
   provider (events-derived managerIds, per ADR F5.8). This is intentional and documented.

2. **Draft pick managerId** — `draft_picks.rosterId` is not joined to userId in the behavioral event
   port. Draft events carry `pickedByRosterId` only. A future phase may enrich this via
   `league_teams.claimedByUserId`. Currently, draft events contribute to league-level stats but not
   per-manager stats.

3. **No af_league_trades on staging** — `af_league_trades` has 0 rows. Trade dimension scores will
   always be 0 / 'none' tier on staging. Not a code defect — a data gap.

4. **HTTP-level verification deferred** — Next.js route wrappers, CORS, and HTTP headers are not
   tested in this in-process check. The route files have zero business logic (Phase 5.9 tests
   verified this via import-level assertions). Full HTTP smoke requires a deployed preview.
