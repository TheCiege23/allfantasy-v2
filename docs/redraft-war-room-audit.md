# Redraft AF War Room — Architecture Audit (Phase 1)

_Audited 2026-06-12 from `origin/main` @ `d045bd434`. All listed feature/default commits present and preserved._

This document is the **pre-build audit** required before implementing the Redraft AF War Room.
The companion build doc is [`redraft-af-war-room-audit.md`](./redraft-af-war-room-audit.md).

---

## 1. What already works (native redraft stack)

The app already has a **complete native redraft data layer** (not Sleeper-dependent):

| Concern | Owner | Status |
| --- | --- | --- |
| Season lifecycle | `prisma.RedraftSeason` + `app/api/redraft/season/route.ts` | ✅ live in DB |
| Rosters / players | `prisma.RedraftRoster`, `prisma.RedraftRosterPlayer` | ✅ live in DB |
| Standings | `prisma.RedraftRoster.{wins,losses,ties,pointsFor,pointsAgainst,streak,playoffSeed}` + `lib/redraft/standingsEngine.ts` | ✅ live |
| Schedule / matchups | `prisma.RedraftMatchup` + `lib/redraft/scheduleEngine.ts` | ✅ live |
| Scoring | `lib/redraft/scoringEngine.ts` (config-driven via `League.settings.sportConfig` + `SportConfig` categories) | ✅ live |
| Actual player stats | `prisma.PlayerWeeklyScore` (keyed `playerId|week|season|sport`, `isFinalized`) | ✅ when ingested |
| Waiver processing (FAAB/priority) | `lib/redraft/waiverEngine.ts::processWaiverWindow` | ✅ live |
| Trades | `prisma.RedraftTradeProposal/Asset/Vote/Decision`, `app/api/redraft/trade-*` | ✅ live |
| Playoffs | `prisma.RedraftPlayoff*` + `lib/redraft/playoffEngine.ts` | ✅ live |
| Roster template / lineup slots | `lib/league/getEffectiveLeagueRosterTemplate.ts` → `RosterTemplateDto.slots[]` | ✅ live |
| Deterministic lineup optimizer | `lib/lineup-optimizer/lineup-optimizer-engine.ts` (pure, strategy-aware) | ✅ reusable |
| Auth / membership | `lib/league/league-access.ts` (`assertLeagueMember`, `assertLeagueCommissioner`) | ✅ |
| AF subscription gate | `lib/redraft/ai/requireAfSub.ts` | ✅ |
| War Room tab (UI shell) | `app/league/[leagueId]/tabs/WarRoomTab.tsx` (tab id `war_room` exists for all sports) | ⚠️ dynasty/meta links only |

## 2. What is missing

- **Redraft-grounded AI recommendation engines.** `lib/redraft/ai/{startSitAnalyzer,waiverAnalyzer,tradeAnalyzer,…}.ts` are **stubs** that return `[]` / `"Analysis pending wiring."`. The AI routes under `app/api/redraft/ai/*` are wired to these stubs.
- **A canonical redraft context object.** `lib/league-decision-context.ts` exists but is **Sleeper + FantasyCalc (dynasty)** only — wrong data source for native redraft leagues and dynasty-valued.
- **Free-agent / waiver pool.** `app/api/redraft/players/route.ts` returns `{ players: [] }` (explicit placeholder). No native free-agent pool service.
- **Redraft trade values.** No redraft-season-horizon value model (FantasyCalc is dynasty).
- **War Room UI grounded in the league's own data.** The current tab links to dynasty trade analyzer, meta, mock draft — nothing reads this league's roster/standings/matchup.

## 3. What is partially built

- **Projections**: `prisma.FantasyProjection`, `prisma.AFProjectionSnapshot` tables exist but are populated only when a provider sync has run; fresh leagues have none.
- **Injuries/news**: `prisma.InjuryReport`, `prisma.PlayerNewsItem` (sports_core) exist; `RedraftRosterPlayer.injuryStatus` is a per-roster field that may be set. Not guaranteed populated.
- **Live stats**: `scoringEngine.lockPlayersAtGameStart` is a documented placeholder ("wire to live stats provider").
- **Cross-sport War Room**: `lib/war-room-command-center/*` + `app/api/ai-tools/war-room/dashboard/route.ts` exist for connected/portfolio leagues — separate concern from native-league War Room.

## 4. File ownership map

| Data | Owning file(s) |
| --- | --- |
| League defaults | `lib/league-concepts/redraftDefaults.ts`, `lib/league-concepts/resolveConceptPreset.ts`, `lib/sport-defaults/SportDefaultsRegistry.ts` |
| Scoring settings | `lib/redraft/scoringEngine.ts`, `League.settings.sportConfig`, `lib/sportConfig/*` |
| Roster settings / lineup slots | `lib/league/getEffectiveLeagueRosterTemplate.ts`, `lib/multi-sport/RosterTemplateService.ts` |
| Player stats (actual) | `prisma.PlayerWeeklyScore`, `lib/redraft/playerWeeklyScoreService.ts` |
| Projections / rankings | `prisma.FantasyProjection`, `prisma.AFProjectionSnapshot`, `prisma.AllFantasyAdpSnapshot` |
| Injuries / news | `prisma.InjuryReport`, `prisma.PlayerNewsItem`, `RedraftRosterPlayer.injuryStatus` |
| Schedules / matchups | `prisma.RedraftMatchup`, `lib/redraft/scheduleEngine.ts` |
| Standings / playoffs | `prisma.RedraftRoster`, `prisma.RedraftPlayoff*`, `lib/redraft/standingsEngine.ts`, `lib/redraft/playoffEngine.ts` |
| Waivers / free agents | `lib/redraft/waiverEngine.ts`, `app/api/redraft/players/route.ts` (placeholder) |
| Trades | `prisma.RedraftTradeProposal/Asset/Vote`, `app/api/redraft/trade-*`, `app/api/trade-evaluator/route.ts` (dynasty), `app/api/legacy/trade/analyze/route.ts` (dynasty) |
| AI prompts / routes | `lib/agents/prompts/{trade_analyzer_agent_prompt,chimmy_system_prompt}.md`, `app/api/chat/chimmy/route.ts`, `app/api/redraft/ai/*` |

## 5. Data-source liveness contract

| Source | Backing | Liveness for a fresh redraft league |
| --- | --- | --- |
| `scoringRules` | `League.settings.sportConfig` + `SportConfig` | **available** (static/config) |
| `rosterRules` | `getEffectiveLeagueRosterTemplate` | **available** |
| `standings` | `RedraftRoster` | **available** (live) |
| `schedule` | `RedraftMatchup` | **available** (live) |
| `playerStats` | `PlayerWeeklyScore` | **available** once games ingested; **missing** preseason |
| `projections` | `FantasyProjection` / `AFProjectionSnapshot` | **missing** until provider sync |
| `injuries` | `InjuryReport` + `RedraftRosterPlayer.injuryStatus` | **partial / missing** |
| `news` | `PlayerNewsItem` | **missing** until provider sync |
| `waiverPool` | free-agent route placeholder | **missing — needs provider integration** |
| `tradeValues` | none (redraft-specific) | **missing** — derived from projections/stats when present |

## 6. What the Redraft War Room can safely answer now

Using only live DB data (no fabrication):
- Roster construction vs. required starting slots (holes, bench depth, FLEX coverage).
- Bye-week stacking and rostered injury flags (from `RedraftRosterPlayer.byeWeek/injuryStatus`).
- Standings/record context, playoff seed, points-for/against, win-now vs. eliminated framing.
- Upcoming/recent matchup identification and projected/actual scores when present.
- Start/sit ordering **when** projections or season-to-date actuals exist.
- Trade roster-fit / slot-impact analysis between two named rosters.

## 7. What must return "data unavailable"

- Waiver/add recommendations naming **specific free agents** → no free-agent pool ⇒ `waiverPool: missing`.
- Projection-based start/sit when neither projections nor finalized stats exist ⇒ `needs_more_data`.
- Trade value verdicts when no projection/stat signal exists for the involved players ⇒ `needs_more_data`.
- Any injury "certainty", betting/odds, or invented stat line.

## 8. Tests run (pre-build)

Inventory only (no code changed yet). Relevant existing suites: `__tests__/nfl-redraft-*`, `league-trade-engine-validation`, `lineup-optimizer-engine`, `auto-sub-lineup-engine`.

## 9. Phase 2 TODOs

See [`redraft-af-war-room-audit.md` §Phase 2](./redraft-af-war-room-audit.md).
