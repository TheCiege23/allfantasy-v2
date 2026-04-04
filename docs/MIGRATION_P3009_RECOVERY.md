# Resolving Prisma P3009 (failed migrations) — production / Vercel

**Symptom:** `migrate deploy` fails with **P3009** — *migrate found failed migrations in the target database, new migrations will not be applied.*

Example:

```text
The `20260405000000_add_survivor_backend_engine` migration started at ... failed
```

## 1. Automated recovery (Vercel / CI)

`scripts/prisma-migrate-deploy.cjs` treats certain migrations as **recoverable**: on P3009/P3018 it runs:

```bash
prisma migrate resolve --rolled-back "<migration_folder_name>"
```

then retries `prisma migrate deploy`.

**Included:** `20260405000000_add_survivor_backend_engine` (transient timeouts, locks, Neon hiccups).

Redeploy after merging the updated script.

## 2. Manual recovery (direct DB access)

**A. Inspect failure**

```sql
SELECT migration_name, finished_at, rolled_back_at, logs
FROM "_prisma_migrations"
WHERE migration_name = '20260405000000_add_survivor_backend_engine'
ORDER BY started_at DESC;
```

**B. If the migration truly never applied (Postgres rolled DDL back)**

```bash
npx prisma migrate resolve --rolled-back "20260405000000_add_survivor_backend_engine"
npx prisma migrate deploy
```

Use **`DIRECT_URL` / non-pooling** URL if the pooler breaks DDL.

**C. If objects were left in a half-applied state** (rare with Postgres transactional DDL)

1. Compare DB objects to `prisma/migrations/20260405000000_add_survivor_backend_engine/migration.sql`.
2. Manually drop conflicting constraints/tables **only** with platform DBA review.
3. Then `migrate resolve --rolled-back` and `migrate deploy`.

**D. If the migration actually succeeded but `_prisma_migrations` is wrong** (extremely rare)

Only after verifying all SQL from that migration is present:

```bash
npx prisma migrate resolve --applied "20260405000000_add_survivor_backend_engine"
```

## 3. Prerequisites

`20260405000000_add_survivor_backend_engine` expects **`survivor_chat_channels`** from migration `20260403240000_add_survivor_league_engine`. If that migration is missing from the DB, fix migration history / baseline first.

## 4. References

- https://www.prisma.io/docs/guides/migrate/production-troubleshooting
- `scripts/prisma-migrate-deploy.cjs` — recoverable failed migrations list
