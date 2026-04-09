---
title: Why Foreign Keys Are Stripped from Supabase DDL
impact: HIGH
impactDescription: Avoids migration ordering issues and FK lock contention on live databases
tags: prisma, foreign-keys, supabase, referential-integrity, philosophy
---

## Why Foreign Keys Are Stripped from Supabase DDL

The AllFantasy project intentionally removes all FOREIGN KEY / REFERENCES constraints from Supabase DDL. The `build-supabase-alter-all.mjs` script drops all `AddForeignKey` statements and strips `REFERENCES` clauses from `CREATE TABLE`.

**What the build script does:**

```javascript
// Drops all AddForeignKey chunks entirely
const fks = chunks.filter((c) => c.kind === "AddForeignKey");
void fks; // Intentionally unused — FK statements are discarded

// Strips REFERENCES from CREATE TABLE
function stripReferencesFromCreateTable(sql) {
  return sql.replace(
    /\s+REFERENCES\s+"[^"]+"\s*\([^)]+\)(\s+ON\s+DELETE\s+\w+)?(\s+ON\s+UPDATE\s+\w+)?/gi,
    ""
  );
}
```

**Why this decision was made:**

1. **Migration ordering**: FKs require referenced tables to exist first. With 100+ tables, ordering is fragile. Without FKs, tables can be created in any order.

2. **Lock contention**: Adding FKs acquires locks on both tables. On a live database with traffic, this can cause timeouts.

3. **Prisma enforces at ORM level**: Prisma validates relations in application code before queries reach the database. The ORM layer provides the integrity guarantee.

4. **Supabase console management**: FKs that are needed can be added manually via the Supabase Dashboard where the impact is visible.

**How referential integrity is maintained without DB FKs:**

```
Prisma Schema (source of truth)
  → Defines relations between models
  → Generates typed client that enforces relations
  → Application code cannot create orphan records via Prisma

Supabase (data store)
  → No FK constraints
  → Relies on application-level enforcement
  → FKs can be added manually if needed for specific tables
```

**When to add FKs manually in Supabase:**

| Scenario | Add FK? | Reason |
|----------|---------|--------|
| High-integrity financial data | Yes | Belt-and-suspenders safety |
| Cascade deletes needed | Yes | Application-level cascades are error-prone |
| Performance-critical joins | No | Indexes provide the same speed benefit |
| Tables with 100+ related tables | No | FK maintenance overhead is high |
| Development / rapid iteration | No | FKs slow down schema changes |

**Adding a FK manually via Supabase SQL Editor:**

```sql
-- Only when explicitly needed for a specific table pair
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'league_members_league_id_fkey'
  ) THEN
    ALTER TABLE "league_members"
    ADD CONSTRAINT "league_members_league_id_fkey"
    FOREIGN KEY ("league_id") REFERENCES "leagues" ("id")
    ON DELETE CASCADE;
  END IF;
END $$;
```

**Build script stats:** The current schema has ~362 FK statements that are intentionally dropped during export.

Reference: [PostgreSQL Foreign Keys](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-FK)
