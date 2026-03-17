# PROMPT 144 — AllFantasy Public League Discovery Engine — Deliverable

## Summary

Public league discovery so users can find open leagues, creator leagues, public communities, and bracket competitions. Supports filter by sport, format, free/paid, sort by popularity/newest/filling fast, recommended and trending sections, and SEO-friendly routes.

**Supported sports:** NFL, NHL, NBA, MLB, NCAA Basketball (NCAAB), NCAA Football (NCAAF), Soccer (SOCCER) — via `lib/sport-scope.ts`.

---

## Routes

### App (frontend)

| Route | Description |
|-------|-------------|
| `/discover` | Redirects to `/discover/leagues`. |
| `/discover/leagues` | Main discovery page: search, filters, trending, recommended, creator section, all leagues grid, pagination. |
| `/discover/leagues/[sport]` | Sport-scoped discovery (e.g. `/discover/leagues/NFL`). Same UI with default sport filter; SEO metadata per sport. |

### API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/discover/leagues` | Query: `q`, `sport`, `format` (all \| bracket \| creator), `sort` (popularity \| newest \| filling_fast), `entryFee` (all \| free \| paid), `page`, `limit`. Returns `{ leagues, total, page, limit, totalPages }`. |
| GET | `/api/discover/trending` | Query: `sport`, `limit`. Returns `{ ok, leagues }`. |
| GET | `/api/discover/recommended` | Query: `sport`, `limit`. Returns `{ ok, leagues }`. |

---

## Backend query layer

**Location:** `lib/public-discovery/`

- **types.ts** — `DiscoveryCard`, `DiscoverLeaguesInput`, `DiscoverLeaguesResult`, `DiscoverySort`, `DiscoveryFormat`, `EntryFeeFilter`.
- **PublicDiscoveryService.ts**
  - **discoverPublicLeagues(input, baseUrl)** — Fetches public bracket leagues (`BracketLeague` where `isPrivate: false`) and public creator leagues (`CreatorLeague` where `isPublic: true`, creator `visibility: "public"`). Applies sport, query (name/tournament/creator), format (all/bracket/creator), entryFee (free/paid), sort (popularity = memberCount desc; newest = createdAt desc; filling_fast = fill % desc, excluding full). Returns paginated `DiscoveryCard[]`.
  - **getTrendingLeagues(limit, sport, baseUrl)** — Same sources, sorted by popularity, returns top N.
  - **getRecommendedLeagues(limit, sport, baseUrl)** — Same sources, sorted by filling_fast, only leagues not full, top N.
  - **getDiscoverySports()** — Returns list from `SUPPORTED_SPORTS`.
- **Safe public projection:** Cards expose only id, name, description, sport, memberCount, maxMembers, joinUrl, detailUrl, ownerName, ownerAvatar, creatorSlug, creatorName, tournamentName, season, scoringMode, isPaid, isPrivate, createdAt, fillPct. No PII.
- **Ranking:** Trending = by member count; filling fast = by fill percentage (memberCount/maxMembers), full leagues deprioritized.

---

## Frontend components

| Component | Path | Description |
|-----------|------|-------------|
| PublicLeagueDiscoveryPage | `components/discovery/PublicLeagueDiscoveryPage.tsx` | Main client page: search bar, filters, trending section, recommended section, creator section, “All leagues” grid with pagination, empty state. Accepts `defaultSport` for sport-scoped route. |
| DiscoveryFilters | `components/discovery/DiscoveryFilters.tsx` | Sport, format (All / Brackets / Creator leagues), sort (Popularity / Newest / Filling fast), entry fee (Any / Free / Paid). |
| DiscoverySearchBar | `components/discovery/DiscoverySearchBar.tsx` | Controlled search input + submit; placeholder and onSubmit. |
| LeagueDiscoveryCard | `components/discovery/LeagueDiscoveryCard.tsx` | Card: name, tournament/creator, member count, fill bar, View (detailUrl), Join (joinUrl), Creator profile link when creator league. Mobile-first layout. |
| CreatorDiscoverySection | `components/discovery/CreatorDiscoverySection.tsx` | Fetches creator-format leagues from API; grid of LeagueDiscoveryCard; “Browse all creators” link. |
| TrendingLeaguesSection | `components/discovery/TrendingLeaguesSection.tsx` | Fetches `/api/discover/trending`; grid of LeagueDiscoveryCard. |
| RecommendedLeaguesSection | `components/discovery/RecommendedLeaguesSection.tsx` | Fetches `/api/discover/recommended`; grid of LeagueDiscoveryCard. |

---

## SEO

- **Metadata** on `/discover/leagues` and `/discover/leagues/[sport]` (title, description, openGraph).
- **Canonical structure:** `/discover` → `/discover/leagues`; `/discover/leagues/[sport]` for sport-specific landing (NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER).
- API responses use public cache headers (`s-maxage=60, stale-while-revalidate=120`) where appropriate.

---

## QA checklist (click audit)

- [ ] **Filters work correctly** — Changing sport, format, sort, or entry fee updates the “All leagues” list; pagination resets to page 1.
- [ ] **Search works correctly** — Entering a query and submitting (or Search button) returns matching leagues; clearing search shows full list again.
- [ ] **League cards open detail page** — “View” on a card goes to bracket league or creator league detail URL; page loads.
- [ ] **Join CTA works** — “Join” on a non-full league goes to join URL (brackets/join?code=… or creator/leagues/…?join=…); user can complete join flow.
- [ ] **Creator profile links work** — “Creator profile” on a creator league card goes to `/creators/[creatorSlug]`; profile page loads.
- [ ] **Pagination works** — When totalPages > 1, Previous/Next update the list; disabled states correct on first/last page.
- [ ] **Empty states render correctly** — When no leagues match (e.g. narrow filters or no data), empty state message and hint show; no broken layout.
- [ ] **No dead filter chips or sort buttons** — All filter dropdowns and sort options trigger a refetch and update results; no placeholder-only actions.
- [ ] **Trending / Recommended / Creator sections** — Load and display cards; links from cards work.
- [ ] **Sport-scoped page** — Visiting `/discover/leagues/NFL` (or other sport) shows discovery with sport pre-selected; metadata and title are sport-specific.
- [ ] **Mobile-first card layout** — Cards stack and remain usable on small viewports; buttons and links are tappable.

---

## Files

### New
- `lib/public-discovery/types.ts`
- `lib/public-discovery/PublicDiscoveryService.ts`
- `lib/public-discovery/index.ts`
- `app/api/discover/leagues/route.ts`
- `app/api/discover/trending/route.ts`
- `app/api/discover/recommended/route.ts`
- `app/discover/page.tsx` (redirect)
- `app/discover/leagues/page.tsx`
- `app/discover/leagues/[sport]/page.tsx`
- `components/discovery/LeagueDiscoveryCard.tsx`
- `components/discovery/DiscoverySearchBar.tsx`
- `components/discovery/DiscoveryFilters.tsx`
- `components/discovery/TrendingLeaguesSection.tsx`
- `components/discovery/RecommendedLeaguesSection.tsx`
- `components/discovery/CreatorDiscoverySection.tsx`
- `components/discovery/PublicLeagueDiscoveryPage.tsx`
- `components/discovery/index.ts`
