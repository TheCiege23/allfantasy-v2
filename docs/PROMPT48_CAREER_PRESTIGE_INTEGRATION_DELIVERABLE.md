# Prompt 48 — Career Prestige Integration Layer (Deliverable)

## 1. Integration Architecture

- The unified layer now consolidates GM Economy, XP, Reputation, Legacy, Hall of Fame, Awards, and Record Books into one career domain with shared sport normalization.
- Core modules:
  - `CareerPrestigeOrchestrator` for write orchestration.
  - `UnifiedCareerQueryService` for profile, league summary, and leaderboard reads.
  - `SportPrestigeResolver` for sport resolution (`resolveSportForCareer`).
  - `AICareerContextService` for combined narrative payloads.
- Entry points:
  - APIs: `/api/career-prestige/profile`, `/league`, `/leaderboard`, `/run`, `/explain`
  - UI: `CareerTab` + `useCareerPrestige*` hooks.
- Data split:
  - **Profile view**: manager-centric combined snapshot + timeline hints.
  - **League view**: coverage counts + top legacy/XP.
  - **Leaderboard view**: unified prestige score with league-aware scoping.

---

## 2. Backend Orchestration Updates

- `CareerPrestigeOrchestrator` updates:
  - normalized run sport using league sport fallback (`resolveSportForCareer`).
  - normalized/trimmed seasons before run.
  - preserved multi-engine run order (GM, XP, Reputation, Legacy, Awards, Record Book).
- `UnifiedCareerQueryService` updates:
  - profile awards/records counts now use direct DB counts (no truncated list-based counting).
  - timeline hints now use manager-scoped award/record queries for consistency.
  - league reputation/legacy coverage now counts distinct managers instead of raw row count.
  - leaderboard now honors `leagueId` and `sport` filters, scopes to league roster when league context is provided, and includes legacy/reputation/HoF contributions in prestige scoring.
- Route hardening:
  - sport validation/normalization added to profile/league/leaderboard/explain/run APIs.
  - manager run in `/api/career-prestige/run` now enforces own-manager execution (`403` otherwise).

---

## 3. UI Integration Points

- `CareerTab` now includes career-sport filter for the prestige block, propagating to profile/league/leaderboard hooks and explain/run actions.
- Added league explain action (`Explain league`) alongside manager explain panel.
- Added robust status/error surfaces for:
  - career run
  - career explain
  - prestige data hooks
- `useCareerPrestige.ts` now supports optional sport in:
  - `useCareerPrestigeProfile(managerId, leagueId, sport?)`
  - `useLeaguePrestige(leagueId, sport?)`
  - `useCareerLeaderboard(leagueId, sport?)`
- Prestige leaderboard now has loading/empty states and richer row metadata (legacy/reputation when available).

---

## 4. AI Integration

- `AICareerContextService` remains the unified narrative builder for manager and league contexts.
- Explain route now validates sport and consistently returns combined cross-system narrative context.
- Career UI now exposes both explain paths:
  - manager narrative panel (`Explain my career`)
  - league narrative panel (`Explain league`)

---

## 5. UI Audit Findings

- **Career dashboard interactions:** refresh/run/explain actions all have explicit success/failure handling.
- **Manager leaderboard:** now reflects league-scoped manager set in league context (instead of global-only union).
- **Prestige cards:** profile/league cards remain consistent with hook filtering and now report hook failures.
- **Unified timeline + AI panels:** manager and league narratives render with validated inputs; no silent API failure paths.
- **Filter propagation:** `leagueId` and `sport` now propagate through hooks and all relevant career-prestige APIs.

---

## 6. QA Findings

- `npm run typecheck` passes.
- Added route contract coverage:
  - `__tests__/career-prestige-routes-contract.test.ts`
- Executed:
  - `npx vitest run __tests__/career-prestige-routes-contract.test.ts` (4/4 passing)
- Verified contract cases:
  - sport normalization forwarding
  - filter forwarding for profile/league/leaderboard
  - explain dispatch manager vs league
  - run auth + manager ownership guard + seasons normalization

---

## 7. Issues Fixed

- Career leaderboard no longer ignores sport and league context.
- League coverage stats now represent distinct-manager coverage for reputation/legacy.
- Profile awards/records counts and timeline are manager-accurate in large leagues (no list truncation drift).
- Career-prestige run and explain routes now validate sport and enforce manager ownership for manager runs.
- Career tab no longer silently fails in prestige flows; added status/error feedback and league explain panel.

---

## 8. Final QA Checklist

- [x] Unified profile integrates GM Economy, XP, Reputation, Legacy, HoF, Awards, and Record Books.
- [x] League summary and leaderboard integrate and refresh from unified career APIs.
- [x] `leagueId` and `sport` filters propagate across profile/league/leaderboard/explain/run.
- [x] Explain API returns combined manager and league narratives.
- [x] Run API enforces auth and manager ownership.
- [x] Core click paths (refresh, run all, explain manager/league) are wired with UI-visible outcomes.
- [ ] Optional manual browser pass for multi-sport league switching and visual polish.

---

## 9. Explanation of the Career Prestige Layer

The Career Prestige layer is the shared integration plane across seven systems. It unifies each manager’s long-term competitive footprint (GM economy + XP), trust and governance quality (reputation), historical greatness (legacy + Hall of Fame), and seasonal achievement artifacts (awards + record books) into one queryable profile and leaderboard experience.

In practical terms:

1. **Unified profile** gives one manager-centric response for cards, badges, and timeline hints.
2. **League summary** shows league-wide adoption/coverage and top markers.
3. **Unified leaderboard** ranks managers with a combined prestige score using cross-system inputs and league/sport context.
4. **Orchestrator run** keeps all dependent systems synchronized from one action.
5. **AI career context** exposes combined narrative hints for historical storytelling in manager and league panels.

This provides a single, consistent foundation for manager profiles, dynasty recognition, historical storytelling, and explainable prestige UX across the app.
