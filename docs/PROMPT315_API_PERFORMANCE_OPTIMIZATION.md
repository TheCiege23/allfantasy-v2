# PROMPT 315 — API Performance Optimization

## Objective

Make APIs fast and scalable by improving response size, reducing redundant calls, and adding caching, pagination, and request deduplication.

---

## What Was Added

### 1. **lib/api-performance** – Central API performance layer

| Module | Purpose |
|--------|--------|
| **cache.ts** | HTTP response cache (in-memory, TTL). `buildApiCacheKey(method, url)`, `getApiCached(key)`, `setApiCached(key, body, { ttlMs })`. Excludes params like `refresh` from the key. Max 1000 entries with eviction. Presets: `API_CACHE_TTL.SHORT` (30s), `DEFAULT` (1m), `MEDIUM` (5m), `LONG` (15m). Designed so a Redis (or similar) backend can be plugged in later. |
| **pagination.ts** | Cursor and offset pagination. `parseCursorPageParams(req)` → `{ limit, cursor }`, `parseOffsetPageParams(req)` → `{ page, limit, skip }`, `encodeCursor(value)` / `decodeCursor(encoded)`, `buildPageResponse({ items, limit, nextCursor, hasMore, total?, page? })`. |
| **dedupe.ts** | In-flight request deduplication. `dedupeInFlight(key, fn)` – concurrent calls with the same key share one promise and all get the same result. Key is cleared when the promise settles. |
| **response.ts** | `cacheControlHeaders(preset)` (no-store, short, medium, long, public-medium), `leanObject(obj)`, `pickFields(obj, keys)` for smaller payloads. |

---

## Improvements Applied

### Response size

- **Cache-Control** added or standardized on list endpoints so clients and CDNs can cache when appropriate (e.g. `sports/news`, `discover/orphans`, `bracket/feed`).
- **Lean responses**: `response.ts` provides `leanObject` and `pickFields` for endpoints that want to trim nulls or restrict fields. Applied where useful; list endpoints return only needed fields (e.g. bracket feed maps to a fixed shape).

### Redundant calls

- **Draft session GET** (`/api/leagues/[leagueId]/draft/session`): Shared league data (snapshot, UI settings, orphan roster IDs) is loaded once per league via `dedupeInFlight('draft:session:' + leagueId, ...)`. Concurrent polls for the same league reuse the same backend work; `currentUserRosterId` is still computed per user after the dedupe.
- **News**: When `refresh` is not set, identical requests (same query) are served from the in-memory cache for 30s, reducing duplicate DB/sync work.

### Endpoint efficiency

- **Sports news**: Cursor-based pagination (`?limit=&cursor=`). Fetches `limit+1` to detect `hasMore` and returns `nextCursor` (encoded `publishedAt`). Avoids over-fetching and supports stable paging.
- **Bracket feed**: Returns `nextCursor` and `limit`; supports `cursor` in addition to existing `before`. Uses `take: limit+1` and slices to compute `hasMore` and next cursor.
- **Discover orphans**: Uses `parseOffsetPageParams` for `page`/`limit`/`skip` and returns `pagination: { page, limit, total, hasMore }`. Response uses `cacheControlHeaders('medium')`.

---

## Caching (in-memory; Redis-ready)

- **Where**: GET `/api/sports/news` (when `refresh` is not set). Key = method + path + sorted query (excluding `refresh`, `_t`). TTL = 30s.
- **Interface**: `getApiCached` / `setApiCached` in `lib/api-performance/cache.ts`. Storage is in-memory; the module can be extended with a Redis (or similar) adapter that implements the same get/set contract.

---

## Pagination

- **Cursor-based**: Used on **sports/news** and **bracket/feed**. Query params: `limit`, `cursor`. Response includes `nextCursor`, `hasMore`, `limit`. Cursor is base64url-encoded (e.g. timestamp or id).
- **Offset-based**: Used on **discover/orphans**. Query params: `page`, `limit`. Response includes `pagination: { page, limit, total, hasMore }`.
- Helpers live in `lib/api-performance/pagination.ts` so other list endpoints can use the same patterns.

---

## Request deduplication

- **Where**: GET `/api/leagues/[leagueId]/draft/session`. Key = `draft:session:${leagueId}`. The shared work (buildSessionSnapshot, getDraftUISettingsForLeague, getOrphanRosterIdsForLeague) runs once per key while in flight; each request still gets the correct `currentUserRosterId` for the authenticated user.
- **Mechanism**: `dedupeInFlight(key, fn)` in `lib/api-performance/dedupe.ts`. Other heavy GETs (e.g. league config, draft events) can use the same helper with a stable key.

---

## Files Touched

| Path | Change |
|------|--------|
| `lib/api-performance/cache.ts` | New. In-memory HTTP response cache and key builder. |
| `lib/api-performance/pagination.ts` | New. Cursor/offset parsing and page response builder. |
| `lib/api-performance/dedupe.ts` | New. In-flight deduplication by key. |
| `lib/api-performance/response.ts` | New. Cache-Control and lean payload helpers. |
| `lib/api-performance/index.ts` | New. Re-exports. |
| `app/api/sports/news/route.ts` | Cursor pagination, response cache (30s), Cache-Control. |
| `app/api/bracket/feed/route.ts` | Cursor support, `nextCursor`, `limit`; take+1 for hasMore. |
| `app/api/leagues/[leagueId]/draft/session/route.ts` | Dedupe shared league data per leagueId. |
| `app/api/discover/orphans/route.ts` | Offset pagination (page/limit), `pagination` in response, Cache-Control. |
| `docs/PROMPT315_API_PERFORMANCE_OPTIMIZATION.md` | This deliverable. |

---

## Using the layer on other endpoints

1. **Caching**: For a GET handler, build `key = buildApiCacheKey('GET', request.url, { excludeParams: ['refresh'] })`, call `getApiCached(key)`; if hit, return cached body with `X-Cache: HIT`. After computing the response, call `setApiCached(key, body, { ttlMs })`.
2. **Cursor pagination**: Call `parseCursorPageParams(req)`, use `cursor` in your Prisma `where` (e.g. `createdAt: { lt: decodeCursor(cursor) }`), fetch `limit+1`, set `nextCursor` from the last item and `hasMore = items.length > limit`.
3. **Offset pagination**: Call `parseOffsetPageParams(req)`, use `skip` and `limit` in your query, return `pagination: { page, limit, total, hasMore }`.
4. **Deduplication**: Wrap the expensive part in `dedupeInFlight(uniqueKey, async () => { ... })` so concurrent requests with the same key share one execution.
5. **Response headers**: Use `cacheControlHeaders('short' | 'medium' | 'long')` for cacheable list or config responses.

---

## Summary

- **Response size**: Consistent Cache-Control and optional lean payload helpers.
- **Redundant calls**: Draft session shared data deduped per league; news responses cached for 30s.
- **Endpoint efficiency**: Cursor pagination on news and bracket feed; offset pagination on discover orphans; take+1 and nextCursor for list endpoints.
- **Caching**: In-memory response cache with TTL and key from URL; structure allows a Redis (or similar) backend later.
- **Pagination**: Cursor and offset helpers and standard response shape.
- **Request deduplication**: In-flight dedupe for draft session; reusable for other heavy GETs.
