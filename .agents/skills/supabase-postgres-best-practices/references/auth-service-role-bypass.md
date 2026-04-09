---
title: Use Service Role to Bypass RLS for Admin Operations
impact: CRITICAL
impactDescription: Server-side admin access without RLS restrictions, must never be exposed to client
tags: auth, service-role, admin, bypass-rls, server-only
---

## Use Service Role to Bypass RLS for Admin Operations

The Supabase service_role key bypasses all RLS policies. Use it exclusively on the server for admin operations like user provisioning, analytics queries, and background jobs.

**Minimal (dangerous — service role on client):**

```typescript
// NEVER do this — exposes service_role key to the browser
const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!);
```

**Production-ready (server-only admin client):**

```typescript
// lib/supabase/supabase-admin.ts
import "server-only";  // Ensures this module cannot be imported by client bundles
import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
```

**When to use service_role vs anon/authenticated:**

| Operation | Client | Reason |
|-----------|--------|--------|
| User reads own data | `anon` / `authenticated` | RLS scopes to user |
| Create user in auth.users | `service_role` | Requires admin privileges |
| Background analytics query | `service_role` | Needs cross-user data |
| Webhook handler | `service_role` | No user JWT available |
| Upsert user profile on signup | `service_role` | Writing to table user doesn't own yet |
| Client-side data fetch | `anon` | Never expose service key |

**AllFantasy convention:**

```typescript
// API route using admin client for user provisioning
import { supabaseAdmin } from "@/lib/supabase/supabase-admin";

// Create user in Supabase Auth (mirrors NextAuth credentials)
const { data, error } = await supabaseAdmin.auth.admin.createUser({
  email: user.email,
  password: hashedPassword,
  email_confirm: true,
});

// Upsert profile (bypasses RLS)
await supabaseAdmin
  .from("user_profiles")
  .upsert({ id: user.id, email: user.email, display_name: user.name });
```

**Security checklist:**
- `SUPABASE_SERVICE_ROLE_KEY` is in `.env` but NOT prefixed with `NEXT_PUBLIC_`
- Admin client file uses `import "server-only"` directive
- Admin client is never imported in components or client-side code
- API routes using admin client validate the request (auth check, rate limit) before operating

Reference: [Supabase Service Role](https://supabase.com/docs/guides/api/api-keys)
