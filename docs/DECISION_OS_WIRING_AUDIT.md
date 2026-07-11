# Decision OS ↔ Sleeper Import + Rankings — Wiring Audit (Phase 5.1)

**Read-only audit.** No code changed. `main` @ `da8e5b57e`. Sleeper only. No provider expansion.

## TL;DR
Decision OS **on `main`** reads exclusively from **live game-state tables** (`AfLeagueTrade`, `AfRosterMoveHistory`, `DraftPick`, `DraftSession`, `WaiverClaim`). It reads **zero** import-domain tables and **zero** rank-domain tables. So the completed Sleeper import + Rankings wiring **cannot flow into Decision OS today** — the plumbing simply isn't there. Fortunately, two low-risk, no-schema wire-ups are available: (1) filter the intelligence lookback window by `ImportRun.completedAt`, and (2) surface persisted `ImportWarning` counts as a Decision OS data-quality signal on the health narrative. Everything larger needs the Canonical World substrate that only exists on other branches.

## What is Decision OS on `main`
Only `behavioral/` (20 files) and `presentation/` (5 files) exist here. Everything the memory index describes under `world/` (canonical substrate) / `manager-intelligence/` (Manager IPM) / `replay-insights/` (Replay Framework) is **absent from `main`** — those live on unmerged branches. So this audit only speaks to what's actually shippable in this workstream: the behavioral intelligence layer and its 6 `/api/v1/intelligence/*` routes.

### Behavioral intelligence surface
```
behavioral/facts.ts                  ← reads live game-state, aggregates facts
behavioral/league-intelligence.ts    ← LeagueBehavioralIntelligence (health/activity/retention)
behavioral/manager-intelligence.ts   ← ManagerBehavioralIntelligence (engagement/participation/nudges)
behavioral/platform-intelligence.ts  ← cross-league synthesis
behavioral/history/{snapshots,trend}.ts  ← trajectory over prior facts
behavioral/deadlines/deadlineIntelligence.ts
behavioral/api/{contracts,gate,resolvers,handlers,provider-selector,real-data-provider}.ts
```
Public exposure: `/api/v1/intelligence/{league,league/deadlines,league/managers,league/trend,manager,platform}` — **flag-gated** on `DECISION_OS_INTELLIGENCE_API_ENABLED=true` + API-key header.

### Presentation layer
`presentation/{tokens,types,cards,recommendations,api-presentation}.ts` — pure transform of intelligence → UI-shaped cards/recommendations. No storage.

## What data Decision OS actually reads (verified)
| Prisma model | Domain | Notes |
|---|---|---|
| `AfLeagueTrade` | live trades | trade activity signal |
| `AfRosterMoveHistory` | live roster edits | manager participation signal |
| `DraftPick` / `DraftSession` | live drafts | draft activity signal |
| `WaiverClaim` | live waivers | activity + participation |

## What Decision OS does NOT read (the disconnect)
| Domain | Tables | Wireable? |
|---|---|---|
| **Sleeper import history** | `dw_matchup_facts`, `dw_draft_facts`, `dw_season_standing_facts`, `transactionFact`, `rosterSnapshot`, `externalEntityMapping` | 🔴 disconnected |
| **Import run metadata** | `ImportRun`, `ImportWarning` | 🔴 disconnected |
| **Rank domain** (fed by Phase 3.1) | `legacyEvidenceRecord`, `legacyScoreRecord`, `managerXPProfile`, `seasonResult`, `hallOfFameEntry` | 🔴 disconnected |

Grep confirmed: **not a single reference** to any of these models exists in `lib/decision-os/` on `main`.

## Cross-audit implication for the previous phases
- **Phase 3.1 rankings wiring landed.** But Decision OS never reads the rank domain, so imported Sleeper history doesn't influence `LeagueBehavioralIntelligence` health/activity scores today.
- **Phase 2.3 warning persistence landed.** But Decision OS ignores `ImportWarning`, so a partially-incomplete import doesn't down-weight downstream intelligence.
- **Phase 4.2's post-import health surface** stops at the import UI; Decision OS doesn't see it either.

None of these were wrong to build — they served the import + rankings UX correctly. The gap is real and worth closing in a small future phase (below).

## What can be safely wired next — no schema, Sleeper-only
Two candidates, both additive, both testable against the existing Neon test branch:

### Wire-up A — lookback window respects import completion
**Where:** `behavioral/facts.ts` when computing the "since" window used by the assembler.
**What:** if there's a recent completed `ImportRun` for the league (query `where: { leagueId, provider: 'sleeper', status: 'completed' }` ordered by `completedAt desc`), and the current window bumps earlier than that, clamp/extend the window to include the imported season. Prevents a fresh import from being ignored on the very first health computation.
**Why safe:** additive read of `ImportRun` only. No schema. No behavior change when no import exists. Testable end-to-end on the Neon branch (write an `ImportRun` row, verify the intelligence window shifts).

### Wire-up B — import warnings as a data-quality signal
**Where:** `behavioral/league-intelligence.ts` narrative inputs.
**What:** add a `dataQuality: { importIncomplete: boolean; unresolvedWarnings: number }` field derived from `count(ImportWarning where leagueId = ? and severity in ('warn','error'))`. Surface this in the presentation layer so Decision OS cards can honestly say "some data is still incomplete" instead of implying perfect state.
**Why safe:** additive field on an existing intelligence type. Aggregate read only. Consumers that don't destructure it aren't affected. Testable via the same Neon path.

## What CANNOT be safely wired here
- **Reading `matchupFact`/`draftFact`/`seasonStandingFact` directly** — those are fact-table reads that duplicate the aggregations `behavioral/facts.ts` already does over the live tables. Doing them safely needs the Canonical World substrate to normalize concepts, and that lives on other branches.
- **Full manager-intelligence rank fusion** — feeding `careerXp`/`careerChampionships` into `ManagerBehavioralIntelligence` requires a schema decision (do we cache the rank snapshot on the intelligence object, or query live?). Belongs in a Phase 5.2+ where the schema checklist is up for review.
- **Anything reading Canonical World, Manager IPM, or Replay Insights** — those aren't on `main` (memo confirmed absent). Building on them here would require merging those branches first, which is a much larger workstream.

## Risk summary + honest gaps
- ✅ **Zero risk to production** if we implement A + B in a follow-up: pure additive reads, flag-gated intelligence API is already off by default (`DECISION_OS_INTELLIGENCE_API_ENABLED !== 'true'`).
- ⚠️ **Historic scope drift risk** the workstream discipline has avoided so far: don't try to fold Canonical World / Manager IPM / Replay into a `main`-only Decision OS surface. That's a merge decision, not a wiring decision.
- ⚠️ **Rank feedback loop absent.** Because Decision OS doesn't read the rank domain, the Phase 3.1 bridge doesn't propagate to Decision OS visuals — so a "Decision OS dashboard visuals" phase built now would show live-game intelligence but not import-fed rank context. Worth naming that in advance.

## Recommendation
1. **Approve Phase 5.2 as a small implementation PR** covering wire-ups A + B only (Sleeper-only, no schema, testable on the Neon branch).
2. **Do not start Decision OS dashboard visuals until 5.2 lands** — otherwise the visuals will honestly reflect only live-game state and can't show the import/rank context that the earlier phases wired up.
3. **Defer everything else** (rank-domain fusion, Canonical World reads, Manager IPM surfaces) until the branch merges are decided separately.

### Files this audit read
- `lib/decision-os/behavioral/{facts,league-intelligence,manager-intelligence,platform-intelligence,api/gate}.ts`
- `lib/decision-os/presentation/*.ts`
- `app/api/v1/intelligence/**/route.ts`

### Guardrails honored
- ✅ Read-only — no code changed
- ✅ Sleeper only
- ✅ No provider expansion
- ✅ No schema
- ✅ Sizes recommendations to what's safely wireable without migrations
