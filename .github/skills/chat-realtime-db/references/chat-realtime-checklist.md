# Chat Realtime Checklist

## Data Model
- Stable conversation identity for every message thread
- Deterministic sort keys for message ordering
- Server-generated timestamps where possible
- Constraints that prevent invalid sender/recipient combinations

## Realtime
- Subscriptions scoped to minimal channels
- Event filters match table + conversation scope correctly
- Reconnect resubscribe strategy is explicit
- Client merge logic is idempotent against duplicate events

## Queries and Performance
- Latest-message and unread-count queries are index-backed
- Pagination uses stable cursor semantics
- Avoid N+1 lookups in conversation list rendering

## Validation
- Test delivery and ordering under reconnect conditions
- Test unread counters for send, receive, and read transitions
- Test multi-client concurrency for the same conversation
