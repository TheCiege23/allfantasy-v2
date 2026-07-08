# Neon Test Infrastructure — Import Verification (Phase 3 Part 1)

A safe, isolated Postgres environment for running import integration tests **without touching production**.

## The test branch (provisioned)
- **Neon project:** `All Fantasy` — `icy-field-51189449` (production).
- **Test branch:** `import-test-sandbox` — **`br-fancy-mode-ad1v37g5`**, forked from prod's default branch `br-withered-shadow-adur64u9`.
- **Isolation:** a Neon copy-on-write branch. It contains prod's schema **and a point-in-time copy of prod data**, but **writes to it never affect production** — the branch and parent are fully independent.
- **Verified:** 640 tables cloned; `import_runs`, `import_warnings`, `dw_matchup_facts`, `_prisma_migrations` all present → the Prisma schema/migrations are already applied (inherited from prod). No `prisma migrate deploy` needed on this branch.

## Setup (you wire the secret — kept out of git & transcripts)
The connection string contains a live password, so it is **never** committed or pasted into chat. To run the import integration tests locally:

1. Neon console → project **All Fantasy** → branch **import-test-sandbox** → **Connection string** (role/database of your choice; pooled or direct).
2. Create a local, gitignored `.env.test` (the repo already ignores `.env*`):
   ```
   DATABASE_URL="postgresql://<user>:<password>@<host>/<db>?sslmode=require"
   DIRECT_URL="postgresql://<user>:<password>@<host>/<db>?sslmode=require"   # if your Prisma config uses it
   ```
   Use the **pooled** host for `DATABASE_URL`; use the **direct** (`-pooler` removed) host for `DIRECT_URL` if migrations are ever run.
3. Run the opt-in suite (double-gated so it never runs in normal CI):
   ```
   IMPORT_INTEGRATION_DB=1 DATABASE_URL="…" DIRECT_URL="…" npm run test:import:db
   ```

## What runs today vs. what's staged
- **Runs now** (once `DATABASE_URL` is set): the **connectivity smoke test** — confirms Prisma connects and the import schema (`import_runs` / `import_warnings` / fact tables) exists on the branch.
- **Staged as `it.todo`** in `__tests__/integration/sleeper-import-db.integration.test.ts` — the previously-blocked write-based cases. They are specified precisely but intentionally **not authored blind**: they write rows and depend on FK/cleanup behavior on real data, so they must be written and run against the wired sandbox branch, not fabricated. See §"Blocked tests".

### Blocked tests (finalize against the wired branch)
| Test | Assertion |
|---|---|
| Warning persistence | an import whose payload carries `fetchWarnings` produces `ImportWarning` rows (`code='source_fetch_incomplete'`) for the run (validates §5 end-to-end) |
| Failure does not corrupt | a `$transaction([deleteMany, createMany])` whose `createMany` throws leaves the pre-existing fact rows intact (per-table atomicity, already shipped) |
| Interrupted import recovery | re-running with the same `idempotencyKey` produces no duplicate league/facts |
| Duplicate import handling | the `ImportRun.idempotencyKey` unique constraint rejects the second run |
| Staged import validation (future) | reserved for Tier 1 staged promotion — do NOT build until the schema checklist is approved |

**Author-and-run guidance:** use clearly-fake identifiers (e.g. a throwaway `leagueId`/`idempotencyKey` prefixed `__import_integration_test__`) and clean up in `afterAll`, or wrap writes in a `$transaction` that rolls back, so tests never mutate the copied prod rows.

## Rollback procedure
- **Undo everything:** delete the branch — Neon console → branch `import-test-sandbox` → Delete (or the Neon MCP `delete_branch` for `br-fancy-mode-ad1v37g5`). This is instant and affects **only** the branch; production is untouched.
- **Reset to prod state:** `reset_from_parent` on the branch re-clones the current prod state (discards test writes) without deleting it.
- The branch has no auto-expiry set; delete it when the import test cycle is done.

## Limitations
- **Credential is user-supplied by design** — this doc/PR contains no secret; the tests skip cleanly when `DATABASE_URL` is unset.
- The branch holds a **copy of production data** (PII). Treat it as sensitive; delete when finished; never point a preview/prod deployment at it.
- **No Tier 1 staged-promotion here** — this milestone only *prepares the environment* (per the phase brief). Staged-promotion + fidelity migrations remain gated on the approved schema checklist (`docs/SLEEPER_IMPORT_SCHEMA_PROPOSAL.md`).
- Running `prisma migrate deploy` against this branch is unnecessary (schema inherited); only do so to test a *new* migration before prod.
