# Gap & Migration Plan (Phase 5H)

Honest per-item status. **No migration was created or run.** Anything marked REQ-MIGRATION needs explicit authorization before running anywhere (never against production).

## Per-provider status
| Provider | AUDITED | IMPLEMENTED | VERIFIED | CERTIFIED | BLOCKED | Next |
|---|---|---|---|---|---|---|
| ESPN | ✅ | ✅ | ✅ | ✅ (schedules/games/stats) | — | maintain |
| Sleeper | ✅ | ✅ | ✅ | ✅ (players/rosters/txn/draft/identity) | — | REQ-NORMALIZE (move roster/txn/draft fetch into adapter) |
| FantasyCalc | ✅ | ✅ | ✅ | ✅ (identity) | — | REQ-WIRING: certify a `PlayerValue` table for values |
| Rolling Insights | ✅ | partial (legacy client) | ❌ | ❌ | credential/verification | verify → REQ-NORMALIZE → REQ-WIRING |
| CFBD | ✅ | partial (legacy) | ❌ | ❌ | verification | verify NCAAF (isolated pool) → normalize |
| TheSportsDB | ✅ | ❌ (no gateway adapter) | ❌ | ❌ | verification | build adapter (identity/imagery) |
| API-Sports | ✅ | partial (legacy `api-football`) | ❌ | ❌ | verification | per-sport adapters |
| ClearSports | ✅ | ❌ | ❌ | ❌ | capability unproven | prove capabilities individually |
| Yahoo/MFL/Fantrax/Fleaflicker | ✅ | import-only | n/a | n/a (out of sports-data scope) | — | keep import-only |

## Capability gaps
| Capability | Status | Blocker |
|---|---|---|
| player statistics (certified) | ✅ CERTIFIED (ESPN) | read-only; not a scoring input yet |
| player identity | ✅ 78.5% rows / 75.4% athletes | IDP gap (external); REQ additional source |
| positions (canonical) | governed module BUILT + sport-isolated + enforcement-locked (5H-b/5H-b2); adoption REQ-NORMALIZE | ~40 `team-abbrev` legality callers + valuation callers (→5H-c) still on legacy collapse; 0 migrated, each documented |
| images (canonical precedence) | REQ-NORMALIZE (+REQ-MIGRATION for `PlayerImage`) | fragmented; TheSportsDB blocked |
| valuations (certified table) | REQ-WIRING/REQ-MIGRATION | FantasyCalc verified, not persisted canonically |
| projections | model exists (`FantasyProjection`); population UNVERIFIED — keep UNAVAILABLE until proven | provider/model verification |
| injuries | ❌ not certified | no verified feed (RI blocked) |
| availability | ❌ missing | REQ-MIGRATION + provider |
| depth charts | ❌ missing | REQ-MIGRATION + provider (RI blocked) |
| decision-evidence audit table | REQ-MIGRATION (deferred since 5E) | authorization |

## Player/statistics table consolidation
`SportsPlayer` / `Player` / `FantasyPlayer` / `DevyPlayer` and `PlayerGameLogCache` / `PlayerSeasonStats` / `FantasyStatLine` are fragmented (Plane B) and run in parallel to the certified plane (Plane A). Unifying is **REQ-MIGRATION** — documented, not executed.

## Prioritized safe (no-migration) work — this and future increments
1. ✅ **DONE (5H):** enforce "no provider bypass in Decision OS / integration services / product routes" (`unified-plane-provider-boundary.test.ts`).
2. ✅ **DONE (5H-b):** move Sleeper roster/txn/draft fetch into `providers/sleeper.ts` (adapter purity) — zero provider URLs remain in gateway runtime; boundary test strengthened to enforce it.
3. ✅ **DONE (5H-b):** single governed canonical position module `canonical/canonicalPosition.ts` (detailed + league-rule-derived eligibility, IDP-aware, effective-dated). ✅ **DONE (5H-b2):** sport-isolation hardening (`SUPPORTED_POSITION_SPORTS`/`isSupportedPositionSport` — no cross-sport fallback) + repo-enforcement test (`unified-plane-provider-boundary.test.ts` fails on any NEW competing collapse map outside a documented allowlist) + governance contract tests. **RE-AUDIT (5H-b2) found 24+ competing maps; 0 were safely migratable this increment** — each retained with a documented reason (see `SPORTS_DATA_IMAGE_AND_POSITION_POLICY.md` ledger): `api-football`=SOCCER (sport isolation), `fantrax-parser`=verbatim CSV parse (nothing to normalize), `idp-kicker-values`/`dynasty-tiers`=valuation grouping (**→ Phase 5H-c**), `devy-classification`=NCAAF identity-matching heuristic, `team-abbrev.POSITION_CANONICAL`=shared collapsing normalizer ~40 roster-legality callers depend on (**governed per-caller migration**). **REMAINING:** (a) route valuation collapsing through 5H-c; (b) governed migration of the `team-abbrev` legality-collapse callers.
4. REQ-NORMALIZE: unify image resolution behind one precedence resolver — mostly safe (code); dedicated `PlayerImage` table is REQ-MIGRATION.
5. Provider verification increments (Rolling Insights → CFBD → API-Sports → TheSportsDB → ClearSports), each: real request → schema → normalize → canonical persist → certify → idempotency. **One provider per stacked PR.**
6. REQ-WIRING: canonical port layer + Decision OS/OS convergence off legacy tables.
7. REQ-MIGRATION items (player/stat consolidation, `PlayerImage`, `PlayerValue`, availability, depth charts, evidence audit) — **stop and request authorization** per item.

## Rule
Do not batch providers or migrations into one unsafe change. Each provider verification and each migration is its own reviewed, stacked increment. No production rollout while any provider is presented as connected while still `configured_not_verified`.
