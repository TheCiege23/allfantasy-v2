# PROMPT 153 — ClearSports Data Integration

ClearSports is integrated as a normalized sports data provider used by the sports-router. Supported sports (platform): NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer. ClearSports API currently supports **NFL, NBA, MLB**; for other sports the router uses other sources (ESPN, TheSportsDB, etc.) when available.

---

## 1. Current sports data layer (summary)

- **Entry:** `getSportsData(request)` in `lib/sports-router.ts`; cache (memory + Prisma `sportsDataCache`), circuit breaker per source, source priority per sport.
- **Route:** `GET/POST /api/sports` — query: `sport`, `type`, `id`, `refresh`; response: `success`, `source`, `cached`, `fetchedAt`, `data`.
- **Sources (priority per sport):**  
  - NFL: rolling_insights → api_sports → espn → **clear_sports** → thesportsdb  
  - NBA/MLB: **clear_sports** → thesportsdb → espn  
- **Helpers:** `getTeams`, `getGames`, `getStandings`, `getPlayer`, `getPlayerStats`, `getSchedule` (all delegate to `getSportsData`).

---

## 2. ClearSports integration

### 2.1 Client (`lib/clear-sports/client.ts`)

- **Config:** `getClearSportsConfigFromEnv()` (provider-config); requires `CLEARSPORTS_API_KEY` and `CLEARSPORTS_API_BASE`.
- **Rate limit:** In-memory, configurable `CLEARSPORTS_RATE_LIMIT_PER_MINUTE` (default 60). When exceeded, waits or returns null; no key or body in logs.
- **Retry:** Configurable `CLEARSPORTS_MAX_RETRIES` (default 2); backoff 1s, 2s; 429 triggers retry.
- **Timeout:** Configurable `CLEARSPORTS_TIMEOUT_MS` (default 15000); request aborted after timeout.
- **Logging:** Safe only — path, status code, duration; no API key, no response bodies. Errors logged as warnings.

### 2.2 Service / fetch API (`lib/clear-sports/index.ts`)

- `fetchClearSportsTeams(sport)` → `ClearSportsTeam[]`
- `fetchClearSportsPlayers(sport, search)` → `ClearSportsPlayer[]`
- `fetchClearSportsGames(sport, season?)` → `ClearSportsGame[]`  
- Uses `clearSportsFetch` from client; parses API response into typed ClearSports* models.

### 2.3 Normalization (`lib/clear-sports/normalize.ts`)

- Sport-aware mapping from ClearSports types to internal shapes used by the sports-router:
  - `normalizeClearSportsTeams(teams, sport)` → `NormalizedTeam[]`
  - `normalizeClearSportsPlayers(players, sport)` → `NormalizedPlayer[]`
  - `normalizeClearSportsGames(games, sport, season?)` → `NormalizedGame[]`
- Uses `normalizeTeamAbbrev` (team-abbrev); position normalization is sport-aware for future use.

### 2.4 Backward compatibility

- `lib/clear-sports.ts` re-exports from `lib/clear-sports/index.ts` so existing imports from `@/lib/clear-sports` keep working.

### 2.5 Fallback when ClearSports is unavailable

- Router checks `isClearSportsAvailable()` before calling ClearSports; if unavailable or circuit open, the next source in `API_PRIORITY` is tried.
- Circuit breaker: after 3 failures, `clear_sports` is skipped for 2 minutes, then retried.

---

## 3. Tools that can consume ClearSports data

Data flows through `getSportsData()` (and thus can come from ClearSports when it is the chosen source for that sport/type):

| Tool / feature        | Data type(s)     | Notes                                                                 |
|-----------------------|------------------|-----------------------------------------------------------------------|
| Player cards          | players, stats   | Player search/list and stats; ClearSports for NBA/MLB players/search. |
| Rankings              | (other APIs)     | Legacy rankings use their own APIs; roster/player lists may use sports data. |
| Projections           | (if added)       | Not yet provided by ClearSports client; can be added when API supports. |
| Matchup insights      | games, schedule  | Games/schedule for NFL/NBA/MLB can come from ClearSports.             |
| Trend detection       | (other routes)   | Trending/trends use other endpoints; can later fuse sports data.       |
| News/alerts           | (other routes)   | News from news/sync; not ClearSports in this implementation.          |
| Draft helper          | players, teams   | Player/team lists for draft context can come from ClearSports.         |
| Waiver wire           | players          | Waiver logic may use player data; ClearSports can supply when source. |

So: **player cards, matchup (games/schedule), draft helper (player/team lists), waiver wire (player data)** can all consume ClearSports when the router selects `clear_sports` for that sport and data type. Rankings, projections, trend, news use other systems or are not yet wired to ClearSports.

---

## 4. Config / env

| Variable                          | Purpose                          | Default   |
|-----------------------------------|----------------------------------|-----------|
| `CLEARSPORTS_API_KEY`             | API key (required with BASE)     | —         |
| `CLEARSPORTS_API_BASE`            | Base URL (required with KEY)     | —         |
| `CLEARSPORTS_TIMEOUT_MS`          | Request timeout (ms)             | 15000     |
| `CLEARSPORTS_MAX_RETRIES`         | Retries after failure            | 2         |
| `CLEARSPORTS_RATE_LIMIT_PER_MINUTE`| Max requests per minute         | 60        |
| `CLEAR_SPORTS_API_KEY` / `CLEAR_SPORTS_API_BASE` | Legacy aliases        | —         |

Keys are server-side only; never exposed to frontend or in logs.

---

## 5. Route behavior (for frontend / click audit)

- **GET /api/sports**  
  - Success: `{ success: true, sport, dataType, source, cached, fetchedAt, data }`.  
  - Error: `{ success: false, error, details }` with 4xx/5xx; no stack or secrets in `details`.  
- **useSportsData** hook (`hooks/useSportsData.ts`):  
  - Returns `{ data, loading, error, source, cached, fetchedAt, refetch }`.  
  - Callers should: show **loading** when `loading === true`, **error** when `error` is set, and **cached** indicator when `cached === true` (stale/cache state).  
  - `refetch(true)` for explicit refresh; avoid dead refresh buttons by keeping refresh wired to `refetch` and showing loading during refetch.

---

## 6. QA checklist

- [ ] **ClearSports as source:** For NFL/NBA/MLB, with valid `CLEARSPORTS_API_KEY` and `CLEARSPORTS_API_BASE`, requests for teams/players/games sometimes return `source: "clear_sports"` and valid `data`.
- [ ] **Fallback:** With ClearSports disabled or invalid key, same requests succeed from another source (e.g. espn, thesportsdb) and never expose keys or stack traces.
- [ ] **Rate limit / retry / timeout:** Client respects rate limit (no more than N/min); failed requests retry up to MAX_RETRIES; long-running requests abort after timeout. Logs show only path, status, duration (no keys/bodies).
- [ ] **Cache and circuit breaker:** Repeated use returns cached data when fresh; after multiple failures, ClearSports is skipped for cooldown then tried again.
- [ ] **Normalization:** Responses from ClearSports are normalized to internal team/player/game shapes (correct ids, team abbrevs, positions, dates).
- [ ] **Existing integrations:** ESPN, API-Sports, Rolling Insights, TheSportsDB still work; no regressions for tools that don’t use ClearSports.
- [ ] **Frontend (click audit):** Any UI using ClearSports-backed data (e.g. via `useSportsData` or direct `/api/sports`): shows loading state, error state, and cached/stale state where applicable; refresh triggers refetch and shows loading; no empty widgets without explanation and no dead refresh buttons.

---

## 7. File summary

| Path | Purpose |
|------|---------|
| `lib/clear-sports/client.ts` | ClearSports HTTP client: rate limit, retry, timeout, safe logging. |
| `lib/clear-sports/types.ts` | ClearSportsTeam, ClearSportsPlayer, ClearSportsGame, ClearSportsSport. |
| `lib/clear-sports/normalize.ts` | Sport-aware normalization to NormalizedTeam/Player/Game. |
| `lib/clear-sports/index.ts` | fetchClearSportsTeams/Players/Games, re-exports types and normalizers. |
| `lib/clear-sports.ts` | Re-exports from clear-sports/ for backward compatibility. |
| `lib/sports-router.ts` | Uses fetch + normalizer for clear_sports; source priority and circuit breaker unchanged. |
| `lib/provider-config.ts` | getClearSportsConfigFromEnv(), isClearSportsAvailable(). |
| `app/api/sports/route.ts` | GET/POST; returns source, cached, fetchedAt; safe error message. |
| `hooks/useSportsData.ts` | useSportsData(params) → loading, error, data, source, cached, refetch. |
| `.env.example` | CLEARSPORTS_* and optional timeout/retry/rate limit. |
