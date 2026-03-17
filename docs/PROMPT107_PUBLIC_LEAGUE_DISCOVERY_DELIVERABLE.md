# Prompt 107 — Public League Discovery + Search System

## Deliverable summary

- **Discovery system:** Bracket leagues can be browsed by sport, league type (scoring mode), difficulty (casual/competitive), entry fee (free/paid), and public/private. Text search on league name and tournament name. Paginated results with league cards linking to league detail.
- **Core modules:** LeagueDiscoveryService (discover with filters + in-memory scoringRules filter), LeagueSearchResolver (search where), LeagueFilterResolver (filter options + where + matchesLeagueTypeAndFee).
- **API:** GET `/api/bracket/discover` with query params. **UI:** `/brackets/discover` with search field, filter dropdowns, and league cards; cards open `/brackets/leagues/[id]`.
- **QA:** Search and filter combinations produce correct subsets; league card links open the correct league.

---

## 1. Architecture

### 1.1 Core modules (`lib/league-discovery/`)

| Module | Responsibilities |
|--------|------------------|
| **LeagueFilterResolver** | `getLeagueFilterOptions()` → sports (from SUPPORTED_SPORTS), league types (scoring modes), entry fees (all/free/paid), visibilities (all/public/private), difficulties (all/casual/competitive). `resolveFilters(params)` normalizes query params. `buildDiscoveryWhere(resolved, searchWhere)` builds Prisma where (sport via tournament, visibility via isPrivate, optional searchWhere). `matchesLeagueTypeAndFee(scoringRules, resolved)` applies leagueType, entryFee, difficulty in-memory from scoringRules JSON. |
| **LeagueSearchResolver** | `buildSearchWhere(query)` → Prisma where with OR: league name contains (insensitive), tournament name contains (insensitive). Min length 2. `normalizeSearchQuery(raw)`. |
| **LeagueDiscoveryService** | `discoverLeagues(input)` → fetches BracketLeagues with tournament, owner, _count, scoringRules; where from buildDiscoveryWhere (sport, visibility, search); in-memory filter via matchesLeagueTypeAndFee; paginate (slice); returns `{ leagues: LeagueCard[], total, page, limit, totalPages }`. LeagueCard includes id, name, joinCode, sport, season, tournamentName, tournamentId, scoringMode, isPaidLeague, isPrivate, memberCount, entryCount, maxManagers, ownerName, ownerAvatar, joinUrl. |

### 1.2 Filter semantics

- **Sport:** From BracketTournament.sport (NFL, NHL, NBA, MLB, NCAAF, NCAAB, SOCCER).
- **League type:** scoringRules.mode (fancred_edge, momentum, accuracy_boldness, streak_survival).
- **Entry fee:** scoringRules.isPaidLeague → free vs paid.
- **Visibility:** isPrivate → public vs private.
- **Difficulty:** Casual = momentum, streak_survival; Competitive = fancred_edge, accuracy_boldness (only when league type not already set).

### 1.3 API

**GET `/api/bracket/discover`**

| Param | Description |
|-------|-------------|
| q, query | Search text (league or tournament name). |
| sport | Filter by tournament sport. |
| leagueType | Filter by scoring mode. |
| entryFee | all \| free \| paid. |
| visibility | all \| public \| private. |
| difficulty | all \| casual \| competitive. |
| page | 1-based. |
| limit | Page size (default 20, max 50). |

Response: `{ leagues: LeagueCard[], total, page, limit, totalPages }`.

---

## 2. UI

### 2.1 Discovery page (`/brackets/discover`)

- **Search:** Input + “Search” button; submits form and fetches with `q`, resets to page 1.
- **Filter dropdowns:** Sport, League type, Entry fee, Visibility, Difficulty; onChange updates state and sets page to 1; useEffect refetches when page or filters change.
- **Results:** Grid of league cards; each card shows name, tournament name, season, sport, scoring mode, paid/private badges, member count, owner; whole card is a link to `/brackets/leagues/[id]`.
- **Pagination:** Previous / Next when totalPages > 1.

### 2.2 Entry point

- Brackets home (`/brackets`) when logged in: “Discover leagues” link next to “Join Pool” → `/brackets/discover`.

---

## 3. Mandatory UI click audit

### 3.1 Search field

| Control | Location | Target / Result |
|---------|----------|------------------|
| Search input | Discover page | Type query; “Search” submits form. |
| Search button | Discover page | Submits form → GET discover with `q`, page 1 → results update. |

### 3.2 Filter dropdowns

| Control | Location | Target / Result |
|---------|----------|------------------|
| Sport | Discover page | Select → state update, page 1, refetch with `sport` param → results filtered by tournament sport. |
| League type | Discover page | Select → refetch with `leagueType` (scoring mode). |
| Entry fee | Discover page | Select → refetch with `entryFee` (all/free/paid). |
| Visibility | Discover page | Select → refetch with `visibility` (all/public/private). |
| Difficulty | Discover page | Select → refetch with `difficulty` (all/casual/competitive). |

### 3.3 League card clicks

| Control | Location | Target / Result |
|---------|----------|------------------|
| League card | Discover page | Link to `/brackets/leagues/[id]` (league.id from API). Opens league detail page for that bracket league. |

### 3.4 Leagues open correctly

- Card href is `/brackets/leagues/${league.id}`; league.id is the BracketLeague id returned by discover. League detail page loads that league by id; no client-side param mix-up.

---

## 4. QA: Search results accuracy

- **Search:** Query “X” → only leagues whose name or tournament name contains “X” (case-insensitive); min 2 chars.
- **Sport:** Only leagues whose tournament.sport equals selected sport.
- **Visibility:** public → isPrivate false; private → isPrivate true.
- **League type:** Only leagues whose scoringRules.mode equals selected mode.
- **Entry fee:** free → isPaidLeague false; paid → isPaidLeague true.
- **Difficulty:** Filters by mode set (casual/competitive) when league type not selected.
- **Combined:** All active filters AND search are applied; pagination is over the filtered set; total and totalPages match.

---

## 5. Files touched (reference)

- **New:** `lib/league-discovery/LeagueFilterResolver.ts`, `LeagueSearchResolver.ts`, `LeagueDiscoveryService.ts`, `types.ts`, `index.ts`; `app/api/bracket/discover/route.ts`; `app/brackets/discover/page.tsx`, `LeagueDiscoveryClient.tsx`.
- **Modified:** `app/brackets/page.tsx` (added “Discover leagues” link next to Join Pool).
