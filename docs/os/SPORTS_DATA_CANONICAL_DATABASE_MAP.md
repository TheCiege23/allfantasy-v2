# Canonical Database Map & Consolidation Plan (Phase 5H, Stop-Gate 3)

Maps the **real** database structures used for sports data. **Finding: data is fragmented across two parallel planes** — the certified gateway plane and legacy Prisma tables. No migration is created in this phase; migration-required work is documented for explicit authorization.

## Plane A — Certified gateway plane (`sports_data` schema, raw SQL via `SportsRuntimeStore`)
| Concept | Table | Fed by | Status |
|---|---|---|---|
| certified snapshots | `sports_data.sports_snapshot` | gateway sync runtimes | ✅ append-only |
| snapshot records | `sports_data.sports_snapshot_record` | " | ✅ resolved/ambiguous/unresolved classification |
| deterministic events | `sports_data.sports_event` (events runtime) | diff runtimes | ✅ |
| capabilities: players, rosters, transactions, games/schedules, draft_data, **statistics** | (as snapshots) | ESPN/Sleeper adapters | ✅ CERTIFIED |

## Plane B — Legacy Prisma tables (production-authoritative today)
| Concept | Model(s) | Notes |
|---|---|---|
| canonical players | `SportsPlayer`, `Player`, `FantasyPlayer`, `DevyPlayer` | **fragmented across 4 tables** |
| provider identities | `PlayerIdentityMap` (sleeper/espn/mfl/fantasyCalc/rollingInsights/apiSports/fleaflicker/clearSports ids), `PlatformIdentity` | espnId populated in 5F-c/d (7,642 rows) |
| canonical teams | `SportsTeam`, `TeamSeasonStats` | |
| player-team history | `PlayerTeamHistory` | effective-dated ✅ |
| positions | (no single model — scattered in code) | **REQ-NORMALIZE** |
| headshots | `SportsPlayer.imageUrl`, resolved via `player-assets/resolvePlayerHeadshot.ts` | fragmented |
| team logos | `TeamAsset.logoUrl` | |
| schedules/games | `SportsGame`, `FantasyScheduleGame` | two tables |
| player statistics | `PlayerGameLogCache`, `PlayerSeasonStats`, `FantasyStatLine` | **production scoring inputs** |
| player history | `PlayerSeasonStats`, `PlayerTeamHistory` | |
| fantasy values | (FantasyCalc via `lib/fantasycalc.ts`; `AiPlayerMarketMetric`) | not a certified values table — REQ-WIRING |
| projections | `FantasyProjection` (model, season, week, scoringPresetId) | separated ✅; population/verification TBD |
| injuries | `SportsInjury`, `InjuryReportRecord` | not certified |
| availability | (none) | ❌ missing |
| depth charts | (none canonical) | ❌ missing |
| provenance | snapshot `source`; `ProviderSyncState` | |
| correction history | append-only snapshots (Plane A); legacy tables overwrite | mixed |

## Fragmentation summary
- **Players live in ≥5 places:** `SportsPlayer`, `Player`, `FantasyPlayer`, `DevyPlayer`, + certified players snapshot.
- **Statistics live in ≥4 places:** `PlayerGameLogCache`, `PlayerSeasonStats`, `FantasyStatLine`, + certified statistics snapshot.
- **Two schedule tables, two-plane game state.**
- The certified plane (A) is **additive**; Plane B remains the production authority. They are not yet unified.

## Consolidation target (future, migration-gated)
```
Single canonical entity model per concept (player, team, game, stat, value, projection, injury, image, position)
  ← certified snapshots (append-only history) + effective-dated current view
  ← ALL providers via adapters → normalizers → identity resolver → certification
  → one canonical runtime port layer consumed by Decision OS + every OS
```

## Migration-required work (NOT run — needs explicit authorization)
1. Consolidate player tables (`SportsPlayer`/`Player`/`FantasyPlayer`) behind one canonical player + provider-id map (**REQ-MIGRATION**).
2. Canonical `PlayerPosition` table (detailed + eligibility) (**REQ-MIGRATION**).
3. Canonical `PlayerImage` table with source/precedence/validation (**REQ-MIGRATION**).
4. Certified `PlayerValue` (FantasyCalc) + `Projection` value tables separated from stats (**REQ-MIGRATION** if not reusing `FantasyProjection`).
5. Availability + depth-chart tables (**REQ-MIGRATION**).
6. A decision-evidence audit table (**REQ-MIGRATION** — deferred since Phase 5E).

**No migration was created or run in this phase.** All above are documented for authorization.
