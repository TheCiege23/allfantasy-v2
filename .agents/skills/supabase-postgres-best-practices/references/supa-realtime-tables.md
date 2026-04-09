---
title: Enable Supabase Realtime on Tables
impact: MEDIUM
impactDescription: Live data subscriptions for specific tables with bandwidth control
tags: supabase, realtime, publication, subscription, websocket
---

## Enable Supabase Realtime on Tables

Supabase Realtime uses PostgreSQL logical replication. You must explicitly add tables to the `supabase_realtime` publication to enable live subscriptions.

**Minimal (realtime not enabled):**

```sql
-- Clients subscribing to "leagues" changes will receive nothing
-- Table is not in the realtime publication
```

**Production-ready (enable realtime):**

```sql
-- Add table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE "leagues";

-- Verify which tables are in the publication
SELECT * FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';
```

**Filter columns for bandwidth (PostgreSQL 15+):**

```sql
-- Only broadcast specific columns to reduce payload size
ALTER PUBLICATION supabase_realtime ADD TABLE "trade_offers" (
  "id", "league_id", "status", "updated_at"
);
-- Clients won't receive changes to other columns like "details_json"
```

**Remove a table from realtime:**

```sql
ALTER PUBLICATION supabase_realtime DROP TABLE "leagues";
```

**Client-side subscription (TypeScript):**

```typescript
const channel = supabase
  .channel("league-trades")
  .on(
    "postgres_changes",
    {
      event: "*",         // INSERT, UPDATE, DELETE, or *
      schema: "public",
      table: "trade_offers",
      filter: `league_id=eq.${leagueId}`,
    },
    (payload) => {
      console.log("Trade update:", payload);
    }
  )
  .subscribe();
```

**When to enable realtime:**

| Table | Enable? | Reason |
|-------|---------|--------|
| `trade_offers` | Yes | Users see live trade updates |
| `chat_messages` | Yes | Real-time chat |
| `leagues` | Maybe | Only if live settings updates needed |
| `user_profiles` | No | Rarely changes, wasteful |
| `sports_players` | No | Updated in bulk via background jobs |

**Important:** Realtime subscriptions respect RLS policies. Users only receive events for rows they can SELECT.

Reference: [Supabase Realtime](https://supabase.com/docs/guides/realtime)
