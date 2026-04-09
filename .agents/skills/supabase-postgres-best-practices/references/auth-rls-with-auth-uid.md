---
title: Create RLS Policies with Supabase auth.uid()
impact: CRITICAL
impactDescription: Database-enforced user isolation using Supabase Auth context
tags: rls, auth, supabase, policy, security, auth-uid
---

## Create RLS Policies with Supabase auth.uid()

Supabase provides `auth.uid()` to get the current user's UUID from the JWT. Use this in RLS policies to scope data access per user.

**Minimal (no RLS, all data exposed):**

```sql
-- Anyone with the anon key can read all leagues
SELECT * FROM "leagues";
```

**Production-ready (RLS with auth.uid()):**

```sql
-- 1. Enable RLS on the table
ALTER TABLE "leagues" ENABLE ROW LEVEL SECURITY;

-- 2. Policy: users can read leagues they belong to
CREATE POLICY "users_read_own_leagues" ON "leagues"
  FOR SELECT
  TO authenticated
  USING (
    "id" IN (
      SELECT "league_id" FROM "league_members"
      WHERE "user_id" = auth.uid()::TEXT
    )
  );

-- 3. Policy: users can insert leagues (they become owner)
CREATE POLICY "users_create_leagues" ON "leagues"
  FOR INSERT
  TO authenticated
  WITH CHECK ("owner_id" = auth.uid()::TEXT);

-- 4. Policy: only owner can update
CREATE POLICY "owner_update_league" ON "leagues"
  FOR UPDATE
  TO authenticated
  USING ("owner_id" = auth.uid()::TEXT)
  WITH CHECK ("owner_id" = auth.uid()::TEXT);

-- 5. Policy: only owner can delete
CREATE POLICY "owner_delete_league" ON "leagues"
  FOR DELETE
  TO authenticated
  USING ("owner_id" = auth.uid()::TEXT);
```

**Supabase roles explained:**

| Role | Description | Use in policies |
|------|-------------|-----------------|
| `anon` | Unauthenticated requests (anon key) | Public read access |
| `authenticated` | Logged-in users (JWT present) | User-scoped access |
| `service_role` | Server-side admin (bypasses RLS) | Never in policies |

**Performance optimization — cache auth.uid():**

```sql
-- Wrapping auth.uid() in a subselect caches it for the query
CREATE POLICY "fast_user_read" ON "user_profiles"
  FOR SELECT
  TO authenticated
  USING (
    "id" = (SELECT auth.uid()::TEXT)
  );
-- The subselect is evaluated once, not per-row
```

**Idempotent policy creation:**

```sql
-- PostgreSQL lacks CREATE POLICY IF NOT EXISTS
-- Drop first, then create
DROP POLICY IF EXISTS "users_read_own_leagues" ON "leagues";
CREATE POLICY "users_read_own_leagues" ON "leagues"
  FOR SELECT TO authenticated
  USING ("owner_id" = (SELECT auth.uid()::TEXT));
```

Reference: [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
