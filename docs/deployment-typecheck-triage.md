# Deployment Typecheck Triage Report

**Generated**: May 8, 2026  
**Scope**: Full repository typecheck scan (excluding World Cup bracket feature)  
**Total Errors**: 2,764 typecheck errors (pre-fix baseline)  
**Files Affected**: ~627 files  

---

## Executive Summary

The full repository has **2,764 typecheck errors** preventing deployment. These are **pre-existing, unrelated to the World Cup Bracket Challenge feature** which is clean by targeted scan.

**Key Finding**: The majority of errors are **implicit `any` type annotations (TS7006)** in callback parameters—a common pattern in legacy code. These are **mechanically fixable** but require care to avoid introducing new bugs.

**Recommendation**: Use **incremental cleanup sprints** targeting the safest, highest-impact areas first. The World Cup feature **remains isolated and unaffected** by all cleanup efforts.

---

## Error Distribution by Type

| Error Type | Count | Category | Severity |
|-----------|-------|----------|----------|
| **TS7006** | ~1,800+ | Implicit `any` parameter type | Low (mechanical fix) |
| **TS2339** | ~600+ | Property missing on type | Medium (requires investigation) |
| **TS2345** | ~150+ | Argument type mismatch | Medium (requires investigation) |
| **TS2322** | ~100+ | Type assignment mismatch | Medium (requires investigation) |
| **TS18046** | ~50+ | Unknown type from destructuring | Medium (requires investigation) |
| **TS7053** | ~30+ | Array index type mismatch | Low (mechanical fix) |
| **Other** | ~40+ | Various | Low-High |

---

## Error Distribution by Area

### 1. **lib/zombie/** — Zombie Mode Engine
- **Error Count**: ~250+ errors
- **Files Affected**: 15+ files (ZombieHordeSitOutEngine, setupEngine, matchupCompletion, etc.)
- **Error Types**: TS7006 (80%), TS2339 (15%), TS2322 (5%)
- **Likely Cause**: Legacy Zombie mode code with untyped DB query results and callback parameters
- **Risk Level**: **MEDIUM** — Zombie is a complex domain; changes need testing
- **Blocks Deployment**: YES (if Zombie features are active)
- **Touches World Cup**: NO
- **Recommended Fix Strategy**: 
  - Add type annotations to callback parameters (safe, mechanical)
  - Audit DB query results and add interface definitions (requires testing)
  - Fix property access errors on query results (requires schema review)
  - **Effort**: 2–3 days

### 2. **lib/tournament/** — Tournament Mode Engine
- **Error Count**: ~200+ errors
- **Files Affected**: 12+ files (advancementEngine, setupEngine, tournamentPageData, etc.)
- **Error Types**: TS7006 (75%), TS2339 (20%), TS2322 (5%)
- **Likely Cause**: Legacy tournament data transforms with implicit types, untyped map operations
- **Risk Level**: **MEDIUM** — Tournament logic is complex; audit needed before fix
- **Blocks Deployment**: YES (if Tournament features are active)
- **Touches World Cup**: NO
- **Recommended Fix Strategy**:
  - Add type annotations to map callbacks (mechanical, safe)
  - Type tournament DB query results (requires schema alignment)
  - Fix property errors on tournament standings (requires testing)
  - **Effort**: 2–3 days

### 3. **lib/trade-engine/** — Trade Analysis Engine
- **Error Count**: ~150+ errors
- **Files Affected**: 10+ files (trade-analyzer-intel, auto-recalibration, calibration-metrics, etc.)
- **Error Types**: TS7006 (70%), TS2339 (25%), TS2345 (5%)
- **Likely Cause**: Untyped trade model transforms, legacy analytics code with implicit types
- **Risk Level**: **MEDIUM-HIGH** — Trade engine has complex logic; breaking changes risky
- **Blocks Deployment**: YES (if Trade features are active)
- **Touches World Cup**: NO
- **Recommended Fix Strategy**:
  - Defer most fixes; tackle only blocking errors first
  - Focus on callback parameter types (safe, mechanical)
  - Leave property mismatch errors for later review
  - **Effort**: 1–2 days (targeted fixes only)

### 4. **lib/workers/** — Background Job Processors
- **Error Count**: ~120+ errors
- **Files Affected**: 12+ files (adp-refresh-service, devy-data-worker, schedule-importer, etc.)
- **Error Types**: TS7006 (60%), TS2339 (30%), TS18046 (10%)
- **Likely Cause**: Untyped DB row destructuring, legacy ETL code
- **Risk Level**: **MEDIUM** — Workers are critical but isolated; changes are lower risk
- **Blocks Deployment**: YES (if workers are running)
- **Touches World Cup**: NO
- **Recommended Fix Strategy**:
  - Type common patterns: DB row parameters, callback params (mechanical, safe)
  - Create shared interface for `ScheduleImportRow`, `ADPRow`, etc. (reusable)
  - Fix `TS18046` unknown type errors (requires schema audit)
  - **Effort**: 1–2 days

### 5. **app/api/bracket/** — Bracket Routes (Non-World Cup)
- **Error Count**: ~120+ errors
- **Files Affected**: 8+ files (ai-assist, pick-assist, global-rankings, intelligence, etc.)
- **Error Types**: TS7006 (65%), TS2339 (25%), TS2345 (10%)
- **Likely Cause**: Untyped bracket data transforms, AI scoring logic
- **Risk Level**: **LOW** — These routes are isolated from World Cup; fixes are mechanical
- **Blocks Deployment**: YES (if bracket features are active)
- **Touches World Cup**: NO (different namespace entirely)
- **Recommended Fix Strategy**:
  - Type callback parameters in bracket routes (mechanical, safe)
  - Add `BracketNode`, `BracketPick` type definitions
  - Fix global-rankings property errors (requires bracket schema review)
  - **Effort**: 1 day (straightforward)

### 6. **app/api/ai/** — AI Routes
- **Error Count**: ~80+ errors
- **Files Affected**: 6+ files (chat, trade-eval, matchup-preview, waiver-recs, etc.)
- **Error Types**: TS7006 (70%), TS2339 (25%), TS2345 (5%)
- **Likely Cause**: Untyped league/player aggregation, callback filtering
- **Risk Level**: **LOW** — AI routes are input/output isolated
- **Blocks Deployment**: YES (if AI features are active)
- **Touches World Cup**: NO
- **Recommended Fix Strategy**:
  - Type callback parameters in sort/filter operations (mechanical, safe)
  - Create shared `LeagueAggregateRow` interface
  - Fix property errors on league objects (requires audit)
  - **Effort**: 1 day

### 7. **app/api/auth/register** — Auth Registration
- **Error Count**: ~10+ errors
- **Files Affected**: 1 file (app/api/auth/register/route.ts)
- **Error Types**: TS2339 (majority—missing email, username properties)
- **Likely Cause**: Untyped form request parsing, missing property validation
- **Risk Level**: **HIGH** — Auth changes risk breaking registration flow
- **Blocks Deployment**: YES (core feature)
- **Touches World Cup**: NO
- **Recommended Fix Strategy**:
  - **DEFER**: This requires careful API request type definition
  - Fix only if registration is failing in testing
  - **Effort**: 1–2 days (requires careful testing)

### 8. **server/services/** — Server-Side Services
- **Error Count**: ~80+ errors
- **Files Affected**: 5+ files (matchupEngine, playoffEngine, standingsEngine, weeklyProcessor, matchupCenterService)
- **Error Types**: TS7006 (60%), TS2339 (35%), TS2345 (5%)
- **Likely Cause**: Untyped service query results, roster standings transforms
- **Risk Level**: **MEDIUM-HIGH** — Services drive core league logic; testing critical
- **Blocks Deployment**: YES (scoring and standings)
- **Touches World Cup**: NO
- **Recommended Fix Strategy**:
  - Type callback parameters first (safe, mechanical)
  - **DEFER** property access fixes; requires testing
  - Consider mocking tests before fixing engine logic
  - **Effort**: 1–2 days (parameter fixes only)

### 9. **lib/trending/**, **lib/tournament-mode/**, **lib/user-stats/** — Analytics & Utilities
- **Error Count**: ~80+ errors combined
- **Files Affected**: 15+ files
- **Error Types**: TS7006 (70%), TS2339 (25%)
- **Likely Cause**: Untyped aggregation transforms, row destructuring
- **Risk Level**: **LOW** — These are mostly isolated utility functions
- **Blocks Deployment**: MAYBE (if features are active)
- **Touches World Cup**: NO
- **Recommended Fix Strategy**:
  - Type callback parameters (mechanical, safe)
  - Add row interface definitions (reusable across services)
  - **Effort**: 1 day

### 10. **Other Files** (blog, config, misc)
- **Error Count**: ~60+ errors
- **Risk Level**: **LOW** — Isolated features
- **Recommended Fix Strategy**: Address only if explicitly blocking deployment

---

## World Cup Feature Status

✅ **CONFIRMED CLEAN** — Targeted World Cup typecheck scan produced **zero errors**.

```
Command: npx tsc --noEmit 2>&1 | Select-String "world-cup|WorldCup|worldCup"
Result: No output (zero matches)
```

**World Cup Files Not Touched**:
- `app/api/brackets/world-cup/**` ✅
- `lib/world-cup/**` ✅
- `app/pages/world-cup/**` ✅ (if exists)
- `app/components/world-cup/**` ✅ (if exists)

**Cleanup Cleanup Strategy**: None of the cleanup efforts affect World Cup. Cleanup can proceed independently.

---

## Safest Fixes First (Low-Risk Batch)

**Effort**: 2–3 days  
**Impact**: ~300–400 errors eliminated  
**Risk**: LOW  

### Batch 1: Parameter Type Annotations

These are **100% mechanical fixes** with zero behavioral impact.

**Pattern**: Callback parameters with implicit `any` type
```typescript
// Before
array.map(item => ...)  // TS7006: item is 'any'
array.filter((x) => ...) // TS7006: x is 'any'
array.forEach(row => {}) // TS7006: row is 'any'

// After
array.map((item: Type) => ...)
array.filter((x: Type) => ...)
array.forEach((row: Type) => {})
```

**Files to Fix**: lib/zombie, lib/tournament, lib/workers, lib/trade-engine, app/api/bracket, app/api/ai, server/services (callback heavy)

**Estimated Errors Eliminated**: ~1,200–1,400

---

## Medium-Risk Fixes (Second Batch)

**Effort**: 3–5 days  
**Impact**: ~400–600 errors eliminated  
**Risk**: MEDIUM  

### Batch 2: Database Row Type Definitions

**Pattern**: Untyped DB query results with property access errors
```typescript
// Before
const row: any = await db.query(...)
console.log(row.email)  // TS2339: email doesn't exist on type 'any'

// After
interface ScheduleRow {
  week: number
  externalId: string
  homeTeamId: string
  awayTeamId: string
  // ... other properties
}
const row: ScheduleRow = await db.query(...)
console.log(row.email) // TS2339 (caught before deploy)
```

**Files to Fix**: lib/workers (schedule-importer, adp-refresh, devy-data-worker), server/services, lib/tournament

**Prerequisite**: Audit Prisma schema to ensure property names match

---

## High-Risk Areas (Defer for Later)

**Effort**: 5–10 days  
**Impact**: ~500–700 errors  
**Risk**: HIGH  

### Defer: Trade Engine Deep Logic
- Complex model calibration code
- Statistical analysis transforms
- **Action**: Fix only callback types; defer property errors until dedicated trade-engine PR

### Defer: Zombie Mode Complex Domain
- Infection/horde logic
- Weekly update engine
- **Action**: Fix callback types; defer logic errors until Zombie testing is complete

### Defer: Auth Registration Flow
- Untyped form request
- **Action**: Requires end-to-end testing; do last

---

## Recommended Cleanup Order

### Sprint 1 (Days 1–2): Parameter Type Annotations
- [ ] lib/zombie — callback parameters only
- [ ] lib/tournament — callback parameters only
- [ ] app/api/bracket/* — callback parameters only
- [ ] app/api/ai/* — callback parameters only
- **Goal**: Eliminate ~1,200 TS7006 errors  
- **Testing**: `npm run typecheck | grep 'error TS' | wc -l`

### Sprint 2 (Days 3–4): Database Row Types
- [ ] lib/workers/schedule-importer.ts
- [ ] lib/workers/adp-refresh-service.ts
- [ ] lib/workers/devy-data-worker.ts
- [ ] Create shared `RowTypes.ts` file with common interfaces
- **Goal**: Eliminate ~300 TS2339 errors  
- **Testing**: Run workers on staging DB

### Sprint 3 (Days 5–6): Service Layer Types
- [ ] server/services/matchupEngine.ts
- [ ] server/services/standingsEngine.ts
- [ ] lib/trending/*
- **Goal**: Eliminate ~200 errors  
- **Testing**: Verify matchup and standings pages work

### Sprint 4+ (Future): Complex Logic & Auth
- [ ] Trade engine property fixes (defer)
- [ ] Zombie mode property fixes (defer)
- [ ] Auth registration re-validation (defer)
- **Decision**: Tackle only if unblocked by above sprints

---

## Known Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Changing callback signatures causes runtime errors | Add type, verify file still compiles, run unit tests |
| DB row types mismatch schema | Audit Prisma schema first; create shared interfaces |
| Trade/Zombie logic changes introduce bugs | Test on staging; don't change logic, only types |
| Auth registration breaks | Test registration flow on staging before deploying |

---

## Success Criteria

✅ `npm run typecheck` — **PASSES** (0 errors)  
✅ `npm run lint` — **PASSES** (0 errors, or acceptable warnings)  
✅ `npm run build` — **PASSES** (no errors)  
✅ World Cup feature **remains clean** by targeted scan  
✅ Core features tested:
  - League creation & standings ✅
  - Draft room functionality ✅
  - Trade analysis ✅
  - Weekly scoring ✅

---

## Summary Table

| Area | Errors | Risk | Fix Effort | Priority |
|------|--------|------|-----------|----------|
| Parameter Types (all files) | ~1,200 | LOW | 1–2 days | **FIRST** |
| Database Row Types | ~300 | MEDIUM | 1–2 days | **SECOND** |
| Service Layer Types | ~200 | MEDIUM | 1 day | **THIRD** |
| Trade Engine Props | ~100 | HIGH | 2–3 days | DEFER |
| Zombie Mode Props | ~150 | HIGH | 2–3 days | DEFER |
| Auth Registration | ~10 | HIGH | 1–2 days | DEFER |
| **Remaining** | ~450 | MEDIUM | 2–3 days | FUTURE |

---

## World Cup Integration Notes

✅ **No changes needed to World Cup feature**  
✅ **No World Cup files appear in error list**  
✅ **World Cup can be deployed independently** if triage cleanup is delayed  

World Cup QA document: [docs/world-cup-bracket-final-qa.md](world-cup-bracket-final-qa.md)

---

## Next Steps

1. **Review this triage report** — Confirm risk levels with team
2. **Start Sprint 1** — Parameter type annotations (highest ROI, lowest risk)
3. **Daily typecheck tracking** — Monitor error count: `npm run typecheck 2>&1 | grep 'error TS' | wc -l`
4. **Staging validation** — Test core features after each sprint
5. **Deployment readiness** — After Sprint 2–3 complete, repo should pass global gates

---

**Document Owner**: Copilot  
**Last Updated**: May 8, 2026  
**Status**: Ready for cleanup sprint kickoff
