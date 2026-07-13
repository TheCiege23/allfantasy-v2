# Provider Ingestion Matrix (Phase 5H Audit)

Source-of-truth audit of every configured provider. A provider is **VERIFIED** only after a real request succeeds → schema validates → normalization succeeds → canonical persistence succeeds → certified retrieval succeeds → idempotent rerun proven → no raw leak into product runtime. Credential presence alone ≠ verified.

## Legend
`AUDITED` inspected · `IMPLEMENTED` adapter/normalizer exists · `VERIFIED` real request+schema proven · `CERTIFIED` writes canonical certified snapshots consumed by runtime · `BLOCKED` credential/capability gap · `REQ-MIGRATION` needs schema change · `REQ-NORMALIZE` needs canonical normalizer · `REQ-WIRING` needs runtime port/consumer.

## Certified plane providers (gateway → `sports_data` schema)
| Provider | Status | Verified capabilities | Adapter | Certified? | Notes |
|---|---|---|---|---|---|
| **Sleeper** | production_connected | players (adapter); rosters/transactions/draft (runtime `db-first-exception`); espn_id crosswalk | `providers/sleeper.ts` + `runtime/{roster,transaction,draft}Runtime.ts` | ✅ CERTIFIED | roster/txn/draft fetch lives in runtime modules (marked exceptions), not the adapter — REQ-NORMALIZE (move into adapter) |
| **ESPN** | partial→verified | schedules, games, box-score statistics, team identity | `providers/espn.ts` | ✅ CERTIFIED | athlete ids need identity map; undocumented rate limits |
| **FantasyCalc** | verified | identity crosswalk (sleeperId+espnId), player values | `providers/fantasycalc.ts` | ✅ CERTIFIED (identity) | values are VERIFIED but not yet persisted to a certified values table — REQ-WIRING |

## Configured-but-unverified providers (legacy direct clients; NOT on the certified plane)
| Provider | Status | Declared capabilities | Legacy client | Certified? | Gap |
|---|---|---|---|---|---|
| **Rolling Insights** | configured_not_verified | players, teams, schedules, games, live_scores, statistics, injuries, depth_charts | `lib/upstream-apis.ts`, `lib/players/ri-players-server.ts` | ❌ | BLOCKED (no verified request) → then REQ-NORMALIZE + REQ-WIRING |
| **CFBD** (college FB) | configured_not_verified | college_players, teams, schedules, games, statistics | `lib/cfb-player-data.ts` | ❌ | BLOCKED → REQ-NORMALIZE; must isolate NCAAF from NFL pool |
| **TheSportsDB** | configured_not_verified | players, teams, team_branding, player_headshots | (scattered) | ❌ | BLOCKED → identity/imagery source; REQ-NORMALIZE |
| **API-Sports** | configured_not_verified | players, teams, games, live_scores, statistics | `lib/api-football.ts` | ❌ | BLOCKED; per-sport/product adapters needed → REQ-NORMALIZE |
| **ClearSports** | configured_not_verified | players, statistics | (none found) | ❌ | BLOCKED (capabilities unproven) |
| **OpenWeatherMap** | configured_not_verified | weather | `lib/upstream-apis.ts` | ❌ | out of core scope |
| **NewsAPI** | configured_not_verified | news | (scattered) | ❌ | out of core scope |

## Import-only providers (customer-authorized league context, NOT sports-data)
| Provider | Role | Notes |
|---|---|---|
| **Yahoo** | league import (OAuth) | league_data/rosters/transactions; no sports-data crosswalk |
| **MFL** | league import | mflId identity column exists; no ESPN crosswalk |
| **Fantrax** | league import | `lib/fantrax-parser.ts`; no crosswalk |
| **Fleaflicker** | league import | fleaflickerId column; no crosswalk |

## Honest summary
- **CERTIFIED & consumed:** ESPN, Sleeper, FantasyCalc (3).
- **Configured-but-UNVERIFIED (must not be presented as connected):** Rolling Insights, CFBD, TheSportsDB, API-Sports, ClearSports, OpenWeatherMap, NewsAPI (7).
- **Import-only (out of sports-data scope):** Yahoo, MFL, Fantrax, Fleaflicker (4).
- **Legacy direct-client modules exist** for RI/API-Sports/CFBD/ESPN/Sleeper and populate legacy Prisma tables — these are the current *production* inputs and run in parallel to the certified plane. Routing them through canonical certified persistence is REQ-WIRING/REQ-NORMALIZE (multi-increment).
