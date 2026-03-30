# State consistency (PROMPT 273)

This folder documents how app state is kept consistent across auth, leagues, drafts, chat, AI, tokens, and subscriptions.

## Goals

- **Stale data**: User-scoped data (tokens, entitlement) refetches on window focus (throttled) so returning from another tab shows up-to-date state.
- **Desync**: Single source of truth for “when do we refetch?” so new features don’t forget refresh logic.
- **Missing refresh**: Post-purchase and post-action flows call `refetch()` or use `usePostPurchaseSync` where applicable.
- **Cross-domain sync**: Lightweight event bus (`state-events.ts`) lets one domain nudge another to refresh (e.g. AI chat spend -> token balance).

## Refresh behavior

| Domain         | Where state lives              | Refreshed on                         |
|----------------|--------------------------------|--------------------------------------|
| **Auth**       | next-auth `SessionProvider`    | Mount, refetch when needed; after profile/settings call `update()` from `useSession()` |
| **Tokens**     | `useTokenBalance()`            | Mount, window focus (5s throttle), refetch / post-purchase |
| **Entitlement**| `useEntitlement()`             | Mount, window focus (5s throttle), refetch / post-purchase |
| **League list**| `useLeagueList()`              | Mount, window focus (5s throttle); dashboard stays fresh after create/join |
| **Leagues**    | `useLeagueSectionData()`      | Mount, focus/visibility (5s throttle), manual `reload()`, state-event refresh, server cache invalidation |
| **Drafts**     | League section / draft APIs   | Mount, focus/visibility (5s throttle), manual reload, state-event refresh |
| **Chat / AI**  | `useAIChat()` + per-request   | Context reset on scope change; emits state-event refresh after successful responses |

## Code references

- **Entry point**: `lib/state-consistency/index.ts` — re-exports throttle constant, REFRESH_TRIGGERS_DOC, state-event helpers, and invalidation helpers.
- **Event bus**: `lib/state-consistency/state-events.ts` — `dispatchStateRefreshEvent` / `addStateRefreshListener`.
- **Focus throttle constant**: `lib/state-consistency/refresh-triggers.ts` — `FOCUS_REFETCH_THROTTLE_MS` (5000).
- **Tokens**: `hooks/useTokenBalance.ts` — focus refetch (PROMPT 268).
- **Entitlement**: `hooks/useEntitlement.ts` — focus refetch (PROMPT 273).
- **League list**: `hooks/useLeagueList.ts` — focus refetch so dashboard list stays fresh after create/join.
- **League sections**: `hooks/useLeagueSectionData.ts` — focus/visibility refetch and league/draft state-event listeners.
- **Post-purchase**: `hooks/usePostPurchaseSync.ts` — refetches entitlement + tokens when URL has success params.
- **Chat / AI bridge**: `hooks/useAIChat.ts`, `hooks/useAIDraftAssistant.ts` — emit state refresh events after successful AI actions.
- **Auth sync**: `hooks/useSettingsProfile.ts` — refreshes next-auth session after profile save and emits auth state refresh event.
- **League invalidation**: `lib/trade-engine/caching.ts` — `invalidateLeagueCache`, `handleInvalidationTrigger`. Call after roster/trade/waiver/settings mutations (e.g. `app/api/leagues/roster/save/route.ts`).

## Adding new global user state

1. **On mount**: Fetch once when the hook mounts (and when key deps change).
2. **On focus**: If the value can change in another tab (e.g. purchase, admin change), add window-focus refetch with the same throttle as tokens/entitlement.
3. **After actions**: Expose `refetch()` and call it after mutations (e.g. purchase, settings update) or use a dedicated sync hook (e.g. `usePostPurchaseSync`).
