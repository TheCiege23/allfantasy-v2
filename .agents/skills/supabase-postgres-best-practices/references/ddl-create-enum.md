---
title: Create and Modify Enums Safely
impact: HIGH
impactDescription: Idempotent type creation, safe value additions without downtime
tags: ddl, enum, create-type, alter-type, migration
---

## Create and Modify Enums Safely

PostgreSQL enums require special handling because `CREATE TYPE` fails if the type exists, and `ALTER TYPE ADD VALUE` cannot run inside a transaction.

**Minimal (fails on re-run):**

```sql
-- Will error: type "LeagueSport" already exists
CREATE TYPE "LeagueSport" AS ENUM ('NFL', 'NBA', 'MLB');
```

**Production-ready — CREATE TYPE IF NOT EXISTS (PostgreSQL 15+):**

```sql
-- PostgreSQL 15+ supports IF NOT EXISTS
CREATE TYPE IF NOT EXISTS "LeagueSport" AS ENUM ('NFL', 'NBA', 'MLB', 'NHL');
```

**Production-ready — DO block (PostgreSQL < 15):**

```sql
DO $$ BEGIN
    CREATE TYPE "LeagueSport" AS ENUM ('NFL', 'NBA', 'MLB', 'NHL');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
```

**Adding values to an existing enum:**

```sql
-- ADD VALUE IF NOT EXISTS (PostgreSQL 12+) — safe to re-run
ALTER TYPE "LeagueSport" ADD VALUE IF NOT EXISTS 'SOCCER';
ALTER TYPE "LeagueSport" ADD VALUE IF NOT EXISTS 'NCAAF';
ALTER TYPE "LeagueSport" ADD VALUE IF NOT EXISTS 'NCAAB';
```

**Gotchas:**

- `ALTER TYPE ADD VALUE` cannot run inside a `BEGIN ... COMMIT` transaction block. Supabase migrations run each file as a transaction by default, so wrap enum additions in their own migration file or use `SET LOCAL` to handle this.
- Enum values cannot be removed or renamed. To remove a value, you must create a new type, migrate data, and swap.
- The project's `build-supabase-alter-all.mjs` uses `CREATE TYPE IF NOT EXISTS` (Section 1 of output).

**AllFantasy convention:**

```sql
-- Enums use PascalCase to match Prisma enum names
CREATE TYPE IF NOT EXISTS "FeedbackReason" AS ENUM (
  'SPAM', 'HARASSMENT', 'MISINFORMATION', 'OTHER'
);

CREATE TYPE IF NOT EXISTS "TradeOfferMode" AS ENUM (
  'STANDARD', 'BLIND', 'AUCTION'
);
```

Reference: [CREATE TYPE](https://www.postgresql.org/docs/current/sql-createtype.html)
