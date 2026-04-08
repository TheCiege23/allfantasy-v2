---
name: db-first-api-integration
description: 'Enforce DB-first API integration to reduce request-per-minute usage and external API pressure. Use when adding, reviewing, or refactoring any existing or new API integration so external APIs are ingested into Postgres/Supabase first, then consumed by site routes and UI from database-backed sources.'
argument-hint: 'Describe the API(s), required freshness, and where data appears in the app.'
user-invocable: true
---

# DB-First API Integration

## What This Skill Produces
- A repeatable integration plan where the app reads from database tables/views, not directly from external APIs.
- Ingestion jobs and sync paths that write external API data into Postgres/Supabase first.
- RPM protection controls: batching, deduplication, cache windows, and rate-aware retry behavior.
- Validation checks proving the site is using DB-backed reads.

## When to Use
- Adding a brand-new third-party API.
- Migrating an existing direct API usage to DB-first architecture.
- Reviewing pull requests for API/RPM regressions.
- Debugging elevated RPM, quota exhaustion, or latency spikes from upstream APIs.

## Inputs to Collect
1. External API endpoints, auth model, and quota/RPM limits.
2. Data entities and ownership (global, per league, per user).
3. Freshness SLA per entity (real-time, near-real-time, hourly, daily).
4. Site read paths (pages, route handlers, jobs) that need this data.
5. Failure tolerance (stale-read acceptable or hard-fail required).

## Default Policy for This Workspace
- Scope: workspace-level skill for this repository.
- Direct external API calls: allowed in ingestion/sync modules only.
- Freshness defaults:
- Live scoring across all sports: near-real-time (target 1-5 minutes).
- Injury and player news across all sports: near-real-time (target 1-5 minutes).
- All other data domains: batched sync (30+ minute cadence unless overridden).

## Decision Points
1. Freshness strategy:
- If SLA is seconds-level, use short-interval ingestion + incremental upserts.
- If SLA is minutes/hours, use scheduled sync jobs and cached DB reads.

2. Scope strategy:
- If data is shared across many users, ingest once and fan out from DB.
- If data is user-scoped and tokenized, ingest per user with partitioned storage.

3. Access strategy:
- If the site path is user-facing, read from DB only.
- If path is ingestion/maintenance, direct API calls are allowed there only.

4. Failure strategy:
- If stale data is acceptable, serve last-good snapshot with freshness metadata.
- If stale data is not acceptable, return explicit degraded status and queue urgent resync.

## Procedure
1. Catalog current API usage.
- Find all external API call sites (route handlers, server actions, utilities, cron jobs).
- Mark each site as `ingestion`, `read-path`, or `mixed`.

2. Define DB contract first.
- Create/confirm normalized tables for canonical records.
- Add sync metadata columns: `source`, `synced_at`, `version`, `sync_status`.
- Add indexes for read-path filters and upsert keys.

3. Implement ingestion layer.
- Move external API calls into dedicated ingestion modules/jobs.
- Use idempotent upserts and chunked/batched writes.
- Add rate limiting, exponential backoff, and retry caps.

4. Refactor site read paths.
- Replace direct external API calls in app routes/UI-backed server code with DB queries.
- Expose only DB-backed selectors/read models to the site.

5. Add RPM controls.
- Request coalescing for duplicate in-flight fetches.
- Per-endpoint cooldown windows and cache TTLs in ingestion.
- Backpressure when quota nears threshold (slow polling, skip low-priority entities).

6. Add observability.
- Track ingestion duration, rows written, error rate, and API call count.
- Track staleness (`now - synced_at`) on read paths.
- Add alerts for quota near-limit and sync failure streaks.

7. Enforce boundaries.
- Block new direct external API calls in user-facing code paths.
- Keep direct API callers limited to ingestion/sync modules only.

## Completion Checks
- Every user-facing read path for the integrated data resolves from DB models/tables/views.
- External API calls exist only in ingestion/sync modules.
- Sync metadata is present and queryable (`synced_at`, `sync_status`).
- RPM during steady state is below agreed budget.
- Failure mode is documented and tested (stale-read or degraded path).

## PR Review Checklist
- No new direct external API call in pages/routes/server actions serving UI.
- Ingestion path uses idempotent upsert semantics.
- Retry/backoff/rate-limit logic exists for upstream calls.
- DB indexes support dominant read filters.
- Monitoring and alert hooks are included.

## Suggested Prompt Invocations
- `/db-first-api-integration Migrate player news API to DB-first with 5-minute freshness.`
- `/db-first-api-integration Review this PR for direct API calls in user-facing routes.`
- `/db-first-api-integration Design ingestion + read model for per-league standings feed.`
