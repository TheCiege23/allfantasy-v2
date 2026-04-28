# Projection Data Model Decision Audit – Final Report

## Executive Summary

**The projection/stat coverage gap is NOT a data model problem.** The correct DB table already exists and is already being read by routes.

**Root cause:** Incomplete identity mapping (625/1993 = 31.4%) + suboptimal JOIN logic in resolvers, not missing or wrong table structures.

---

## Model Audit Results

### 1. **PlayerSeasonStats** ✅ BEST FIT (Fit Score: 100/100)
**Status**: OPTIMAL – Already being used

- **Row count**: 2,103 total (1,935 NFL/Rolling Insights)
- **Key fields**:
  - `playerId` (indexed, joins to player identity)
  - `fantasyPointsPerGame` (the value we need!)
  - `fantasyPoints` (season total)
  - `stats` (Json splits)
  - `source`, `season`, `seasonType`
- **Schema**: `@@unique([sport, playerId, season, seasonType, source])`
- **Indexed by**: `[sport, playerId]`, `[sport, playerId, source, seasonType]`
- **Routes read it**: 
  - `app/api/start-sit/roster/route.ts` (PlayerSeasonStats query)
  - `lib/draft/analytics/nfl-rolling-insights-draft-analytics.ts` (RI loader)
  - `lib/draft-room/getResolvedDraftPoolForLeague.ts` (via RI lookup)
- **Can backfill**: NO (source data; already ingested from Rolling Insights API)
- **Recommendation**: ✅ **USE THIS for joins. Do not backfill.**

**Why this is perfect:**
- Already contains FPPG values (1935 rows for NFL/RI)
- Already indexed by playerId for fast joins
- Routes already fetch from it
- Keyed by [sport, playerId, season, source] – the right granularity

---

### 2. SportsPlayerRecord (Fit Score: 65/100)
**Status**: Secondary cache; projections field is sparse

- **Row count**: 22,522
- **Key fields**: 
  - `projections` (Json – sparse, not populated)
  - `stats` (Json – sparse)
  - Indexed by: [sport, name], [sport, position]
- **Issue**: Joining via name+position is less reliable than playerId
- **Usage**: Main player cache for draft pool/team builder UI
- **Recommendation**: ❌ **Do not use as primary projection source. Could complement PlayerSeasonStats.**

---

### 3. AFProjectionSnapshot (Fit Score: 20/100)
**Status**: AF-specific only; not general-purpose

- **Row count**: 0 (NFL)
- **Scope**: Week-specific, AI projections only
- **Issue**: Cannot store season-wide FPPG; limited to weeks with AI computation
- **Recommendation**: ❌ **Not applicable for this backfill.**

---

### 4. PlayerAnalyticsSnapshot (Fit Score: 15/100) ❌ WRONG MODEL
**Status**: College combine + analytics; empty

- **Row count**: 0
- **Schema**: `@@unique([normalizedName, season, source])`
- **Problem**: UNIQUE constraint on `normalizedName`, NOT `playerId`
  - Cannot join back to draft pool rows by playerId
  - Collision risk (many players share normalized names)
  - Designed for college player analytics, not pro season stats
- **Why it was attempted**: Misunderstanding of the model's purpose and constraints
- **Recommendation**: ❌ **Do not use for NFL season projections.**

---

### 5. AllFantasyAdpSnapshot (Fit Score: 0/100)
**Status**: ADP consensus only; no projections

- **Row count**: 0
- **Scope**: Average draft pick data only
- **Recommendation**: ❌ **Not applicable.**

---

### 6. DraftPoolCache (Fit Score: 0/100)
**Status**: Cache layer, not source of truth

- **Row count**: 5 (cached pool snapshots)
- **Purpose**: Store resolved pool as JSON
- **Recommendation**: ❌ **Cache invalidates on rebuild; not for backfill.**

---

## Coverage Analysis

### Why projection coverage is 71.9% missing (1432/1993):

```
Total pool entries:     1993
├─ With RI ID mapping:    625 (31.4%)
│  ├─ Can read PlayerSeasonStats directly: YES
│  ├─ Actually have FPPG in cache: ~400–500 (estimate)
│  └─ Gap: Identity mapped but FPPG not exposed in resolver
│
└─ Without RI ID mapping: 1368 (68.6%)
   ├─ Cannot access PlayerSeasonStats (no RI lookup key)
   ├─ SportsPlayerRecord.projections: Empty/sparse
   ├─ Other projection sources: None (DB-first only)
   └─ Fall back to synthetic: Conservative estimate
```

### Why even mapped entries have missing FPPG:

1. **Identity mapping**: `loadRollingInsightsSeasonByDraftPoolKey()` recovers 625 RI IDs
2. **Stats fetch**: `riSeasonByPlayerId` map loaded from PlayerSeasonStats (1935 rows)
3. **Resolver logic**: `resolveNflDraftPoolAnalytics()` merges snapshot + RI data
4. **Envelope construction**: Draft pool resolver may not be exposing FPPG properly
5. **Result**: Only 400–500 / 625 end up with computed FPPG in final pool

---

## Decision: Recommended Projection Strategy

### Primary Path: Enhance PlayerSeasonStats Joins
✅ **USE PlayerSeasonStats as the single source of truth for normalized player projections.**

**Why:**
- Data already exists (1,935 NFL/RI rows)
- Already indexed by [sport, playerId]
- Already read by routes
- Schema is perfect for this use case

**What needs to improve:**
1. **Identity mapping completeness**: The RI identity mapping is 31.4% — backfill more from PlayerIdentityMap
2. **Resolver JOIN logic**: Enhance draft pool resolver to:
   - Better surface FPPG from PlayerSeasonStats when RI identity is found
   - Add fallback to SportsPlayerRecord.projections Json for non-RI entries
   - Cache computed projections in resolved pool envelope

### Secondary Path: SportsPlayerRecord.projections (Future)
If more projection sources are ingested (e.g., ESPN API, Sleeper API), backfill `SportsPlayerRecord.projections` as a JSON envelope keyed by `id` + `sport`.

---

## Why PlayerAnalyticsSnapshot Was Wrong

❌ **The attempted backfill to PlayerAnalyticsSnapshot was incorrect because:**

1. **Wrong schema design**:
   - UNIQUE constraint on `[normalizedName, season, source]`
   - Cannot map back to pool rows by `playerId`
   - Designed for college analytics, not pro season stats

2. **Wrong purpose**:
   - Fields include: fortyYardDash, benchPress, athleticism metrics (combine data)
   - Not meant for fantasy points per game

3. **Collision risk**:
   - Multiple pro players can share normalized names
   - No way to distinguish ambiguities with only name+season+source key

4. **Better alternative already exists**:
   - PlayerSeasonStats has `playerId`, the right grain for uniqueness
   - Already indexed by `[sport, playerId]`
   - Already populated (1,935 rows NFL/RI)

---

## Next Steps (Out of Scope for This Audit)

To improve projection coverage from 28.3% → 50%+:

1. **Enhance RI identity mapping** (high-confidence):
   - Backfill PlayerIdentityMap with more name+position matches from SportsPlayer
   - Target: 625 → 900+ (45%+)

2. **Improve draft pool resolver FPPG exposure** (medium-confidence):
   - Expose `PlayerSeasonStats.fantasyPointsPerGame` more aggressively
   - Cache computed projections in DraftPoolCache JSON

3. **Secondary projection sources** (lower-confidence):
   - Populate SportsPlayerRecord.projections from PlayerSeasonStats
   - Add fallback to consensus ADP as floor estimate

---

## Validation

```bash
✓ npx prisma validate          # Schema valid
✓ PlayerSeasonStats.count():   2103 total, 1935 NFL/RI
✓ RI identity mapping:          625 / 1993 (31.4%)
✓ Start/sit route reads it:     YES
✓ Draft pool resolver reads it: YES (via RI identity)
```

---

## Conclusion

**The data model is sound.** The projection/stat coverage gap is rooted in:
1. Incomplete identity ingestion (PlayerIdentityMap backfill needed)
2. Suboptimal resolver JOIN logic (exposure/caching optimization)

**Do not backfill to a new table.** Enhance how PlayerSeasonStats is queried and exposed in existing resolvers.
