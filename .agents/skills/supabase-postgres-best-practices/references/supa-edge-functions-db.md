---
title: Access Database from Supabase Edge Functions
impact: MEDIUM
impactDescription: Server-side DB queries from Deno edge runtime with proper auth context
tags: supabase, edge-functions, deno, server-side, database
---

## Access Database from Supabase Edge Functions

Supabase Edge Functions run on Deno and can query the database using `supabase-js`. Choose the right client (anon vs service_role) based on whether RLS should apply.

**User-scoped query (RLS applies):**

```typescript
// supabase/functions/get-my-leagues/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  // Create client with the user's JWT (RLS applies)
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: {
        headers: { Authorization: req.headers.get("Authorization")! },
      },
    }
  );

  // This query is scoped by RLS policies
  const { data, error } = await supabase
    .from("leagues")
    .select("id, name, sport")
    .order("created_at", { ascending: false });

  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
});
```

**Admin query (bypasses RLS):**

```typescript
// supabase/functions/admin-stats/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  // Service role client — bypasses all RLS
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Cross-user aggregation (no RLS filtering)
  const { data, error } = await supabaseAdmin
    .from("leagues")
    .select("sport, count:id.count()")
    .group("sport");

  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
});
```

**Direct Postgres connection (for complex queries):**

```typescript
// Use postgres.js for raw SQL in Edge Functions
import postgres from "https://deno.land/x/postgresjs/mod.js";

Deno.serve(async (req) => {
  const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!);

  const result = await sql`
    SELECT l.name, COUNT(lm.id) as member_count
    FROM leagues l
    LEFT JOIN league_members lm ON lm.league_id = l.id
    GROUP BY l.id
    ORDER BY member_count DESC
    LIMIT 10
  `;

  await sql.end();
  return new Response(JSON.stringify(result));
});
```

**When to use which client:**

| Scenario | Client | RLS |
|----------|--------|-----|
| User-facing data fetch | Anon + user JWT | Yes |
| Background job / cron | Service role | No |
| Webhook handler | Service role | No |
| Complex SQL / joins | Direct postgres | No |

Reference: [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
