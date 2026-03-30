# PROMPT 275 — League Discovery + Growth Engine

**Objective:** Make it easy to find and join leagues.

---

## Delivered

### 1. Public leagues
- **API:** `GET /api/discover/leagues` (existing) — query, sport, format (all | bracket | creator), sort (popularity | newest | filling_fast), entryFee (all | free | paid), visibility, teamCountMin/Max, aiEnabled, page, limit.
- **UI:** “Browse public leagues” section with search + filters and paginated grid.

### 2. Orphan teams
- **API:** `GET /api/discover/orphans` (new) — returns main-app leagues where `settings.orphanSeeking === true`, with join URL from invite code. Optional `?sport=` and `?limit=`.
- **UI:** “Orphan teams” section — sport filter; cards link to `/join?code=...` to take over an open team.

### 3. Filters (sport, type, paid/free)
- **Sport:** All sports from `SUPPORTED_SPORTS` (NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER).
- **Type:** All | Fantasy | Bracket | Creator (format).
- **Paid/Free:** All | Free | Paid (entryFee).
- **Sort:** Popular | Newest | Filling fast.
- **Style:** Any style | Dynasty | Redraft | Best Ball | Keeper | Survivor | Bracket | Community.
- **UI:** Filter bar in “Browse public leagues” plus search and one-tap clear filters.
- **Behavior:** filter changes are now state-consistent (no stale refetches); sport filter also scopes Trending, Recommendations, and Orphan sections.

### 4. Trending leagues
- **API:** `GET /api/discover/trending` (existing) — popularity-sorted, optional sport, limit.
- **UI:** “Trending” section at top of discover page.

### 5. Recommended leagues (AI / personalized)
- **API:** `GET /api/discover/recommendations` (existing) — when logged in uses `getPersonalizedRecommendations` (sport/league-type scoring); when anonymous uses `getRecommendedLeagues` (filling_fast). Returns `{ leagues: [{ league, explanation }] }`.
- **UI:** “Recommended for you” section with optional explanation text per card.

### 6. Discovery system + UI
- **Page:** `/app/discover` — unified discovery with sections: Trending, Recommended for you, Orphan teams, Browse public leagues (filters + pagination). Below that, existing “League Discovery AI” (Sleeper + tournament suggest) remains.
- **Component:** `components/league-discovery/LeagueDiscoveryClientUnified.tsx` — fetches trending, recommendations, orphans, and browse (discover/leagues) and renders cards with join/detail links.
- **Dashboard:** “Discover” link next to “All” in the Leagues section of `/app/home` for quick access.

---

## Files touched

| File | Change |
|------|--------|
| `app/api/discover/orphans/route.ts` | **New** — GET orphan leagues (orphanSeeking), return join URLs. |
| `components/league-discovery/LeagueDiscoveryClientUnified.tsx` | **New** — unified discovery UI (trending, recommended, orphans, browse + filters). |
| `app/app/discover/page.tsx` | Uses unified client + keeps League Discovery AI section; metadata. |
| `components/dashboard/FinalDashboardClient.tsx` | Added “Discover” link next to “All” in Leagues. |
| `docs/PROMPT275_LEAGUE_DISCOVERY_GROWTH_ENGINE.md` | **New** — this doc. |

---

## Data flow

- **Trending / Browse:** `lib/public-discovery` (bracket + creator leagues, cache).
- **Recommended:** `lib/league-recommendations` (personalized) or `getRecommendedLeagues` (anonymous).
- **Orphans:** Main-app `League` with `settings.orphanSeeking === true` and `settings.inviteCode` for join URL.
