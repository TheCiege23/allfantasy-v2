# State consistency (PROMPT 273)

This folder documents how app state is kept consistent across auth, leagues, drafts, chat, AI, tokens, and subscriptions.

## Goals

- **Stale data**: User-scoped data (tokens, entitlement) refetches on window focus (throttled) so returning from another tab shows up-to-date state.
- **Desync**: Single source of truth for “when do we refetch?” so new features don’t forget refresh logic.
- **Missing refresh**: Post-purchase and post-action flows call `refetch()` or use `usePostPurchaseSync` where applicable.

## Refresh behavior

| Domain         | Where state lives              | Refreshed on                         |
|----------------|--------------------------------|--------------------------------------|
| **Auth**       | next-auth `SessionProvider`    | Mount, refetch when needed; after profile/settings call `update()` from `useSession()` |
| **Tokens**     | `useTokenBalance()`            | Mount, window focus (5s throttle), refetch / post-purchase |
| **Entitlement**| `useEntitlement()`             | Mount, window focus (5s throttle), refetch / post-purchase |
| **League list**| `useLeagueList()`              | Mount, window focus (5s throttle); dashboard stays fresh after create/join |
| **Leagues**    | `useLeagueSectionData()`      | Mount, manual `reload()`; server cache invalidation via `lib/trade-engine/caching.ts` |
| **Drafts**     | League section / draft APIs   | Mount, manual reload                 |
| **Chat / AI**  | Per-thread or per-request     | No global client cache; refetch by re-opening or re-requesting |

## Code references

- **Entry point**: `lib/state-consistency/index.ts` — re-exports throttle constant, REFRESH_TRIGGERS_DOC, and invalidation helpers.
- **Focus throttle constant**: `lib/state-consistency/refresh-triggers.ts` — `FOCUS_REFETCH_THROTTLE_MS` (5000).
- **Tokens**: `hooks/useTokenBalance.ts` — focus refetch (PROMPT 268).
- **Entitlement**: `hooks/useEntitlement.ts` — focus refetch (PROMPT 273).
- **League list**: `hooks/useLeagueList.ts` — focus refetch so dashboard list stays fresh after create/join.
- **Post-purchase**: `hooks/usePostPurchaseSync.ts` — refetches entitlement + tokens when URL has success params.
- **League invalidation**: `lib/trade-engine/caching.ts` — `invalidateLeagueCache`, `handleInvalidationTrigger`. Call after roster/trade/waiver/settings mutations (e.g. `app/api/leagues/roster/save/route.ts`).

## Adding new global user state

1. **On mount**: Fetch once when the hook mounts (and when key deps change).
2. **On focus**: If the value can change in another tab (e.g. purchase, admin change), add window-focus refetch with the same throttle as tokens/entitlement.
3. **After actions**: Expose `refetch()` and call it after mutations (e.g. purchase, settings update) or use a dedicated sync hook (e.g. `usePostPurchaseSync`).
