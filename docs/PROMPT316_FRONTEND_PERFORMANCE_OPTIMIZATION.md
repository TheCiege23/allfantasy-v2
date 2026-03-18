# PROMPT 316 — Frontend Performance Optimization

## Objective

Make the UI fast and smooth by reducing re-renders, optimizing large components, and adding lazy loading, memoization, and list virtualization.

---

## Optimizations Applied

### Re-renders and unnecessary state updates

- **DraftRoomPageClient**
  - **Stable callbacks for memoized children:** Added `handleDraftFromQueue` (useCallback) so QueuePanel receives a stable reference instead of an inline `(entry) => handleMakePick(...)`. Added `handleChatReconnect` (useCallback) for DraftChatPanel’s `onReconnect` so the callback reference is stable.
  - Existing handlers (`handleMakePick`, `handleAddToQueue`, `handleRemoveFromQueue`, `handleReorderQueue`, etc.) were already wrapped in useCallback where used by panels.

### Large components and heavy pages (draft room)

- **Lazy loading (code splitting):** Heavy draft-room panels are loaded on demand via `next/dynamic` with `ssr: false`:
  - `DraftPickTradePanel`
  - `CommissionerControlCenterModal`
  - `PostDraftView`
  - `AuctionSpotlightPanel`
  - `KeeperPanel`
- Initial JS for the draft page no longer includes these chunks; they load when first rendered (e.g. when opening a modal or when draft is complete for PostDraftView).

### Memoization

- **DraftBoardCell**  
  Wrapped in `React.memo(DraftBoardInner)` so cells only re-render when their `pick` or other props change. The draft board can have many cells (rounds × teams).

- **DraftPlayerCard**  
  Wrapped in `React.memo(DraftPlayerCardInner)` so list rows in the player panel only re-render when their player data or actions change.

- **DraftBoard**  
  Already exported as `React.memo(DraftBoardInner)`.

- **PlayerPanel**  
  Already exported as `React.memo(PlayerPanelInner)`.

### Virtualization (lists)

- **Player list in draft room**
  - **Before:** Rendered up to 150 players with `filtered.slice(0, 150).map(...)`, all in the DOM.
  - **After:** Full filtered list is virtualized with `@tanstack/react-virtual`:
    - A new inner component `PlayerListVirtualized` uses `useVirtualizer` with the scroll container ref, `estimateSize: 56` (row height), and `overscan: 5`.
    - Only visible rows (plus overscan) are rendered; the scrollable area keeps total height so scroll position and range are correct.
  - Large pools (e.g. 300+ players) now render only ~15–20 DOM nodes for the list instead of 150+.

---

## What Was Added

| Item | Location | Purpose |
|------|----------|--------|
| **@tanstack/react-virtual** | package.json | Headless list virtualization (useVirtualizer). |
| **PlayerListVirtualized** | PlayerPanel.tsx | Virtualized player list; uses scroll ref and virtualizer to render only visible rows. |
| **DraftBoardCell = React.memo(...)** | DraftBoardCell.tsx | Avoid re-renders of board cells when parent re-renders with same pick data. |
| **DraftPlayerCard = React.memo(...)** | DraftPlayerCard.tsx | Avoid re-renders of player rows when parent re-renders with same player data. |
| **dynamic() for 5 panels** | DraftRoomPageClient.tsx | Code-split DraftPickTradePanel, CommissionerControlCenterModal, PostDraftView, AuctionSpotlightPanel, KeeperPanel. |
| **handleDraftFromQueue** | DraftRoomPageClient.tsx | useCallback so QueuePanel gets stable onDraftFromQueue. |
| **handleChatReconnect** | DraftRoomPageClient.tsx | useCallback so DraftChatPanel gets stable onReconnect. |

---

## Files Touched

- `package.json` — Added `@tanstack/react-virtual`.
- `components/app/draft-room/DraftBoardCell.tsx` — React.memo wrapper.
- `components/app/draft-room/DraftPlayerCard.tsx` — React.memo wrapper.
- `components/app/draft-room/PlayerPanel.tsx` — Virtualized player list (PlayerListVirtualized + useVirtualizer), scroll ref.
- `components/app/draft-room/DraftRoomPageClient.tsx` — dynamic() for 5 panels, handleDraftFromQueue, handleChatReconnect.
- `docs/PROMPT316_FRONTEND_PERFORMANCE_OPTIMIZATION.md` — This deliverable.

---

## Usage notes

- **Virtualization:** Row height is fixed at 56px (`PLAYER_ROW_ESTIMATE_HEIGHT`). If card height changes (e.g. different variant or content), consider dynamic measurement via virtualizer’s `measureElement` or adjust the estimate.
- **Lazy panels:** Modals/panels loaded with dynamic() may show a brief delay the first time they open; subsequent opens use the cached chunk.
- **Memo:** DraftBoardCell and DraftPlayerCard compare props with shallow equality; keep passed props stable (e.g. avoid inline objects) where possible so memo is effective.

---

## Summary

- **Re-renders:** Stable callbacks (handleDraftFromQueue, handleChatReconnect) and memo on DraftBoardCell and DraftPlayerCard reduce unnecessary re-renders in the draft room.
- **Large components:** Five heavy draft panels are code-split and loaded on demand.
- **Virtualization:** The draft room player list is virtualized so only visible rows are rendered, improving performance for large pools.
- **Memoization:** DraftBoardCell and DraftPlayerCard are memoized; DraftBoard and PlayerPanel were already memoized.
