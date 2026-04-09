---
name: supabase-postgres-best-practices
description: Supabase Postgres skill for creating tables, writing migrations, optimizing queries, and integrating with Supabase Auth, Realtime, and Storage. Use when writing SQL, designing schemas, creating migrations, or working with any Supabase platform feature.
license: MIT
metadata:
  author: supabase
  version: "1.2.0-allfantasy"
  organization: Supabase / AllFantasy
  date: April 2026
  abstract: Comprehensive Supabase Postgres guide covering schema creation (DDL), migration patterns, query optimization, Supabase Auth integration, platform features (Realtime, Storage, Edge Functions), and the Prisma-to-Supabase export workflow. Contains rules across 13 categories with actionable SQL examples for both creating new database objects and optimizing existing ones.
---

# Supabase Postgres Best Practices

Comprehensive guide for creating, modifying, and optimizing Postgres schemas on Supabase. Covers DDL patterns, migration workflows, query optimization, auth integration, and the Prisma-to-Supabase export pipeline.

## When to Apply

Reference these guidelines when:
- **Creating** new tables, enums, indexes, or constraints
- **Writing migrations** for Supabase (naming, idempotency, rollback)
- **Adding columns** to existing tables (ensure scripts)
- Writing SQL queries or designing schemas
- Implementing indexes or query optimization
- Reviewing database performance issues
- Configuring connection pooling or scaling
- **Setting up RLS policies** with Supabase Auth (`auth.uid()`)
- **Integrating** with Supabase Realtime, Storage, or Edge Functions
- **Exporting** Prisma schema changes to Supabase-compatible DDL
- Working with Row-Level Security (RLS)

## Rule Categories by Priority

| Priority | Category | Impact | Prefix |
|----------|----------|--------|--------|
| 1 | Query Performance | CRITICAL | `query-` |
| 2 | Connection Management | CRITICAL | `conn-` |
| 3 | Security & RLS | CRITICAL | `security-` |
| 4 | Schema Design | HIGH | `schema-` |
| 5 | Concurrency & Locking | MEDIUM-HIGH | `lock-` |
| 6 | Data Access Patterns | MEDIUM | `data-` |
| 7 | Monitoring & Diagnostics | LOW-MEDIUM | `monitor-` |
| 8 | Advanced Features | LOW | `advanced-` |
| 9 | DDL & Table Creation | HIGH | `ddl-` |
| 10 | Migration Patterns | HIGH | `migrate-` |
| 11 | Supabase Auth Integration | CRITICAL | `auth-` |
| 12 | Supabase Platform Features | MEDIUM | `supa-` |
| 13 | Prisma-to-Supabase Workflow | HIGH | `prisma-` |

## Project-Specific Patterns (AllFantasy)

- **Prisma-to-Supabase pipeline**: Schema is defined in Prisma, exported via `scripts/build-supabase-alter-all.mjs`
- **No foreign keys in Supabase**: FKs are stripped from DDL; Prisma enforces at ORM level (see `prisma-no-foreign-keys.md`)
- **Ensure scripts**: Standalone SQL files (`supabase_ensure_*.sql`) patch columns that `CREATE TABLE IF NOT EXISTS` skips
- **TEXT primary keys**: All tables use TEXT PKs with app-generated cuid() values
- **TIMESTAMPTZ**: All date columns use TIMESTAMPTZ (not TIMESTAMP)

## How to Use

Read individual rule files for detailed explanations and SQL examples:

```
# Optimization
references/query-missing-indexes.md
references/schema-partial-indexes.md

# Creation & Migration
references/ddl-create-table.md
references/migrate-idempotent-ddl.md
references/auth-rls-with-auth-uid.md

# Project workflow
references/prisma-export-workflow.md
references/prisma-ensure-scripts.md

# Category definitions
references/_sections.md
```

Each rule file contains:
- Brief explanation of why it matters
- SQL examples (Incorrect/Correct for optimization; Minimal/Production-ready/AllFantasy convention for DDL)
- Optional EXPLAIN output or metrics
- Additional context and references
- Supabase-specific notes (when applicable)

## References

- https://www.postgresql.org/docs/current/
- https://supabase.com/docs
- https://wiki.postgresql.org/wiki/Performance_Optimization
- https://supabase.com/docs/guides/database/overview
- https://supabase.com/docs/guides/auth/row-level-security
