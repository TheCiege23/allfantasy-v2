---
name: chat-realtime-db
description: 'Harden chat data and realtime flows for DMs, AF Huddle, and League chat. Use when designing or debugging message delivery, ordering, subscriptions, presence, or chat query performance in Supabase/Postgres.'
argument-hint: 'Describe the chat flow, symptom, affected tables/channels, and expected behavior.'
user-invocable: true
---
# Chat Realtime and DB Hardening

## When to Use
- Messages are delayed, duplicated, missing, or out of order.
- Presence/typing indicators are inconsistent.
- Chat queries become slow as message volume grows.
- A new chat feature needs safe schema/index/realtime wiring.

## Procedure
1. Map the flow end-to-end: write path, read path, and subscription path.
2. Validate data model assumptions: conversation keys, sender/recipient constraints, and timestamp/order fields.
3. Verify realtime channel design: channel scope, event filters, reconnect behavior, and idempotent client merges.
4. Review query patterns and indexes for hot paths (latest messages, unread counts, conversation list).
5. Propose smallest safe fix set: schema/index/query/realtime/client-merge changes.
6. Define targeted validation: regression tests, event-order checks, and reconnect scenarios.

## Output Format
- Observed symptom and impact
- Root-cause hypothesis (ranked)
- Recommended DB/realtime changes
- Migration and rollout notes
- Validation plan

## Reference
- [Chat Realtime Checklist](./references/chat-realtime-checklist.md)
