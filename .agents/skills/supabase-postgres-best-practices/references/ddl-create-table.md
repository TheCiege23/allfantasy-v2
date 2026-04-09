---
title: Create Tables with Idempotent DDL
impact: HIGH
impactDescription: Safe re-runnable migrations, zero downtime schema changes
tags: ddl, create-table, idempotent, migration, schema
---

## Create Tables with Idempotent DDL

Tables must be created with `IF NOT EXISTS` so migrations and scripts can be safely re-run against any environment without failure.

**Minimal (missing safety guards):**

```sql
-- Will fail if table already exists
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  total DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Production-ready (idempotent, Supabase-compatible):**

```sql
CREATE TABLE IF NOT EXISTS "orders" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "total" DECIMAL(10, 2),
  "status" TEXT NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- Enable RLS immediately after creation
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;
```

**AllFantasy convention:**

```sql
-- TEXT primary keys with app-generated cuid() (Prisma @default(cuid()))
-- No REFERENCES / FOREIGN KEY constraints (managed externally in Supabase console)
-- TIMESTAMPTZ for all date/time columns (not TIMESTAMP)
-- Double-quoted identifiers for Prisma compatibility
-- Named constraints (tablename_pkey, tablename_field_key)
CREATE TABLE IF NOT EXISTS "league_settings" (
  "id" TEXT NOT NULL,
  "league_id" TEXT NOT NULL,
  "scoring_type" TEXT NOT NULL DEFAULT 'PPR',
  "roster_size" INTEGER NOT NULL DEFAULT 15,
  "trade_deadline" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "league_settings_pkey" PRIMARY KEY ("id")
);
```

Note: `IF NOT EXISTS` only prevents failure if the table already exists. It does NOT add missing columns to an existing table. Use `ALTER TABLE ADD COLUMN IF NOT EXISTS` separately for that (see `ddl-alter-table-columns.md`).

Reference: [CREATE TABLE](https://www.postgresql.org/docs/current/sql-createtable.html)
