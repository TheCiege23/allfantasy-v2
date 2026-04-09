---
description: "Use when adding, reviewing, or refactoring API-Sports integrations. Enforce DB-first boundaries so user-facing routes and UI-backed server code do not call API-Sports directly."
name: "API-Sports DB-First Guardrail"
applyTo: "app/api/**/*.ts, app/api/**/*.tsx, lib/**/*.ts, lib/**/*.tsx, scripts/**/*.ts, scripts/**/*.mjs"
---

# API-Sports DB-First Guardrail

- Treat API-Sports as an ingestion source, not a user-facing read dependency.
- Keep direct API-Sports calls in ingestion/sync modules only.
- User-facing routes and UI-backed server logic must read from Postgres/Supabase models or views.
- Require sync metadata on ingested records where applicable (`source`, `synced_at`, sync status).

## Freshness Defaults

- Live scoring and injury/player news: target 1-5 minute ingestion cadence.
- Other API-Sports domains (fixtures, standings, teams, odds, metadata): default 30+ minute batch cadence unless product requirements override.

## Required Review Checks

- No direct API-Sports HTTP call in user-facing handlers or UI-serving code.
- Ingestion writes are idempotent (upsert/update patterns, no duplicate explosions).
- Stale/degraded behavior is explicit when upstream fetch fails.
- Rate-limiting, retry, and backoff behavior exist for API-Sports calls.

## Exception Path

- If a temporary exception is unavoidable, annotate the exact line with `db-first-exception: api-sports <reason>` and include a migration/removal plan in the PR.
