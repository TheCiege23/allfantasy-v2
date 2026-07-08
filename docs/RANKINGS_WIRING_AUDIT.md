# Rankings ↔ Sleeper Import — Wiring Audit (Phase 3 Part 3)

**Read-only audit** of how the Rankings system consumes imported Sleeper data. No code changed. `main` @ `ad0f3559a`. Sleeper is the reference provider.

## TL;DR
The Rankings system reads a **rank-domain layer** of its own tables; the import pipeline writes a **separate fact layer**. The only bridge between them (`LegacyEvidenceAggregator`) reads just one imported fact (`seasonStandingFact`) and is **never triggered by an import**. So:
- **Career rank / Legacy score IS fed by Sleeper** — but via **account-linking / the "legacy_sleeper" username flow**, not the full league import.
- **Full league-import history (matchups, draft, trades, rosters, standings) is largely DISCONNECTED from Rankings** — and even the one connected fact never refreshes because **nothing recomputes rank after a league import**.

## The two layers

**Rank-domain (what the rank engines read):** `legacyScoreRecord`, `legacyEvidenceRecord`, `seasonResult`, `managerXPProfile`, `awardRecord`, `hallOfFameEntry`, `managerFranchiseProfile`, `managerReputationRecord`.

| Rank engine | Reads |
|---|---|
| `LegacyScoreEngine` | `legacyScoreRecord`, `seasonResult`, `league`; **writes** `legacyScoreRecord`/`seasonResult` |
| `LegacyRankingService` | `legacyScoreRecord` (find/count) |
| `career-prestige/UnifiedCareerQueryService` | `legacyScoreRecord`, `managerXPProfile`, `awardRecord`, `hallOfFameEntry`, `managerFranchiseProfile`, `managerReputationRecord` |
| `platform-power-rankings` | `legacyScoreRecord`, `managerXPProfile`, `managerFranchiseProfile`, `appUser`, `userProfile` |
| `xp-progression/XPProgressionEngine` | writes `managerXPProfile` |
| `hall-of-fame-engine` / `rankings-engine/hall-of-fame` | writes `hallOfFameEntry` |

**Import fact layer (what import writes):** `dw_matchup_facts`, `dw_draft_facts`, `dw_season_standing_facts`, `transactionFact`, `rosterSnapshot`, `import_runs`, `import_warnings`, `externalEntityMapping`.

**Rank writers by trigger:** `legacyScoreRecord`/`managerXPProfile` are written by `SocialAccountLinkingService` + `auth.ts` (account link), `LegacyScoreEngine`, `XPProgressionEngine`, `HallOfFameService`. **None of these run inside `lib/league-import`.**

## The single bridge — and why it doesn't carry traffic
`LegacyEvidenceAggregator.aggregateLegacyEvidence()` (called by `LegacyScoreEngine`) reads:
- `legacyEvidenceRecord` — its **primary** source, but this table is written **only** by the aggregator's own `seedDefaultLegacyEvidenceIfEmpty` (defaults). **Import never populates it.**
- `seasonStandingFact` — the **one** imported fact it reads (imported standings). matchups/draft/trades/rosters are **not** read.

And **no import path triggers the engine**: verified — nothing in `lib/league-import`, `lib/import`, or the import routes calls `aggregateLegacyEvidence` / `LegacyScoreEngine` / `XPProgressionEngine` / `CareerPrestige`. The only "refresh" is `dashboardRankRefresh` — a **client-only** localStorage flag that just re-fetches `/api/user/rank`; it recomputes nothing server-side.

## Connected · Partial · Disconnected

### By Sleeper data type (from a full league import)
| Imported data | Reaches Rankings? |
|---|---|
| Historical standings (`seasonStandingFact`) | 🟡 **PARTIAL** — the aggregator *can* read it, but only if the engine is run; import doesn't trigger it |
| Historical matchups (`matchupFact`) | 🔴 **DISCONNECTED** — no rank consumer |
| Historical draft (`draftFact`) | 🔴 **DISCONNECTED** |
| Historical trades / transactions (`transactionFact`) | 🔴 **DISCONNECTED** |
| Historical roster data (`rosterSnapshot`) | 🔴 **DISCONNECTED** |
| Previous-league chain / historical seasons | 🔴 **DISCONNECTED** from rank (imported as facts, not evidence) |
| Player history / identity (`externalEntityMapping`) | 🔴 **DISCONNECTED** (0 external readers — see import audit) |

### By Rankings feature
| Feature | Status | Source |
|---|---|---|
| Career rank / Legacy XP / career progression | 🟢 **CONNECTED to Sleeper** | account-linking + "legacy_sleeper" username flow (`SocialAccountLinkingService`, `lib/legacy/*`) → `legacyScoreRecord`/`managerXPProfile` |
| Historical championships / Hall of Fame | 🟡 **PARTIAL** | `hallOfFameEntry` written by hall-of-fame engines; not derived from imported league facts |
| Historical records | 🟡 **PARTIAL** | via `seasonResult`/`legacyScoreRecord`, not from imported `matchupFact`/`seasonStandingFact` |
| League rankings (`/api/leagues/ranking`) | 🟡 **PARTIAL** | league-scoped; not fed by imported history |
| Platform power rankings | 🟢 CONNECTED to rank-domain | reads `legacyScoreRecord`/XP (which the legacy path feeds), not import facts directly |
| Manager rankings | 🟢 CONNECTED to rank-domain | `managerFranchiseProfile`/XP |
| Achievements / Badges | 🟡 **PARTIAL** | `achievement-system` / `badge-engine`; not confirmed to consume imported league facts |
| **Import synchronization → rank** | 🔴 **DISCONNECTED** | no server-side recompute on import |
| **Automatic refresh** | 🔴 **DISCONNECTED (client-only flag)** | `dashboardRankRefresh` refetches the API; recomputes nothing |

## What can be wired **without schema changes** (all tables already exist)
1. **Auto-trigger a rank recompute after a Sleeper import.** Add a server-side hook in the import commit/backfill to run `aggregateLegacyEvidence` + `LegacyScoreEngine` (and/or XP) for the affected user/league. This is the highest-leverage fix — it turns the existing (but dormant) bridge on. No schema.
2. **Populate `legacyEvidenceRecord` from imported facts during import.** The aggregator's primary source is currently seed-only; writing real evidence rows from `matchupFact`/`draftFact`/`seasonStandingFact` (existing tables) makes imported history actually count toward legacy score. No schema.
3. **Broaden `LegacyEvidenceAggregator` to read the other imported facts** (`matchupFact`/`draftFact`/`transactionFact`), not just `seasonStandingFact`. No schema.

Each is independent and additive; #1 + #3 are the smallest, and #1 unblocks the most value.

## Explicitly NOT in scope / left untouched
- **Decision OS** integrations — untouched (per brief; it reads canonical-world, not these tables).
- **Provider expansion** — Sleeper only.
- **Anything needing schema** — e.g., a dedicated `import→evidence` provenance column, or new evidence types, would go through the schema checklist, not here.

## Remaining blockers
- **Validation is DB-gated.** Proving a real Sleeper import actually moves rank (the audit's real-Sleeper validation with `theciege24` / league `1204903552921649152`) requires the wired Neon test branch `import-test-sandbox` (`br-shiny-cloud-adgcljck`) + the smoke test green. Until `.env.test` is wired, wiring changes can't be end-to-end verified.
- **Ordering:** do the wiring (Part 3 implementation) *after* the audit is reviewed **and** the test DB is confirmed live, so each wired connection can be validated against real imported data rather than asserted.
- **Trigger cost:** a synchronous rank recompute inside the import commit could add latency to an already-slow import (see the fetch-perf work); the wiring should likely enqueue/refresh asynchronously — a design decision to confirm before implementing.
