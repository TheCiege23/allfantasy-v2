# PROMPT 195 — Draft Asset Pipeline (Deliverable)

## Overview

The draft asset pipeline ensures **consistent asset rendering** for player headshots, team logos, player stats, team abbreviations, position labels, and bye weeks across all draft types (live, mock, auction, slow, keeper, devy, C2C) and all supported sports (NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer). No broken image icons, no blank team logos, no provider-specific leaks; mobile and desktop optimized.

---

## Implemented Pieces

### 1. Asset normalization layer

- **`lib/draft-asset-pipeline/DraftAssetPipelineService.ts`**  
  Single entry for all draft types:
  - `resolveAssets(playerId, teamAbbreviation, sport)` → `PlayerAssetModel` (headshot + team logo with fallbacks)
  - `resolveAssetsBatch(items)` → batch resolution using same cache
  - `getTeamDisplay(teamAbbreviation, sport)` → `TeamDisplayModel` (logo from registry, abbreviation, displayName)
  - `getTeamLogoUrl(teamAbbreviation, sport)` → team logo URL from registry
  - `getStatSnapshotForPlayer(raw, sport)` → `PlayerStatSnapshotModel` (uses stat snapshot cache)
  - `normalizePlayer(raw, sport)` / `normalizePlayerList(rawList, sport)` → `NormalizedDraftEntry[]`
  - `clearPipelineCaches()` for tests/admin

- All callers use these APIs; no raw provider shapes in UI.

### 2. Asset cache

- **Location:** `lib/draft-sports-models/player-asset-resolver.ts` (used by pipeline)
- **Key:** `assets:${sport}:${playerId}:${teamAbbreviation}`
- **TTL:** 6 hours in-memory
- **Contents:** `PlayerAssetModel` (headshotUrl, teamLogoUrl, fallback flags)
- **Invalidation:** `clearAssetCache()` or `clearPipelineCaches()`

### 3. Stat snapshot cache

- **Location:** `lib/draft-asset-pipeline/stat-snapshot-cache.ts`
- **Key:** `stats:${sport}:${playerId}`
- **TTL:** 1 hour
- **Contents:** `PlayerStatSnapshotModel` (primaryStatLabel/Value, secondaryStatLabel/Value, adp, byeWeek)
- **Use:** Avoid recomputing stats when the same player appears in multiple draft contexts (e.g. pool + queue).

### 4. Team logo registry

- **Source:** `lib/sport-teams/SportTeamMetadataRegistry.ts` → `getPrimaryLogoUrlForTeam(sport, abbreviation)`
- **Usage:** Pipeline calls `resolveTeamLogoUrlSync` → `getPrimaryLogoUrlForTeam`. All team logos go through the registry; unknown teams get ESPN-style URL by sport + abbr when possible.
- **UI fallback:** If logo URL is missing or image fails, `DraftPlayerCard` shows team abbreviation (2 chars) — **no blank team logos**.

### 5. Fallback placeholders

- **Headshot:** Missing or failed URL → initials (first letter of display name) in a circle; no broken image.
- **Team logo:** Missing or failed URL → 2-letter team abbreviation in a rounded box.
- Implemented in `DraftPlayerCard` (`HeadshotOrFallback`, `TeamLogoOrFallback`) and used for both row and card variants.

### 6. Image loading strategy

- **`components/app/draft-room/LazyDraftImage.tsx`:** Wrapper that:
  - Uses **Intersection Observer** (configurable `rootMargin`, default 100px) to defer loading until near viewport.
  - Sets `loading="lazy"` and `decoding="async"` on the underlying `<img>`.
  - Calls `onError` so parent can switch to fallback (initials/abbr); **no broken image icons**.
- **DraftPlayerCard** uses `LazyDraftImage` for headshot and team logo when URL is present; on error, switches to initials/abbr.

### 7. Consistent player card rendering contract

- **Component:** `DraftPlayerCard` (props: `display?`, `name`, `position`, `team`, `adp`, `byeWeek`, `isDrafted`, `variant`, `primaryAction`, `secondaryAction`, `loading`, `error`).
- **Contract:** All draft UIs that show a player card must pass normalized data (prefer `display: PlayerDisplayModel`); fallback to minimal fields when needed. No provider-specific props.
- **Markers for QA:** `data-draft-player-card="true"` and `data-variant="row"|"card"` on the root element.

### 8. Shared hook for normalized pool

- **`hooks/useNormalizedDraftPool.ts`:** `useNormalizedDraftPool(leagueId)` returns `{ entries, sport, loading, error, refetch }`.
- **Use:** Live draft room (or any draft type with a league) can use this hook; mock/auction/slow/keeper/devy/C2C can use the same hook when they have a `leagueId`, so all get the same pipeline-backed pool and rendering.

---

## File Manifest

| Path | Label |
|------|--------|
| `lib/draft-asset-pipeline/stat-snapshot-cache.ts` | [NEW] |
| `lib/draft-asset-pipeline/DraftAssetPipelineService.ts` | [NEW] |
| `lib/draft-asset-pipeline/index.ts` | [NEW] |
| `components/app/draft-room/LazyDraftImage.tsx` | [NEW] |
| `components/app/draft-room/DraftPlayerCard.tsx` | [UPDATED] |
| `components/app/draft-room/index.ts` | [UPDATED] |
| `hooks/useNormalizedDraftPool.ts` | [NEW] |

Existing (unchanged but part of pipeline):

- `lib/draft-sports-models/types.ts`
- `lib/draft-sports-models/player-asset-resolver.ts`
- `lib/draft-sports-models/normalize-draft-player.ts`
- `app/api/leagues/[leagueId]/draft/pool/route.ts`
- `components/app/draft-room/PlayerPanel.tsx` (uses `DraftPlayerCard` with normalized `display`)
- `components/app/draft-room/DraftRoomPageClient.tsx` (fetches normalized pool, passes to `PlayerPanel`)

---

## Cache notes

| Cache | Scope | TTL | Key pattern | Clear |
|-------|--------|-----|-------------|--------|
| Player assets | In-memory (player-asset-resolver) | 6h | `assets:${sport}:${playerId}:${teamAbbr}` | `clearAssetCache()` |
| Stat snapshots | In-memory (stat-snapshot-cache) | 1h | `stats:${sport}:${playerId}` | `clearStatSnapshotCache()` |
| Team metadata | SportTeamMetadataRegistry (static + DB) | N/A | by sport + abbreviation | N/A |
| Draft pool API | No server cache | — | per request | — |

Pipeline clear: `clearPipelineCaches()` clears both asset and stat snapshot caches.

---

## QA checklist (mandatory click audit)

### Player-card–dependent interactions

- [ ] **Card opens correctly** — Tapping/clicking a player card (e.g. in pool list or board) opens detail or compare without error.
- [ ] **Compare / Add to queue works** — Secondary action (e.g. “Add to queue”) and any compare flow work; no dead buttons.
- [ ] **Drafted state updates visually** — When a player is drafted, the card shows drafted state (e.g. opacity, border) and no longer appears in available pool where applicable.
- [ ] **Image fallback works** — If headshot or team logo fails to load (or is missing), fallback (initials / team abbr) is shown; **no broken image icons**.
- [ ] **No dead asset retry buttons** — There are no “retry” buttons that do nothing; refresh/resync triggers a real refetch (e.g. `refetch()` from `useNormalizedDraftPool` or draft room resync).

### Assets and stats

- [ ] **No broken image icons** — Headshot and team logo either show image or fallback (initials / abbr); never a broken image.
- [ ] **No blank team logos** — Team logo area always shows either the logo image or the 2-letter team abbreviation.
- [ ] **Consistent stat shapes** — ADP, bye (where applicable), and position are shown in a consistent shape across sports; no provider-specific fields in UI.
- [ ] **No provider-specific leaks** — UI does not show raw provider keys (e.g. `sleeper_id`, `ffcPlayerId`) or provider-specific labels.

### Draft types

- [ ] **Live draft** — Pool and cards use normalized assets and stats; fallbacks and loading/error states correct.
- [ ] **Mock draft** — When using league-scoped mock, `useNormalizedDraftPool(leagueId)` (or same pool API) yields same normalized cards and assets.
- [ ] **Auction / slow / keeper / devy / C2C** — Same player card contract and pipeline; drafted state and stats render consistently.

### Responsive

- [ ] **Mobile** — Cards and rows are readable and tappable; images and fallbacks scale; no horizontal overflow.
- [ ] **Desktop** — Layout and density appropriate; lazy loading and fallbacks behave correctly.

---

## Normalization and contract summary

- **Player headshots:** From pipeline (`resolveAssets` → player-asset-resolver + player-media/Sleeper template). Fallback: initials.
- **Team logos:** From pipeline (`getTeamDisplay` / `getTeamLogoUrl` → SportTeamMetadataRegistry). Fallback: team abbreviation.
- **Player stats:** From pipeline (`getStatSnapshotForPlayer` or `normalizePlayer`); stat snapshot cache used when applicable. Same shape across sports (e.g. primaryStatLabel/Value, byeWeek).
- **Position / team / bye:** Always from normalized `PlayerDisplayModel` / `NormalizedDraftEntry`; no raw provider fields in UI.

All draft types that render player cards should use `DraftPlayerCard` with normalized `display` (or minimal fallback props) and the same loading/error/fallback behavior.
