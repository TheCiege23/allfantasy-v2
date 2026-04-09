---
title: Link Supabase Auth Users to Application Tables
impact: HIGH
impactDescription: Consistent user identity across auth and application data
tags: auth, user-linking, supabase-auth, prisma, identity
---

## Link Supabase Auth Users to Application Tables

When using Supabase Auth alongside an application database (e.g., Prisma/Neon), you need a strategy to link `auth.users` (UUID) to your application user tables (which may use TEXT cuid or other ID formats).

**Problem — mismatched identity:**

```sql
-- Supabase Auth stores users as UUID
-- auth.users.id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

-- Application table uses TEXT cuid
-- user_profiles.id = 'clx1abc2300001234abcdefgh'

-- How do you join them?
```

**Solution 1 — store supabase_uid on profile:**

```sql
ALTER TABLE "user_profiles"
  ADD COLUMN IF NOT EXISTS "supabase_uid" UUID;

CREATE UNIQUE INDEX IF NOT EXISTS "user_profiles_supabase_uid_key"
  ON "user_profiles" ("supabase_uid");

-- RLS policy using the stored UID
CREATE POLICY "users_read_own_profile" ON "user_profiles"
  FOR SELECT TO authenticated
  USING ("supabase_uid" = (SELECT auth.uid()));
```

**Solution 2 — join via email (simpler, used by AllFantasy):**

```sql
-- Both systems share email as the common key
-- auth.users.email = user_profiles.email

CREATE POLICY "users_read_own_profile" ON "user_profiles"
  FOR SELECT TO authenticated
  USING (
    "email" = (SELECT email FROM auth.users WHERE id = auth.uid())
  );
```

**AllFantasy convention — dual-auth sync:**

```typescript
// On registration: create user in both systems
// 1. Create in NextAuth/Prisma (application DB)
const user = await prisma.user.create({
  data: { email, name, hashedPassword },
});

// 2. Mirror to Supabase Auth (non-blocking)
const { data } = await supabaseAdmin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

// 3. Store the mapping
await prisma.user.update({
  where: { id: user.id },
  data: { supabaseUid: data.user?.id },
});
```

**OAuth flow (Supabase handles the identity):**

```typescript
// Supabase OAuth creates the auth.users entry
// On callback, upsert the application profile
const { data: { user } } = await supabase.auth.getUser();

await supabaseAdmin.from("user_profiles").upsert({
  supabase_uid: user.id,
  email: user.email,
  display_name: user.user_metadata?.full_name,
});
```

**RLS policy with cast (UUID to TEXT):**

```sql
-- When app table uses TEXT id but auth.uid() returns UUID
CREATE POLICY "user_data_policy" ON "user_data"
  FOR ALL TO authenticated
  USING ("user_id" = (SELECT auth.uid()::TEXT));
```

Reference: [Supabase Auth](https://supabase.com/docs/guides/auth)
