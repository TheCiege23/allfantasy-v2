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
| **Leagues**   | `useLeagueSectionData()`   | Mount, focus/visibility (5s throttle), manual `reload()`, state refresh events, server cache invalidation after mutations. |
| **Drafts**     | Draft APIs / section       | Mount, focus/visibility (5s throttle), manual reload, state refresh events. |
| **Chat / AI** | `useAIChat()` + per-request | Context reset on league/thread change; emits state refresh events after successful responses. |

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
  - `dispatchStateRefreshEvent`, `addStateRefreshListener` from `state-events.ts`
  - `invalidateLeagueCache`, `handleInvalidationTrigger`, `InvalidationTrigger` from `lib/trade-engine/caching.ts` for API routes that mutate league data.

### 4. Auth session desync after profile updates

- **Issue:** Saving profile/settings could leave next-auth client session stale in the active tab.
- **Fix:** `useSettingsProfile()` now calls `update()` from `useSession()` after successful profile save and emits an auth state refresh event.

### 5. Chat/AI context desync and token balance drift

- **Issue:** AI chat messages could leak across context changes, and token-aware surfaces were not nudged after successful chat sends.
- **Fix:** `useAIChat()` now resets local chat state when conversation context changes and emits `ai`, `chat`, and `tokens` refresh events after successful responses.

### 6. Foreground/visibility refresh hardening

- **Issue:** Some hooks only refreshed on `focus`, which can miss tab/app resume edge cases.
- **Fix:** Added `visibilitychange` refresh handling (with shared throttle) in token, entitlement, monetization context, league list, and league section hooks.

### 7. Documentation updates

- **refresh-triggers.ts:** Documented state-event bus usage across domains.
- **README.md:** Added cross-domain event bus references and usage guidance.

---

## Files changed (merged code)

| File | Change |
|------|--------|
| `lib/state-consistency/index.ts` | Re-exports refresh constants, state-event helpers, and invalidation helpers. |
| `lib/state-consistency/state-events.ts` | **New.** Global state refresh event bus (`dispatchStateRefreshEvent`, `addStateRefreshListener`). |
| `lib/state-consistency/refresh-triggers.ts` | Added state-event bus guidance in trigger documentation. |
| `lib/state-consistency/README.md` | Added cross-domain event bus references and usage guidance. |
| `hooks/useLeagueList.ts` | `useLeagueList(enabled)` now supports focus/visibility refresh + league/auth state events. |
| `hooks/useLeagueSectionData.ts` | Added throttled focus/visibility refresh + league/draft state-event listeners. |
| `hooks/useAIChat.ts` | Reset messages on context change; emit ai/chat/tokens refresh events after successful send. |
| `hooks/useSettingsProfile.ts` | Calls next-auth `update()` after profile save and emits auth refresh event. |
| `hooks/useTokenBalance.ts` | Added visibility resume handling and token/all state-event listeners. |
| `hooks/useEntitlement.ts` | Added visibility resume handling and subscriptions/auth state-event listeners. |
| `hooks/useMonetizationContext.ts` | Added visibility resume handling and token/subscription state-event listeners. |
| `hooks/usePostPurchaseSync.ts` | Emits subscriptions/tokens state refresh events after sync outcomes. |
| `components/dashboard/FinalDashboardClient.tsx` | Use `useLeagueList(status === 'authenticated')`; remove local league fetch state. |
| `app/api/leagues/roster/save/route.ts` | Call `handleInvalidationTrigger('roster_change', leagueId)` when leagueId present. |

---

## Usage

- **Dashboard:** No change for callers; league list now stays fresh via `useLeagueList`.
- **After profile/settings change:** In client components, call `update()` from `useSession()` if the session must reflect new profile data.
- **Cross-domain refresh:** After successful mutations/actions, call `dispatchStateRefreshEvent({ domain, reason, leagueId?, source? })` so dependent hooks can refetch.
- **API routes that mutate league data:** Import `handleInvalidationTrigger` from `@/lib/trade-engine/caching` (or `@/lib/state-consistency`) and call with appropriate trigger (`roster_change`, `trade_accepted`, `waiver_processed`, `league_setting_change`) and `leagueId`.

---

## Summary

- **Stale data:** Focus/visibility refresh now covers tokens, entitlement, monetization context, leagues, and drafts.
- **Desync:** Cross-domain event bus plus hook listeners provide a shared, explicit refresh path.
- **Missing refresh:** Auth session update after profile save, AI/chat-driven token refresh events, and post-purchase token/subscription events close remaining gaps.
