# AllFantasy — repo instructions

## Sports data providers

The API contracts are committed at `contracts/`:

- `contracts/rolling-insights/`
- `contracts/thesportsdb/`

**Do not call either provider's API to determine a response shape.** Read
`ENDPOINTS.yaml` and `fixtures/` in the relevant contract directory. Unknowns are
tracked in that directory's `GAPS.md` — append to it and ask. Do not probe to
resolve them.

Probing is allowed only via the contract's own `scripts/probe.sh`, only when
adding a new endpoint/sport combination, and the captured fixture must be
committed in the same change. An uncommitted probe gets repeated.

> `fixtures/` is referenced throughout both contracts but is **not yet
> populated**. Until it is, `ENDPOINTS.yaml` is the only committed shape
> authority, and its per-sport `confidence:` field tells you how much to trust
> it — several sports are marked `low` or `none`.

### Credentials

`RSC_token` (Rolling Insights) and the TheSportsDB API key are secrets. They must
never appear in logs, error messages, client responses, or committed fixtures.
Rolling Insights passes its token as a **query parameter**, so naive URL logging
leaks a long-lived credential — redact before logging, and never log a full
request URL.

Env var names have drifted; the codebase does not agree with itself. Before
adding a provider call, grep for the name actually read on the path you are
touching rather than assuming. Observed spellings for the RI token alone:
`ROLLING_INSIGHTS_RSC_TOKEN` (most common), `RSC_TOKEN`,
`ROLLING_INSIGHTS_CLIENT_SECRET`, `ROLLING_INSIGHTS_API_KEY`,
`ROLLING_INSIGHTS_KEY`. Base URL: `ROLLING_INSIGHTS_REST_BASE_URL` (most common),
`ROLLING_INSIGHTS_REST_BASE`, `ROLLING_INSIGHTS_BASE_URL`,
`ROLLING_INSIGHTS_API_BASE`.

The contract's documented names (`RSC_TOKEN`, `ROLLING_INSIGHTS_BASE_URL`) are
**minority spellings in this repo**. Setting only those will silently no-op on
most call paths.

### DB-first boundary

The intended architecture is that application code reads from Postgres and only
ingestion/sync modules call a provider. `scripts/check-db-first-api-boundary.mjs`
enforces this.

**It is partially enforced today.** The guard's monitored-host list covers
Sleeper, Yahoo, NewsAPI, sportsdata.io, the-odds-api, ESPN and TheSportsDB — but
**not Rolling Insights**, which per `contracts/rolling-insights/INTEGRATION.md` is
the scoring source. Direct RI calls therefore do not trip the guard.

Treat both contracts' "the app never calls the vendor" line as the **target**
architecture, not a description of current state.

### The 304 rule

A `304` from Rolling Insights is a caching artifact, **not** "nothing changed" and
not an empty result. Retry once with a fresh millisecond cache-buster. Do not
build change detection on it — diff payload hashes instead. Code that returns
`[]` on a 304 is silently reporting "no data" for a cache hit.

## Git

The working tree is sometimes shared with concurrent sessions; HEAD can move
underneath you mid-task. Stage explicit paths, never `git add -A`, and verify the
staged set before committing.

**This repo is public.** Secret-scan before every push.
