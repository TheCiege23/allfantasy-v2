---
description: "Use when adding, refactoring, or reviewing API integrations. Enforce DB-first ingestion so user-facing routes and UI-backed server code read from Postgres/Supabase, not direct third-party data APIs."
name: "DB-First API Boundary"
applyTo: "app/api/**/*.ts, app/api/**/*.tsx, lib/**/*.ts, lib/**/*.tsx, scripts/**/*.ts, scripts/**/*.mjs"
---

# DB-First API Boundary

- Treat third-party sports/content data APIs as ingestion sources, not direct read dependencies for user-facing flows.
- Write external data to database tables first (with `synced_at` and sync status metadata), then read from DB in routes and UI-serving code.
- Keep direct external API calls in ingestion/sync modules only.
- For live scoring and injury/player news, target near real-time ingestion cadence (1-5 minutes).
- For all other sports data, default to batched ingestion (30+ minutes) unless product requirements override.

## Required Checks For New/Changed Integrations

- Verify user-facing route handlers do not call third-party data APIs directly.
- Verify ingestion path uses idempotent upsert behavior.
- Verify stale-read/degraded behavior is explicit.
- Verify rate limiting/backoff is implemented for upstream calls.

## Exception Path

- If a one-off exception is unavoidable, annotate the exact line with `db-first-exception: reason` and document the migration plan in the PR.
