---
title: Write Ensure Scripts for Prisma-to-Supabase Column Sync
impact: HIGH
impactDescription: Bridges the gap when CREATE TABLE IF NOT EXISTS skips new columns
tags: prisma, ensure-script, column-sync, alter-table, supabase
---

## Write Ensure Scripts for Prisma-to-Supabase Column Sync

When Prisma adds a field to an existing model, `CREATE TABLE IF NOT EXISTS` won't add the new column because the table already exists. Ensure scripts explicitly add missing columns.

**The gap:**

```prisma
// Before: League model with 3 fields
model League {
  id   String @id @default(cuid())
  name String
}

// After: Added "sport" field
model League {
  id    String @id @default(cuid())
  name  String
  sport String @default("NFL")  // NEW — but Supabase table already exists
}
```

```sql
-- build-supabase-alter-all.mjs generates this, but the CREATE TABLE is skipped:
CREATE TABLE IF NOT EXISTS "leagues" ( ... "sport" TEXT ... );
-- ^^^ Table exists, so this entire statement is a no-op

-- Section 3 handles it:
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "sport" TEXT NOT NULL DEFAULT 'NFL';
-- ^^^ This works! But only if you run the full alter_all script.
```

**Creating a standalone ensure script:**

```sql
-- supabase_ensure_[feature].sql
-- Purpose: Add [feature] columns to existing tables
-- Generated from: prisma/schema.prisma diff
-- Safe to re-run: YES
-- Run via: Supabase SQL Editor > New Query > Paste > Run

-- ============================================================
-- Table: "leagues"
-- ============================================================
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "sport" TEXT NOT NULL DEFAULT 'NFL';
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "sport_type" TEXT;

-- ============================================================
-- Table: "draft_picks"
-- ============================================================
ALTER TABLE "draft_picks" ADD COLUMN IF NOT EXISTS "sport" TEXT NOT NULL DEFAULT 'NFL';

-- ============================================================
-- Table: "trade_offers"
-- ============================================================
ALTER TABLE "trade_offers" ADD COLUMN IF NOT EXISTS "sport" TEXT NOT NULL DEFAULT 'NFL';
```

**How to identify which columns need ensure scripts:**

```bash
# 1. Run the Prisma diff to see what changed
npx prisma migrate diff --from-migrations-directory prisma/migrations --to-schema-datamodel prisma/schema.prisma --script

# 2. Look for AddColumn / AlterColumn lines
# 3. Convert each to ALTER TABLE ADD COLUMN IF NOT EXISTS
```

**AllFantasy ensure script inventory:**

| Script | Purpose | Tables Affected |
|--------|---------|----------------|
| `supabase_ensure_sport_columns.sql` | Add multi-sport support | 68 tables |
| `supabase_ensure_sport_type_columns.sql` | Add sport type enum | 14 tables |
| `supabase_ensure_user_profile_rank_columns.sql` | Add ranking/XP system | 1 table |
| `supabase_ensure_auto_coach_settings.sql` | Create auto-coach table | 1 table (new) |

**Naming convention:** `supabase_ensure_[feature_name].sql` in the project root.

Reference: [Prisma Migrate Diff](https://www.prisma.io/docs/orm/reference/prisma-cli-reference#migrate-diff)
