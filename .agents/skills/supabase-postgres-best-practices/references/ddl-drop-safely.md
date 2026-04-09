---
title: Drop Objects Safely with IF EXISTS
impact: MEDIUM
impactDescription: Safe cleanup without errors, controlled CASCADE for dependencies
tags: ddl, drop, if-exists, cascade, migration
---

## Drop Objects Safely with IF EXISTS

Always use `IF EXISTS` when dropping objects to prevent migration failures. Understand CASCADE implications before using it.

**Minimal (fails if object missing):**

```sql
-- Will error: table "temp_import" does not exist
DROP TABLE "temp_import";
```

**Production-ready (idempotent):**

```sql
-- Safe to run even if object doesn't exist
DROP TABLE IF EXISTS "temp_import";
DROP INDEX IF EXISTS "temp_import_batch_idx";
DROP TYPE IF EXISTS "TempStatus";
```

**CASCADE — use with extreme caution:**

```sql
-- CASCADE drops all dependent objects (views, FKs, policies, etc.)
-- Only use when you understand ALL dependencies
DROP TABLE IF EXISTS "old_leagues" CASCADE;

-- Check dependencies before dropping:
SELECT
  dependent_ns.nspname AS dependent_schema,
  dependent_view.relname AS dependent_view
FROM pg_depend
JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid
JOIN pg_class AS dependent_view ON pg_rewrite.ev_class = dependent_view.oid
JOIN pg_namespace AS dependent_ns ON dependent_view.relnamespace = dependent_ns.oid
WHERE pg_depend.refobjid = '"leagues"'::regclass;
```

**Dropping columns:**

```sql
-- PostgreSQL has no DROP COLUMN IF EXISTS — use DO block
DO $$ BEGIN
  ALTER TABLE "leagues" DROP COLUMN "deprecated_field";
EXCEPTION
  WHEN undefined_column THEN NULL;
END $$;
```

**Dropping indexes without blocking (production):**

```sql
-- CONCURRENTLY avoids locking the table
DROP INDEX CONCURRENTLY IF EXISTS "leagues_old_idx";
```

**AllFantasy convention:**

The project avoids foreign key constraints in Supabase, so CASCADE is rarely needed for table drops. When cleaning up:

```sql
-- Drop RLS policies before dropping tables
DROP POLICY IF EXISTS "leagues_user_policy" ON "leagues";

-- Drop the table
DROP TABLE IF EXISTS "leagues";

-- Drop orphaned indexes (auto-dropped with table, but explicit is safer for partial schemas)
DROP INDEX IF EXISTS "leagues_sport_idx";
```

Reference: [DROP TABLE](https://www.postgresql.org/docs/current/sql-droptable.html)
