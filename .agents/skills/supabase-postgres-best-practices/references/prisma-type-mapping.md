---
title: Prisma to PostgreSQL Type Mapping Reference
impact: HIGH
impactDescription: Correct type translation when writing Supabase SQL from Prisma models
tags: prisma, postgres, types, mapping, schema
---

## Prisma to PostgreSQL Type Mapping Reference

When writing Supabase SQL from Prisma models, use this mapping to ensure types match. Mismatches cause migration failures or silent data truncation.

**Core type mapping:**

| Prisma Type | PostgreSQL Type | Notes |
|-------------|----------------|-------|
| `String` | `TEXT` | Not VARCHAR — TEXT is preferred in Postgres |
| `Int` | `INTEGER` | 32-bit signed |
| `BigInt` | `BIGINT` | 64-bit signed |
| `Float` | `DOUBLE PRECISION` | 64-bit floating point |
| `Decimal` | `DECIMAL(65,30)` | Prisma default precision |
| `Boolean` | `BOOLEAN` | |
| `DateTime` | `TIMESTAMP(3)` | Millisecond precision by default |
| `Json` | `JSONB` | Binary JSON, indexable |
| `Bytes` | `BYTEA` | Binary data |

**Array types:**

| Prisma Type | PostgreSQL Type |
|-------------|----------------|
| `String[]` | `TEXT[]` |
| `Int[]` | `INTEGER[]` |
| `Float[]` | `DOUBLE PRECISION[]` |
| `Boolean[]` | `BOOLEAN[]` |

**Default value mapping:**

| Prisma Default | PostgreSQL Default |
|----------------|-------------------|
| `@default(cuid())` | No DB default (app-generated) |
| `@default(uuid())` | No DB default (app-generated) |
| `@default(now())` | `DEFAULT CURRENT_TIMESTAMP` |
| `@default(autoincrement())` | `SERIAL` / `GENERATED ALWAYS AS IDENTITY` |
| `@default(true)` | `DEFAULT true` |
| `@default("value")` | `DEFAULT 'value'` |
| `@default(0)` | `DEFAULT 0` |

**Relation fields (no column in SQL):**

```prisma
// Prisma relation field — does NOT create a column
model League {
  members LeagueMember[]  // Virtual relation, no column
}

// Foreign key field — DOES create a column
model LeagueMember {
  league_id String  // This becomes a TEXT column
  league    League  @relation(fields: [league_id], references: [id])
}
```

**AllFantasy convention — TIMESTAMPTZ over TIMESTAMP:**

```sql
-- Prisma generates TIMESTAMP(3) but project prefers TIMESTAMPTZ
-- Ensure scripts and manual migrations should use:
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Not the Prisma default:
-- ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
```

**Enum mapping:**

```prisma
// Prisma enum
enum LeagueSport {
  NFL
  NBA
  MLB
  NHL
}
```

```sql
-- Becomes PostgreSQL enum type
CREATE TYPE IF NOT EXISTS "LeagueSport" AS ENUM ('NFL', 'NBA', 'MLB', 'NHL');
```

Reference: [Prisma Schema Reference](https://www.prisma.io/docs/orm/reference/prisma-schema-reference)
