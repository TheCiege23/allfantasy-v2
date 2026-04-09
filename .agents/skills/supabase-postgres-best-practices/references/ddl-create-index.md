---
title: Create Indexes Safely with IF NOT EXISTS
impact: HIGH
impactDescription: Idempotent index creation, optional CONCURRENTLY for zero-lock builds
tags: ddl, create-index, concurrently, idempotent, migration
---

## Create Indexes Safely with IF NOT EXISTS

Indexes should always use `IF NOT EXISTS` in migrations to prevent failures on re-run. For production tables with active traffic, use `CONCURRENTLY` to avoid blocking writes.

**Minimal (fails on re-run, blocks writes):**

```sql
-- Will error if index exists. Also holds ACCESS EXCLUSIVE lock during build.
CREATE INDEX leagues_sport_idx ON "leagues" ("sport");
```

**Production-ready (idempotent):**

```sql
CREATE INDEX IF NOT EXISTS "leagues_sport_idx" ON "leagues" ("sport");
CREATE UNIQUE INDEX IF NOT EXISTS "leagues_slug_key" ON "leagues" ("slug");
```

**Production-ready (non-blocking for live tables):**

```sql
-- CONCURRENTLY avoids locking the table during index build
-- Cannot be used inside a transaction block
CREATE INDEX CONCURRENTLY IF NOT EXISTS "leagues_sport_idx"
  ON "leagues" ("sport");
```

**AllFantasy convention:**

```sql
-- Index naming: tablename_column(s)_idx or tablename_column_key for unique
-- Created in Section 4 of supabase_alter_all.sql (after tables and columns)
CREATE INDEX IF NOT EXISTS "trade_offers_league_id_idx" ON "trade_offers" ("league_id");
CREATE INDEX IF NOT EXISTS "draft_picks_league_id_round_idx" ON "draft_picks" ("league_id", "round");
CREATE UNIQUE INDEX IF NOT EXISTS "user_profiles_email_key" ON "user_profiles" ("email");
```

**When to use CONCURRENTLY vs standard:**

| Scenario | Use |
|----------|-----|
| Initial migration / empty table | Standard (faster) |
| Production table with traffic | CONCURRENTLY (no locks) |
| Inside a transaction block | Standard (CONCURRENTLY not allowed) |
| Supabase migration file | Standard (runs in transaction) |
| Supabase SQL Editor one-off | CONCURRENTLY (preferred) |

Note: `CREATE INDEX CONCURRENTLY` can fail partway through, leaving an invalid index. Check with:

```sql
SELECT indexrelid::regclass, indisvalid
FROM pg_index
WHERE NOT indisvalid;

-- Drop invalid index and retry
DROP INDEX CONCURRENTLY IF EXISTS "leagues_sport_idx";
```

Reference: [CREATE INDEX](https://www.postgresql.org/docs/current/sql-createindex.html)
