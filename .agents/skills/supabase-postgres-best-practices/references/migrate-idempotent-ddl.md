---
title: Write Idempotent Migrations with IF NOT EXISTS
impact: HIGH
impactDescription: Safe re-runnable migrations across all environments
tags: migration, idempotent, if-not-exists, do-block, transaction
---

## Write Idempotent Migrations with IF NOT EXISTS

Every DDL statement in a migration should be safe to run multiple times. This prevents failures when migrations are re-applied or when environments drift.

**Minimal (fails on second run):**

```sql
CREATE TYPE "LeagueSport" AS ENUM ('NFL', 'NBA');
CREATE TABLE "leagues" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL
);
CREATE INDEX "leagues_name_idx" ON "leagues" ("name");
```

**Production-ready (fully idempotent):**

```sql
-- 1. Types
CREATE TYPE IF NOT EXISTS "LeagueSport" AS ENUM ('NFL', 'NBA');

-- 2. Tables
CREATE TABLE IF NOT EXISTS "leagues" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  CONSTRAINT "leagues_pkey" PRIMARY KEY ("id")
);

-- 3. Column additions (for tables that may already exist)
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "sport" TEXT NOT NULL DEFAULT 'NFL';
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS "leagues_name_idx" ON "leagues" ("name");
CREATE INDEX IF NOT EXISTS "leagues_sport_idx" ON "leagues" ("sport");
```

**DO blocks for operations lacking IF NOT EXISTS:**

```sql
-- Adding constraints (PostgreSQL lacks ADD CONSTRAINT IF NOT EXISTS)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'leagues_slug_unique'
  ) THEN
    ALTER TABLE "leagues" ADD CONSTRAINT "leagues_slug_unique" UNIQUE ("slug");
  END IF;
END $$;

-- Creating functions
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Creating triggers
DROP TRIGGER IF EXISTS "set_updated_at" ON "leagues";
CREATE TRIGGER "set_updated_at"
  BEFORE UPDATE ON "leagues"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

**AllFantasy convention — 4-section ordering:**

The `build-supabase-alter-all.mjs` script outputs migrations in strict order:
1. `CREATE TYPE IF NOT EXISTS` (enums)
2. `CREATE TABLE IF NOT EXISTS` (no FK references)
3. `ALTER TABLE ADD COLUMN IF NOT EXISTS` (grouped by table)
4. `CREATE INDEX IF NOT EXISTS`

This ordering ensures types exist before tables reference them, and tables exist before columns are added.

Reference: [Supabase Migrations](https://supabase.com/docs/guides/cli/managing-environments)
