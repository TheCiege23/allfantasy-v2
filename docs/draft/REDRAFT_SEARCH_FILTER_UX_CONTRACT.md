# REDRAFT Search / Filter UX Contract

## Scope

This contract defines interaction integrity for player discovery and filtering in the live redraft draft room.

In scope:

- Search input behavior and matching semantics.
- Position/team/pool filtering behavior.
- Rookie toggle behavior.
- Drafted/unavailable row visibility and action-state behavior.
- Mobile quick-search behavior.
- Guarantees that filter interactions do not mutate draft session state.

Out of scope:

- Draft mechanics changes (pick order, timer, queue engine, autopick engine).
- Player data/image pipeline changes.
- Visual redesign of draft room layouts.

## Search Behavior

Primary search source of truth:

- `components/app/draft-room/PlayerPanel.tsx` stores search text in local state `searchQuery`.
- Filtering path uses `applyDraftFilters(...)` from `lib/draft-room/DraftPlayerSearchResolver.ts`.

Matching rules:

- Search is case-insensitive.
- Name matching includes canonical-name fallback (dot/apostrophe-tolerant behavior from `filterBySearch`).
- Team and position substring search are supported.
- Additional room-level search fields include school and projected landing spot.

Clear behavior:

- Clearing search (`searchQuery=''`) restores results constrained only by other active filters.

## Filter Behavior

Position filter:

- Position filter state is local (`positionFilter`), with `All` as no-op.
- Position pill controls are the canonical position UI in the player panel.

Team filter:

- Team filter state is local (`teamFilter`), with `All` as no-op.

Pool filter (when enabled):

- Devy/C2C contexts can constrain to Pro/Devy/College depending on league config and round mode.

Clear-all behavior:

- `Clear filters` resets search, position/team/pool filters, watchlist-only, rookies-only, and hide-drafted back to defaults.

## Rookie Toggle Behavior

Rookie toggle source of truth:

- Local state `rookiesOnly` in player panel.
- Predicate `isRookieEligibleForFilter(...)` in `lib/draft-room/rookieFilterPredicate`.

Rules:

- Toggle ON: only rookie-eligible rows remain.
- Toggle OFF: rookie rows return to the same normal pool order/visibility as non-rookies.
- If rookie metadata is unavailable, an explicit `Rookie data unavailable` empty-state is shown.

## Drafted / Unavailable Player Behavior

Drafted handling has two valid UX modes:

- Hidden mode when `hideDrafted=true`: drafted rows are removed from visible list.
- Visible mode when `hideDrafted=false`: drafted rows remain visible but draft action is disabled.

Draft action state:

- Draft action is disabled when either:
  - user is not allowed to draft (`!canDraft`), or
  - player is already drafted (`isPlayerDraftedEntry(...)`).

Queue action state:

- Queue add action remains available from filtered views.
- Queue interaction should not depend on on-clock permission.

## Mobile Behavior

Quick search contract:

- Mobile quick-search CTA dispatches player-panel focus flow.
- `openMobilePlayerSearch()` in page client must:
  - set mobile tab to `players`, and
  - dispatch `af:draft-player-search-focus` event.
- Player panel must listen for this event and focus/select the search input.

## State Integrity Guarantees

Filter/search interactions are UI-local only:

- Search/filter states are local component state in player panel.
- Changing search/filter state must not mutate draft session objects, current pick pointer, or pick order.
- Draft state mutation remains limited to explicit draft actions (pick submit, queue persistence, commissioner controls) outside filter controls.

## Non-Goals

This slice does not:

- Change commissioner/member permission model.
- Change queue ownership/auth semantics.
- Modify AI/War Room entitlement logic.
- Add new draft types or format-specific draft mechanics.
