# PROMPT 273 — Global State Consistency System

**Objective:** Ensure app state is consistent across auth, leagues, drafts, chat, AI, tokens, and subscriptions. Fix stale data, desync issues, and missing refresh logic.

---

## State architecture (summary)

| Domain        | State location              | Refresh triggers |
|---------------|-----------------------------|------------------|
| **Auth**      | next-auth `SessionProvider` | Mount; after profile/settings call `update()` from `useSession()`. |
| **Tokens**    | `useTokenBalance()`         | Mount, window focus (5s throttle), refetch / post-purchase. |
| **Entitlement** | `useEntitlement()`       | Mount, window focus (5s throttle), refetch / post-purchase. |
| **League list** | `useLeagueList()`        | Mount, window focus (5s throttle). |
| **Leagues**   | `useLeagueSectionData()`   | Mount, manual `reload()`; server cache invalidation after mutations. |
| **Drafts**     | Draft APIs / section       | Mount, manual reload. |
| **Chat / AI** | Per-thread / per-request   | No global client cache; refetch by re-opening or re-requesting. |

---

## Fixes applied

### 1. Stale league list on dashboard

- **Issue:** Dashboard fetched `/api/league/list` only on mount. After creating or joining a league (or returning from another tab), the list could be stale.
- **Fix:** Added `useLeagueList(enabled)` hook with refetch on mount and on window focus (throttled 5s). `FinalDashboardClient` now uses `useLeagueList(status === 'authenticated')` instead of local state + single fetch.

### 2. Missing server cache invalidation after roster save

- **Issue:** Roster save API did not invalidate league cache, so server-cached intel could be stale after lineup changes.
- **Fix:** In `app/api/leagues/roster/save/route.ts`, when `leagueId` is present, call `handleInvalidationTrigger('roster_change', leagueId)` so `invalidateLeagueCache(leagueId)` runs.

### 3. Single entry point for state consistency

- **Issue:** Refresh behavior and invalidation were documented but scattered.
- **Fix:** Added `lib/state-consistency/index.ts` that re-exports:
  - `FOCUS_REFETCH_THROTTLE_MS`, `REFRESH_TRIGGERS_DOC` from `refresh-triggers.ts`
  - `invalidateLeagueCache`, `handleInvalidationTrigger`, `InvalidationTrigger` from `lib/trade-engine/caching.ts` for API routes that mutate league data.

### 4. Documentation updates

- **refresh-triggers.ts:** Documented league list hook and auth `update()`; added `leagueList` to `REFRESH_TRIGGERS_DOC`.
- **README.md:** Added league list row to the table; added code references for `useLeagueList` and roster save invalidation.

---

## Files changed (merged code)

| File | Change |
|------|--------|
| `lib/state-consistency/index.ts` | **New.** Re-exports refresh constants and invalidation helpers. |
| `lib/state-consistency/refresh-triggers.ts` | Document league list + auth update; add `leagueList` to REFRESH_TRIGGERS_DOC. |
| `lib/state-consistency/README.md` | League list in table; entry point and roster invalidation in code references. |
| `hooks/useLeagueList.ts` | **New.** `useLeagueList(enabled)` with mount + throttled focus refetch. |
| `components/dashboard/FinalDashboardClient.tsx` | Use `useLeagueList(status === 'authenticated')`; remove local league fetch state. |
| `app/api/leagues/roster/save/route.ts` | Call `handleInvalidationTrigger('roster_change', leagueId)` when leagueId present. |

---

## Usage

- **Dashboard:** No change for callers; league list now stays fresh via `useLeagueList`.
- **After profile/settings change:** In client components, call `update()` from `useSession()` if the session must reflect new profile data.
- **API routes that mutate league data:** Import `handleInvalidationTrigger` from `@/lib/trade-engine/caching` (or `@/lib/state-consistency`) and call with appropriate trigger (`roster_change`, `trade_accepted`, `waiver_processed`, `league_setting_change`) and `leagueId`.

---

## Summary

- **Stale data:** League list and roster-triggered cache are addressed.
- **Desync:** Single reference (refresh-triggers + index) for when and how state is refreshed.
- **Missing refresh:** League list refetch on focus; roster save invalidation; doc for auth update and invalidation in API routes.
