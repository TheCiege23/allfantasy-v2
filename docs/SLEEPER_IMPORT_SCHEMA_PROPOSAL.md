# Sleeper Import — Schema & Atomicity Proposal (for approval)

**Status:** DRAFT — doc only, **no migration written**. Approve the checklist (§7) before any code.
**Scope:** Sleeper import hardening (Phase 2.4+). Grounded in the actual `prisma/schema.prisma` on `main` (`b140e8cac`).

## What already exists (verified — do NOT rebuild)
Reading the schema changed the picture materially. Already present:
- **`ImportRun`** — full run tracking: `status @default("running")`, `idempotencyKey @unique`, `rawPayloadHash`, `canonicalSummary Json?`, `error`, `startedAt`/`completedAt`, relations `warnings`, `reviewTasks`, `entityMappings`.
- **`ImportWarning`** — `{ id, runId, leagueId, code, message, severity, metadata }` + FK to `ImportRun`.
- **`LeagueTeam.isCommissioner` + `LeagueTeam.isCoCommissioner`** (comment: *"Sleeper is_owner … co-commissioners are AF-only via isCoCommissioner"*).

**Consequences:**
- **Warnings persistence (item 5) needs NO schema** — the model exists; it's a wiring change.
- **Co-commissioners are already representable** — only **co-managers (per-team co-owners)** is a real gap.
- **Atomicity can start schema-free** (`ImportRun.status` + per-table transactions); a schema tier is optional for full rollback.

---

## 1. Staged import-run promotion / rollback safety
**Problem:** fact writes are `deleteMany → createMany` per table (`MatchupFact`, `DraftFact`, `TransactionFact`, `SeasonStandingFact`, `RosterSnapshot`) with **no `$transaction`**. A mid-import failure/timeout leaves a partially-wiped league.

**Tiered fix (recommend Tier 0 first, no schema):**
- **Tier 0 — per-table atomicity (NO schema).** Wrap each table's rewrite in the **array form** `prisma.$transaction([deleteMany, createMany])`. Batched (not interactive) → no 5s interactive-tx timeout. Eliminates the "deleted but not recreated" corruption per table. Reuse the existing `ImportRun.status` (`running → completed | failed`) as the audit trail. **Ships without approval-gated schema.**
- **Tier 1 — whole-import staged promotion (schema).** For all-or-nothing across tables: import into rows tagged with the new `ImportRun.id`, validate, then **atomically flip** the live pointer. Minimal schema: add **`ImportRun.status` values `staged`/`promoted`/`superseded`** (no column change — it's a `VarChar(24)` string) + **`ImportRun.promotedAt DateTime?`** and **`ImportRun.supersededByRunId String?`** for rollback lineage. Fact tables would need a nullable **`importRunId String?`** discriminator to scope "which run's rows are live" (additive, indexed). Rollback = re-point to the prior `promoted` run.

**Recommendation:** implement **Tier 0 now** (schema-free, with the #161 warnings wiring), and only take **Tier 1** if per-table atomicity proves insufficient in practice. Tier 1 is where the real migration lives.

## 2. Co-managers / co-owners
**Already done:** co-**commissioners** (`LeagueTeam.isCoCommissioner`).
**Gap:** Sleeper `/league/{id}/users[].metadata.co_owner` marks **multiple humans co-owning one team/roster**; `LeagueTeam` has a single `ownerName`/`platformUserId`/`claimedByUserId`.

**Options:**
- **A (relational, recommended):** new `LeagueTeamCoOwner { id, leagueTeamId FK, platformUserId?, displayName, sourceUserId, role @default("co_owner") }` + `@@unique([leagueTeamId, sourceUserId])`. Clean joins, claimable later.
- **B (lightweight):** `LeagueTeam.coOwners Json?` (array of `{sourceUserId, displayName}`). Faster, but not queryable/claimable.

**Recommend A** — co-owners are first-class (they log in, get claimed). ~1 new model, additive, low-risk.

## 3. Consolation bracket results
**Gap:** `MatchupFact` (teamA/teamB/score/winner/weekOrPeriod) can't distinguish **regular / winners-bracket / consolation-bracket**, and has no round/placement. Sleeper `/winners_bracket` + `/losers_bracket` return `{ r, m, t1, t2, w, l, p }` (round, match, teams, winner, loser, placement).

**Options:**
- **A (additive columns on `MatchupFact`, recommended):** `bracket String? @db.VarChar(16)` (`regular|winners|consolation`), `bracketRound Int?`, `placement Int?`. Nullable → zero backfill; existing rows default `regular` semantics. Lowest-risk migration.
- **B (new `PlayoffResultFact`):** cleaner separation but a new table + new consumers. Heavier.

**Recommend A** — three nullable columns, no backfill, existing consumers unaffected.

## 4. Traded future draft picks
**Gap:** `DraftFact` models **completed** picks (round/pick/player/manager). Sleeper `/traded_picks` returns **future pick ownership** `{ season, round, roster_id, owner_id, previous_owner_id }` — an asset, not a pick. (`tradedPicks Json?` elsewhere is live-draft-session scope, not imports.)

**Option (recommended):** new `TradedDraftPickAsset { id, leagueId FK, season Int, round Int, originalRosterId, currentOwnerId, previousOwnerId?, sourceProvider, importRunId? }` + `@@unique([leagueId, season, round, originalRosterId])`. Additive, dynasty-critical, no existing-data impact.

## 5. How #161 warnings persist into `ImportWarningRecord`
**No schema change.** `SleeperImportPayload.fetchWarnings[]` (from PR #161) → forward through `NormalizedImportResult.warnings (ImportWarningRecord[])` → the commit layer writes each as **`ImportWarning.create({ runId, leagueId, code: 'sleeper_fetch_incomplete', message, severity: 'warning', metadata })`**. Pure wiring in the adapter + commit path. **Ships with Tier 0 atomicity** (both touch the commit path and want the same real-DB test pass).

## 6. Migration risk + rollback plan
| Change | Risk | Backfill | Rollback |
|---|---|---|---|
| Tier 0 `$transaction` (no schema) | **Low** — behavior only | none | revert code |
| Warnings wiring (no schema) | **Low** | none | revert code |
| `MatchupFact` bracket cols (§3A) | **Low** — nullable, additive | none | drop columns |
| `LeagueTeamCoOwner` (§2A) | **Low** — new table | none | drop table |
| `TradedDraftPickAsset` (§4) | **Low** — new table | none | drop table |
| Tier 1 `importRunId` discriminator (§1) | **Medium** — touches live fact reads | backfill live rows to their run | keep old path behind flag; re-point pointer |

**Global rules:** all migrations **additive + nullable** (no drops/renames of existing columns); one migration per concern (independently revertable); apply on a **Neon branch first** (never prod), verify import + downstream reads, then promote; guard Tier 1 behind a flag (`SLEEPER_IMPORT_STAGED_PROMOTION`) so the old path stays live until proven.

## 7. Approval checklist (before any code)
Approve per-item (any subset — they're independent):
- [ ] **§1 Tier 0** — per-table `$transaction` atomicity + reuse `ImportRun.status` (**no schema**)
- [ ] **§5** — persist `fetchWarnings` → `ImportWarning` (**no schema**, ships with Tier 0)
- [ ] **§2A** — `LeagueTeamCoOwner` model (co-managers)
- [ ] **§3A** — `MatchupFact.bracket/bracketRound/placement` (consolation results)
- [ ] **§4** — `TradedDraftPickAsset` model (traded future picks)
- [ ] **§1 Tier 1** — staged-promotion discriminator (`ImportRun` fields + fact `importRunId`) — *only if Tier 0 proves insufficient*
- [ ] **Test environment:** a real (Neon branch) `DATABASE_URL` for the required "failure doesn't corrupt data" tests — **currently unavailable**; atomicity/fidelity code shouldn't merge without it.

**Recommended first PR (schema-free, testable once a DB exists):** §1 Tier 0 + §5. Then §2A/§3A/§4 as separate additive-migration PRs. Tier 1 last, flagged.
