# PROMPT 312 — Database Optimization (PostgreSQL / Neon)

## Objective

Optimize PostgreSQL (Neon) performance: slow queries, missing indexes, inefficient joins, repeated queries, N+1 issues; then indexing strategy, query batching, and caching.

---

## 1. Checks performed

| Check | Finding |
|-------|--------|
| **Slow queries** | Leaderboard draft-grade resolution and profile-stats rankings were doing one query per grade / per league; upstream-apis did one `playerSeasonStats` query per player. Addressed by batching. |
| **Missing indexes** | `LegacyRoster` had no index on `ownerId` (used by weekly recap and leaderboards). `PlayerSeasonStats` lacked composite for `(sport, playerId, source, seasonType)`. `League` lacked `(userId, updatedAt)` for profile stats `orderBy updatedAt`. Added. |
| **Inefficient joins** | N/A (Prisma relation loads; batching avoids repeated lookups). |
| **Repeated queries** | Leaderboard: same `(leagueId, rosterId)` resolved many times — now batch-resolved. Profile stats: per-league roster/team resolution — now batched. |
| **N+1 issues** | **Platform leaderboards:** `resolveManagerIdForDraftGrade` called per unique grade key → replaced with `batchResolveDraftGradeManagers`. **Profile stats:** `getMyRosterOrTeamIdsInLeague` per league → replaced with `batchGetMyRosterOrTeamIdsByLeague` + single `draftGrade.findMany` for all leagues. **Upstream-apis:** `playerSeasonStats.findFirst` per player in `fetchRollingInsights` → one `findMany` + map by `playerId`. |

---

## 2. Index plan (schema changes)

Applied in `prisma/schema.prisma`:

| Model | Index | Purpose |
|-------|--------|--------|
| **LegacyRoster** | `@@index([ownerId])` | Lookups by owner (weekly recap, leaderboard resolution). |
| **LegacyRoster** | `@@index([leagueId, ownerId])` | Composite for “my roster in this league”. |
| **PlayerSeasonStats** | `@@index([sport, playerId, source, seasonType])` | Batch “latest stats per player” for rolling insights. |
| **League** | `@@index([userId, updatedAt])` | Profile stats: user’s leagues ordered by `updatedAt`. |

**Migration:** Run `npx prisma migrate dev --name add_perf_indexes` (or add to existing migration) so Neon applies the new indexes.

---

## 3. Optimized queries (code changes)

### 3.1 Platform leaderboards (`lib/platform-leaderboards/PlatformLeaderboardsService.ts`)

- **Before:** For each unique `(leagueId, rosterId)` in draft grades, called `resolveManagerIdForDraftGrade` (up to 4 queries per key).
- **After:** `batchResolveDraftGradeManagers(keys)`:
  - One `League.findMany` by ids.
  - One `Roster.findMany` with `OR` on (leagueId, id) for app leagues.
  - One `LeagueTeam.findMany` for unresolved; one `LegacyRoster.findMany` by legacy roster ids.
  - For legacy leagues: one `LegacyLeague.findMany` by sleeper ids; one `LegacyRoster.findMany` with `OR` on (leagueId, rosterId).
- **Effect:** Constant number of round-trips (about 4–6) instead of O(unique grades).

### 3.2 Profile stats (`lib/profile-stats/ProfileStatsService.ts`)

- **Before:** For each user league, `getMyRosterOrTeamIdsInLeague` (up to 4 queries per league); then `draftGrade.findMany` per league.
- **After:**
  - `batchGetMyRosterOrTeamIdsByLeague(leagueIds, sleeperUserId)`: one `League.findMany`, one `Roster.findMany`, one `LegacyRoster.findMany` (by ownerId), one `LeagueTeam.findMany` (by legacyRosterId + leagueId).
  - Single `draftGrade.findMany` with `leagueId in` and `season in`, then filter in memory by “my” rosterIds per league.
- **Effect:** Fixed number of queries for leagues + one grades query instead of O(leagues) + O(leagues).

### 3.3 Rolling insights (`lib/upstream-apis.ts`)

- **Before:** For each `dbPlayers` row, one `playerSeasonStats.findFirst` (sport, playerId, source, seasonType, orderBy season desc).
- **After:** One `playerSeasonStats.findMany` with `playerId in [...]`, then in-memory “latest per player” (results already ordered by season desc; first occurrence per playerId kept).
- **Effect:** One query instead of N for N players.

---

## 4. Caching layer

| Layer | Location | Use |
|-------|----------|-----|
| **Engine snapshot** | `lib/engine/cache.ts` | `getCachedResult` / `setCachedResult` keyed by `(leagueId, type, contextHash)`; uses `EngineSnapshot` table. TTL from flags. Used for rankings, trade, simulation, waiver. |
| **In-memory (player media)** | `lib/player-media.ts` | `PLAYER_CACHE` (Map) for resolved player media; TTL-based. |
| **Recommendation** | Optional | For leaderboard “display names” or profile stats, consider short-lived in-memory cache (e.g. 60s) keyed by userId or managerIds to avoid repeated UserProfile/AppUser lookups on hot paths. Neon/Postgres already benefits from connection pooling and index usage. |

No new caching implementation was added in this deliverable; existing engine cache and player-media cache remain. Indexing and batching reduce load so that adding a Redis or in-memory layer is optional for future scaling.

---

## 5. Summary

- **Optimized queries:** Leaderboard draft-grade resolution (batched), profile-stats roster/team and draft grades (batched), rolling insights player stats (single findMany + map).
- **Index plan:** New indexes on `LegacyRoster` (ownerId, leagueId+ownerId), `PlayerSeasonStats` (sport, playerId, source, seasonType), `League` (userId, updatedAt).
- **Merged DB improvements:** Schema index changes and the three code optimizations above are the merged DB improvements. Run Prisma migrate to apply indexes; no breaking API or behavior changes.
