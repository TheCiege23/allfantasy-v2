---
title: Prisma-to-Supabase Export Workflow
impact: HIGH
impactDescription: Automated idempotent DDL generation from Prisma schema for Supabase deployment
tags: prisma, supabase, export, build-script, migration, workflow
---

## Prisma-to-Supabase Export Workflow

The project generates Supabase-compatible DDL from the Prisma schema using `scripts/build-supabase-alter-all.mjs`. This creates a single idempotent SQL file that can be run against any Supabase database.

**How it works:**

```bash
# 1. Make changes to prisma/schema.prisma
# 2. Run the build script
node scripts/build-supabase-alter-all.mjs

# 3. Output: supabase_alter_all.sql (re-runnable, idempotent)
```

**What the script does internally:**

```bash
# Generates raw SQL diff from empty to current schema
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
```

Then processes the output into 4 strict sections:

```sql
-- SECTION 1 — CREATE TYPE IF NOT EXISTS
CREATE TYPE IF NOT EXISTS "LeagueSport" AS ENUM ('NFL', 'NBA', 'MLB', 'NHL');
CREATE TYPE IF NOT EXISTS "TradeOfferMode" AS ENUM ('STANDARD', 'BLIND');

-- SECTION 2 — CREATE TABLE IF NOT EXISTS
-- Foreign key REFERENCES are stripped from all CREATE TABLE statements
CREATE TABLE IF NOT EXISTS "leagues" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sport" TEXT NOT NULL DEFAULT 'NFL',
  CONSTRAINT "leagues_pkey" PRIMARY KEY ("id")
);

-- SECTION 3 — ALTER TABLE ADD COLUMN IF NOT EXISTS
-- Ensures columns exist on tables that were already created
-- Table: "leagues"
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "sport" TEXT NOT NULL DEFAULT 'NFL';

-- SECTION 4 — CREATE INDEX IF NOT EXISTS
CREATE INDEX IF NOT EXISTS "leagues_sport_idx" ON "leagues" ("sport");
CREATE UNIQUE INDEX IF NOT EXISTS "leagues_slug_key" ON "leagues" ("slug");
```

**Why this order matters:**

1. Types must exist before tables can reference them
2. Tables must exist before columns can be altered
3. Columns must exist before indexes can be created
4. Foreign keys are intentionally omitted (see `prisma-no-foreign-keys.md`)

**When to run the export:**

| Event | Action |
|-------|--------|
| Added a new Prisma model | Run `build-supabase-alter-all.mjs` |
| Added a field to a model | Run script + create ensure script if table exists |
| Added a new enum | Run script |
| Changed a default value | Run script (but ALTER won't change existing defaults) |
| Renamed a field | Manual migration needed (script can't detect renames) |

Reference: [Prisma Migrate Diff](https://www.prisma.io/docs/orm/reference/prisma-cli-reference#migrate-diff)
