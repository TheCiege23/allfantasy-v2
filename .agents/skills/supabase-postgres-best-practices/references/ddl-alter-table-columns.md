---
title: Add Columns Safely with ALTER TABLE
impact: HIGH
impactDescription: Zero-downtime column additions, idempotent ensure scripts
tags: ddl, alter-table, add-column, idempotent, migration
---

## Add Columns Safely with ALTER TABLE

When adding columns to existing tables, use `ADD COLUMN IF NOT EXISTS` (PostgreSQL 9.6+) to make the operation idempotent and safe to re-run.

**Minimal (fails if column exists):**

```sql
-- Will error: column "sport" already exists
ALTER TABLE "leagues" ADD COLUMN "sport" TEXT;
```

**Production-ready (idempotent):**

```sql
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "sport" TEXT NOT NULL DEFAULT 'NFL';
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "sport_type" TEXT;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "season_year" INTEGER;
```

**AllFantasy convention — ensure scripts:**

The project uses standalone `supabase_ensure_*.sql` files to patch columns across many tables at once. These are run via Supabase SQL Editor when needed:

```sql
-- supabase_ensure_sport_columns.sql
-- Adds "sport" column to all tables that need it

ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "sport" TEXT NOT NULL DEFAULT 'NFL';
ALTER TABLE "draft_picks" ADD COLUMN IF NOT EXISTS "sport" TEXT NOT NULL DEFAULT 'NFL';
ALTER TABLE "trade_offers" ADD COLUMN IF NOT EXISTS "sport" TEXT NOT NULL DEFAULT 'NFL';
ALTER TABLE "roster_slots" ADD COLUMN IF NOT EXISTS "sport" TEXT NOT NULL DEFAULT 'NFL';
-- ... repeat for all tables needing the column
```

**Multiple columns on one table (grouped for clarity):**

```sql
-- Table: "user_profiles"
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "rank_score" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "xp_total" INTEGER DEFAULT 0;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "rank_tier" TEXT DEFAULT 'bronze';
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "rank_updated_at" TIMESTAMPTZ;
```

Important: `ADD COLUMN IF NOT EXISTS` acquires an `ACCESS EXCLUSIVE` lock briefly. For very high-traffic tables, consider adding columns during low-traffic periods.

Reference: [ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
