# Discovery System — Final QA Audit (PROMPT 230)

**Date:** 2025-03-16

## 1. Routes verified

| Route | Status | Notes |
|-------|--------|--------|
| `/discover` | ✅ | Redirects to `/discover/leagues` |
| `/discover/leagues` | ✅ | Public + creator league discovery |
| `/discover/leagues/[sport]` | ✅ | NFL, NBA, MLB, NHL, NCAAB, NCAAF, SOCCER (notFound for invalid) |
| `/find-league` | ✅ | FindLeagueClient, same API as discover/leagues |
| `/brackets/discover` | ✅ | Bracket-only discovery (feature-flagged) |
| `/brackets/leagues/[leagueId]` | ✅ | Bracket league detail + DiscoveryViewTracker |
| `/brackets/join` | ✅ | Join by code (used in discovery joinUrl) |
| `/creator/leagues/[leagueId]` | ✅ | Creator league detail + join; DiscoveryViewTracker |
| `/creators` | ✅ | Creator list (linked from CreatorDiscoverySection) |
| `/creators/[handle]` | ✅ | Creator profile (linked from cards) |
| `/app/discover` | ✅ | LeagueDiscoverySuggest (Sleeper + bracket suggestions) |
| `/fantasy-football/leagues` | ✅ | SEO discovery landing |
| `/fantasy-basketball/leagues` | ✅ | SEO discovery landing |
| `/fantasy-baseball/leagues` | ✅ | SEO discovery landing |

**APIs used by discovery:**

- `GET /api/discover/leagues` — query, sport, format, sort, entryFee, visibility, teamCountMin/Max, aiEnabled, page, limit
- `GET /api/discover/trending` — sport, limit
- `GET /api/discover/recommendations` — sport, limit
- `GET /api/bracket/discover` — bracket discovery (when feature enabled)
- `POST /api/league/discover` — Sleeper discovery (app/discover)
- `POST /api/league/discovery/suggest` — league suggestions (app/discover)

## 2. Buttons & links

- **No dead buttons.** All discovery buttons either submit forms, change filters, paginate, or navigate.
- **Card actions:** View → `league.detailUrl` (bracket: `/brackets/leagues/:id`, creator: `/creator/leagues/:id`). Join → `league.joinUrl` (bracket: `/brackets/join?code=...`, creator: `/creator/leagues/:id?join=...`). Both URLs are produced server-side in `PublicDiscoveryService`.
- **Creator link:** Cards link to `/creators/${league.creatorSlug}`; route `app/creators/[handle]/page.tsx` exists.
- **Discovery SEO landings:** “Browse leagues” → `config.discoverHref` (/discover/leagues/nfl|nba|mlb). “All sports”, “Find a league”, “Open App” → /discover/leagues, /find-league, /app.
- **FindLeagueClient:** Sends draftType, draftStatus in buildParams; `/api/discover/leagues` does not use them (no error, filters are effectively ignored for those two).

## 3. Mobile layout & touch

- **Discover/leagues & Find-league:** `max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8` — responsive padding and width.
- **PublicLeagueDiscoveryPage:** `flex flex-col gap-4 sm:flex-row` for search + filters; filters wrap with `flex-wrap`, full width on small screens (`w-full sm:w-auto` on filter group).
- **DiscoveryFilters:** Selects use `min-h-[44px]`, `touch-manipulation`, `flex-1 sm:flex-initial min-w-0` so they’re tappable and don’t overflow on narrow viewports.
- **DiscoverySearchBar:** Submit button `py-2.5 text-sm`, `aria-label="Search leagues"`, `touch-manipulation`.
- **LeagueDiscoveryCard / FindLeagueCard / CreatorLeagueDiscoveryCard:** View and Join (and Full) use `min-h-[44px]`, `py-2.5`, `inline-flex items-center justify-center`, `touch-manipulation`.
- **Brackets discover:** League cards and pagination buttons use `touch-manipulation` and `min-h-[44px]` where applicable; pagination wrapped in `<nav aria-label="Pagination">`.
- **FindLeagueClient:** Filters collapsible on mobile (“Show filters” / “Hide filters”); grid `hidden sm:grid` when collapsed, `block` when shown.
- **Grids:** Discovery cards use `grid gap-4 sm:grid-cols-2 lg:grid-cols-3` (or 2 cols on bracket discover); no horizontal overflow.

## 4. Changes made during audit

- **DiscoveryFilters:** Added `w-full sm:w-auto`, `min-h-[44px]`, `touch-manipulation`, `flex-1 sm:flex-initial min-w-0` to all selects for better mobile tap and layout.
- **DiscoverySearchBar:** Submit button `py-2.5 text-sm`, `touch-manipulation`, `aria-label="Search leagues"`.
- **LeagueDiscoveryCard, FindLeagueCard, CreatorLeagueDiscoveryCard:** View/Join/Full actions use `min-h-[44px]`, `py-2.5`, `inline-flex items-center justify-center`, `touch-manipulation`.
- **Brackets discover LeagueDiscoveryClient:** Card links `touch-manipulation min-h-[44px]`; pagination buttons `py-2.5 min-h-[44px] touch-manipulation` and wrapped in `<nav aria-label="Pagination">`.

## 5. Summary

- **Routes:** All discovery routes and linked targets (brackets/join, creator/leagues, creators) exist and are correct.
- **Buttons/links:** No dead buttons; all card and CTA links point to valid routes; join/detail URLs are built server-side.
- **Mobile:** Responsive containers, collapsible filters on find-league, 44px-friendly tap targets and touch-manipulation on primary actions and filters; grids stack correctly on small screens.
