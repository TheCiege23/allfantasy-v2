---
title: Use Ensure Scripts for Incremental Schema Patches
impact: HIGH
impactDescription: Targeted column additions without full migration overhead
tags: migration, ensure-script, incremental, patch, sql-editor
---

## Use Ensure Scripts for Incremental Schema Patches

When Prisma adds columns that `CREATE TABLE IF NOT EXISTS` skips (because the table already exists), use standalone ensure scripts to bring existing tables up to date.

**Problem:**

```sql
-- CREATE TABLE IF NOT EXISTS won't add "sport" if "leagues" already exists
CREATE TABLE IF NOT EXISTS "leagues" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sport" TEXT NOT NULL DEFAULT 'NFL',  -- This column is silently skipped!
  CONSTRAINT "leagues_pkey" PRIMARY KEY ("id")
);
```

**Solution — ensure script:**

```sql
-- supabase_ensure_sport_columns.sql
-- Run via Supabase SQL Editor after deploying new Prisma schema
-- Safe to re-run: all operations are idempotent

ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "sport" TEXT NOT NULL DEFAULT 'NFL';
ALTER TABLE "draft_picks" ADD COLUMN IF NOT EXISTS "sport" TEXT NOT NULL DEFAULT 'NFL';
ALTER TABLE "trade_offers" ADD COLUMN IF NOT EXISTS "sport" TEXT NOT NULL DEFAULT 'NFL';
ALTER TABLE "roster_slots" ADD COLUMN IF NOT EXISTS "sport" TEXT NOT NULL DEFAULT 'NFL';
```

**When to use ensure scripts vs formal migrations:**

| Scenario | Use |
|----------|-----|
| Adding a column to many tables at once | Ensure script (run in SQL Editor) |
| Schema change tracked in Supabase CLI | Formal migration file |
| Prisma schema changed, need Supabase to catch up | Ensure script |
| One-off structural change (new table, new enum) | Formal migration |
| Emergency production fix | Ensure script (fastest path) |

**AllFantasy convention:**

Ensure scripts live in the project root (not `supabase/migrations/`):

```
supabase_ensure_sport_columns.sql         -- Adds "sport" to 68 tables
supabase_ensure_sport_type_columns.sql    -- Adds "sport_type" to 14 tables
supabase_ensure_user_profile_rank_columns.sql  -- Adds ranking/XP columns
supabase_ensure_auto_coach_settings.sql   -- Creates auto_coach_settings table
```

**Template for a new ensure script:**

```sql
-- supabase_ensure_[feature]_columns.sql
-- Purpose: [what this adds and why]
-- Safe to re-run: YES
-- Run via: Supabase SQL Editor

-- Table: "[table_name]"
ALTER TABLE "[table_name]" ADD COLUMN IF NOT EXISTS "[column]" [TYPE] [DEFAULT];
```

Reference: [ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
