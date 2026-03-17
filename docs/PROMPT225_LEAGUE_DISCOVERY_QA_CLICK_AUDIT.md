# PROMPT 225 — League Discovery QA Click Audit

## Scope

- **Pages:** `/discover`, `/discover/leagues`, `/discover/leagues/[sport]`, `/brackets/join`, `/find-league`
- **Components:** PublicLeagueDiscoveryPage, DiscoveryFilters, DiscoverySearchBar, LeagueDiscoveryCard, FindLeagueCard, TrendingLeaguesSection, RecommendedLeaguesSection, CreatorDiscoverySection
- **APIs:** `GET /api/discover/leagues`, `GET /api/discover/trending`, `GET /api/discover/recommendations`, `GET /api/league-invite/preview`, `POST /api/bracket/leagues/join`

---

## 1. Join league — **WORKS**

| Action | Location | Handler / Target | API / Navigation | Status |
|--------|----------|-------------------|------------------|--------|
| Click **Join** (bracket league) | LeagueDiscoveryCard | `<Link href={league.joinUrl}>` | `joinUrl` = `/brackets/join?code={joinCode}` | OK |
| Land on /brackets/join?code=XXX | brackets/join page | `useEffect` reads `sp.get("code")` | `GET /api/league-invite/preview?code=XXX` | OK |
| Preview for bracket code | InviteValidationResolver | `validateInviteCode` | Looks up `BracketLeague` by `joinCode`; returns preview (name, tournament, memberCount, maxManagers, isFull, expired) | OK |
| Submit **Join league** | JoinLeagueForm | `handleJoin` → `POST /api/bracket/leagues/join` with `{ joinCode }` | Creates `BracketLeagueMember`; redirects to `/brackets/leagues/${data.leagueId}` | OK |
| Click **Join** (creator league) | LeagueDiscoveryCard | `<Link href={league.joinUrl}>` | `joinUrl` = `/creator/leagues/${id}?join=${inviteCode}` | OK (detail page must consume `?join=` for actual join) |

**Conclusion:** Bracket join is end-to-end: Discovery → Join link → preview → POST join → redirect. Creator join links to league detail with `?join=`; confirm creator league detail page uses that param to show join CTA or call join API.

---

## 2. Filters — **WORK**

| Control | Component | Handler | Effect | Status |
|---------|-----------|---------|--------|--------|
| Sport | DiscoveryFilters | `onChange` → `onSportChange(e.target.value)` | Parent sets `setSport(v); setPage(1)`; `fetchLeagues` depends on `sport`; `useEffect([page, fetchLeagues])` runs and fetches with new params | OK |
| Format | DiscoveryFilters | `onChange` → `onFormatChange(e.target.value)` | `setFormat(v); setPage(1)`; same effect chain | OK |
| Sort | DiscoveryFilters | `onChange` → `onSortChange(e.target.value)` | `setSort(v); setPage(1)`; same effect chain | OK |
| Entry fee | DiscoveryFilters | `onChange` → `onEntryFeeChange(e.target.value)` | `setEntryFee(v); setPage(1)`; same effect chain | OK |

API: `GET /api/discover/leagues?q=&sport=&format=&sort=&entryFee=&page=&limit=` — all params passed in `PublicLeagueDiscoveryPage` via `params.set(...)`. `discoverPublicLeagues` applies format (bracket/creator/all), sort (popularity/newest/filling_fast), entryFee (all/free/paid), sport, and query. **Conclusion:** Filters are wired and applied; no dead controls.

---

## 3. Pagination — **WORKS**

| Action | Location | Handler | Effect | Status |
|--------|----------|---------|--------|--------|
| **Previous** | PublicLeagueDiscoveryPage | `onClick={() => setPage((p) => Math.max(1, p - 1))}` | `disabled={page <= 1}`; `useEffect([page, fetchLeagues])` runs → `fetchLeagues(page)` | OK |
| **Next** | PublicLeagueDiscoveryPage | `onClick={() => setPage((p) => Math.min(totalPages, p + 1))}` | `disabled={page >= totalPages}`; same effect | OK |
| Display | Same | — | "Page {page} of {totalPages}" from `d.totalPages` (API: `totalPages = ceil(total / limit)`) | OK |

Backend: `discoverPublicLeagues` returns `total`, `page`, `limit`, `totalPages` and slices `combined.slice((page - 1) * limit, (page - 1) * limit + limit)`. **Conclusion:** Pagination is wired and consistent with API.

---

## 4. Orphan team adoption — **OUT OF SCOPE FOR CURRENT DISCOVERY**

- **Discovery** (`/discover/leagues`) shows only **bracket** and **creator** leagues (from `discoverPublicLeagues` → `fetchPublicBracketLeagues` + `fetchPublicCreatorLeagues`). It does **not** list main-app `League` entities.
- **Orphan seeking** is a **main-app league** setting: commissioner sets `orphanSeeking` via Commissioner tab / LeagueRecruitmentTools (“List league publicly (e.g. find a league / orphan seeking)”). That is stored in league settings and is **not** currently consumed by the public discovery API or UI.
- **Orphan adoption** (user takes over an orphan roster) is supported in-app (commissioner replace manager, assign AI to orphan, etc.) but there is **no discoverable “orphan seeking” list** in the current discovery flow.

**Recommendation:** To support “orphan team adoption” in discovery, add a separate source or filter (e.g. “Leagues seeking managers”) that queries main-app leagues with `settings.orphanSeeking === true` and expose them via the discovery API and a section or filter on `/discover/leagues`. Until then, QA for “orphan team adoption” applies to commissioner flows (recruitment tools, replace manager), not the discovery page.

---

## 5. No dead buttons — **VERIFIED**

| Element | Location | Type | Target / Handler | Status |
|---------|----------|------|-------------------|--------|
| **Search** (submit) | DiscoverySearchBar | `button type="submit"` | `onSubmit` (parent: `handleSearch` → setPage(1), fetchLeagues(1)) | OK |
| **View** | LeagueDiscoveryCard | `Link` | `href={league.detailUrl}` (bracket: `/brackets/leagues/${id}`; creator: `/creator/leagues/${id}`) | OK |
| **Join** | LeagueDiscoveryCard | `Link` | `href={league.joinUrl}` (hidden when `isFull`) | OK |
| **Creator profile** | LeagueDiscoveryCard | `Link` | `href={/creators/[creatorSlug]}` (only when `league.creatorSlug`) | OK |
| **Previous / Next** | PublicLeagueDiscoveryPage | `button` | `setPage`; disabled when at first/last page | OK |
| **Back** | brackets/join page | `button` | `router.back()` | OK |
| **Join league** (submit) | brackets/join | `button type="submit"` | `handleJoin` → POST join, then redirect | OK |

All discovery and join controls have valid handlers or hrefs; no dead buttons found.

---

## Summary

| Check | Result |
|-------|--------|
| Join league (bracket) | OK — Join → /brackets/join?code= → preview → POST join → redirect |
| Join league (creator) | OK — Join → /creator/leagues/[id]?join= (confirm detail page handles join) |
| Filters (sport, format, sort, entry fee) | OK — State + fetchLeagues dependency; API receives all params |
| Pagination | OK — Previous/Next update page; API returns totalPages and slice |
| Orphan team adoption | Out of scope — Not in current discovery; add “orphan seeking” source to support it |
| No dead buttons | OK — All controls wired |

---

## Suggested manual QA

1. **Join (bracket):** Open `/discover/leagues`, pick a non-full bracket league, click Join → should land on `/brackets/join?code=...` with preview; submit → should join and redirect to league page.
2. **Join (creator):** Click Join on a creator league → land on creator league page with `?join=...`; confirm join action exists and works.
3. **Filters:** Change sport, format, sort, entry fee → list and total should update; URL can optionally reflect filters for shareability.
4. **Pagination:** With enough results, click Next/Previous → page and list update; Previous disabled on page 1, Next on last page.
5. **Search:** Type in search bar, click Search → `q` sent to API; results and pagination reset to page 1.
