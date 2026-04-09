---
title: Plan Rollback Strategies for Migrations
impact: MEDIUM
impactDescription: Recovery from failed or unwanted migrations without data loss
tags: migration, rollback, revert, down-migration, safety
---

## Plan Rollback Strategies for Migrations

Supabase does not have built-in rollback. Every migration should document its reverse operation, and some operations are inherently irreversible.

**Reversible operations (safe to undo):**

```sql
-- UP: Add a column
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "trade_deadline" TIMESTAMPTZ;

-- DOWN: Drop the column (loses data!)
ALTER TABLE "leagues" DROP COLUMN IF EXISTS "trade_deadline";
```

```sql
-- UP: Add an index
CREATE INDEX IF NOT EXISTS "leagues_sport_idx" ON "leagues" ("sport");

-- DOWN: Drop the index
DROP INDEX IF EXISTS "leagues_sport_idx";
```

```sql
-- UP: Create a table
CREATE TABLE IF NOT EXISTS "audit_log" ( ... );

-- DOWN: Drop the table (loses all data!)
DROP TABLE IF EXISTS "audit_log";
```

**Irreversible operations (cannot undo cleanly):**

```sql
-- Adding enum values CANNOT be reversed
ALTER TYPE "LeagueSport" ADD VALUE IF NOT EXISTS 'SOCCER';
-- No ALTER TYPE REMOVE VALUE exists in PostgreSQL

-- Data type changes that lose precision
ALTER TABLE "scores" ALTER COLUMN "points" TYPE INTEGER;
-- Cannot restore DECIMAL precision after truncation

-- Dropping a column with data
ALTER TABLE "users" DROP COLUMN "legacy_id";
-- Data is gone unless you backed it up first
```

**Safe rollback pattern — paired scripts:**

```sql
-- migrations/20260401_add_trade_features.sql
-- ROLLBACK: Run migrations/rollback/20260401_add_trade_features_down.sql

CREATE TABLE IF NOT EXISTS "trade_vetoes" (
  "id" TEXT NOT NULL,
  "trade_id" TEXT NOT NULL,
  "voter_id" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "trade_vetoes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "trade_vetoes_trade_id_idx" ON "trade_vetoes" ("trade_id");
```

```sql
-- rollback/20260401_add_trade_features_down.sql
DROP INDEX IF EXISTS "trade_vetoes_trade_id_idx";
DROP TABLE IF EXISTS "trade_vetoes";
```

**Pre-migration safety checklist:**

1. Back up the table before destructive changes: `CREATE TABLE "leagues_backup" AS SELECT * FROM "leagues";`
2. Test the migration on a branch database first (Supabase branching)
3. Document the rollback SQL in a comment at the top of the migration
4. For data migrations, always verify row counts before and after

Reference: [Supabase Branching](https://supabase.com/docs/guides/deployment/branching)
