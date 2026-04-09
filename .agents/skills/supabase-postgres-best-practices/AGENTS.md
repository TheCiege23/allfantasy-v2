# Supabase Postgres Best Practices

## Structure

```
supabase-postgres-best-practices/
  SKILL.md       # Main skill file - read this first
  AGENTS.md      # This navigation guide
  CLAUDE.md      # Symlink to AGENTS.md
  references/    # Detailed reference files
```

## Usage

1. Read `SKILL.md` for the main skill instructions
2. Browse `references/` for detailed documentation on specific topics
3. Reference files are loaded on-demand - read only what you need

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

## How to Use

Read individual rule files for detailed explanations and SQL examples:

```
references/query-missing-indexes.md
references/schema-partial-indexes.md
references/_sections.md
```

Each rule file contains:
- Brief explanation of why it matters
- Incorrect SQL example with explanation
- Correct SQL example with explanation
- Optional EXPLAIN output or metrics
- Additional context and references
- Supabase-specific notes (when applicable)

## References

- https://www.postgresql.org/docs/current/
- https://supabase.com/docs
- https://wiki.postgresql.org/wiki/Performance_Optimization
- https://supabase.com/docs/guides/database/overview
- https://supabase.com/docs/guides/auth/row-level-security
