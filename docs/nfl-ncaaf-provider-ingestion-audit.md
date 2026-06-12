# NFL/NCAAF Provider Ingestion Audit

Last updated: 2026-06-12

## Architecture Map

The active multi-provider chain is `lib/workers/api-chain.ts`. The `lib/sports-data/` directory is currently empty, so sports ingestion is implemented through the worker chain, provider wrappers in `lib/workers/providers/*`, direct provider helpers such as `lib/api-sports.ts` and `lib/rolling-insights.ts`, and the fantasy import services in `lib/fantasy-data/*`.

The chain order is:

- Non-image data: Rolling Insights -> TheSportsDB -> API-Sports -> ClearSports -> CFBD -> Sleeper -> ESPN.
- NFL images: TheSportsDB -> Sleeper -> API-Sports -> ClearSports -> Rolling Insights.
- Other sport images: ClearSports -> TheSportsDB -> API-Sports -> Rolling Insights -> Sleeper.

`api-chain` persists normalized rows for `players`, `injuries`, `news`, `teams`, `schedule`, and `scores`. Standings/rankings are cached in `SportsDataCache`; there is no `SportsStanding` Prisma model. Depth charts, weather, projections, fantasy values, game logs, and IDP stats have models or caches but are only partially wired by existing import paths.

`lib/scoring/deterministicFantasyScoring.ts` was not present in the repo during this audit.

## Provider Ingestion Matrix

| Data domain | Sport | Provider priority | Env var required | Existing code path | DB model/table written | Normalizer used | Cron/admin route | Current status | Evidence returned to AI | UI consumer | Test coverage | Fix needed |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Players | NFL | Rolling Insights, API-Sports, Sleeper | `ROLLING_INSIGHTS_API_KEY` or client creds; `APISPORTS_API_KEY` or `API_SPORTS_KEY` | `runSportsDataImporter`, `api-chain`, `rolling-insights.ts`, `sleeper-chain.ts` | `SportsPlayerRecord`, `SportsPlayer`, `PlayerIdentityMap` | provider-specific normalizers plus cache persist | admin fantasy import, cron import-players | working/partial | yes | PlayersTab, DraftTab, draft room, mock draft, AI | fantasy-data tests | Keep monitoring counts and identity joins. |
| Players | NCAAF | CFBD, API-Sports, Rolling Insights if enabled | `CFBD_API_KEY` or `CFBD_KEY`; `APISPORTS_API_KEY` or `API_SPORTS_KEY` | `runSportsDataImporter`, `cfbdProvider`, API-Sports player helpers | `SportsPlayerRecord`, `SportsPlayer`, `PlayerIdentityMap` | CFBD/API-Sports normalizers | admin fantasy import, cron import-players | partial/provider-limited | yes | beta player pool, devy/C2C, AI | fantasy-data tests | Provider coverage is thinner than NFL; beta banner should remain. |
| Teams | NFL | Rolling Insights, TheSportsDB, API-Sports, ClearSports | same provider keys | `api-chain`, `syncNFLTeamsToDb`, `syncAPISportsTeamsToDb` | `SportsTeam`, `TeamAsset` | cache persist and provider helpers | admin sports sync, sports sync | working/partial | yes | filters, scoreboards, draft room | provider-health tests | Run via domain import in fantasy import. |
| Teams | NCAAF | CFBD, API-Sports, TheSportsDB | `CFBD_API_KEY` or `CFBD_KEY`; API-Sports key | `api-chain`, `cfbdProvider`, `api-sports.ts` | `SportsTeam`, `TeamAsset` | provider helpers/cache persist | admin sports sync, sports sync | partial | yes | beta UI, scoreboards, AI | provider-health tests | Verify provider returns team IDs/logos. |
| Player headshots | NFL | TheSportsDB, Sleeper, API-Sports, ClearSports, Rolling Insights | optional TheSportsDB/ClearSports/API-Sports keys; Sleeper public | `api-chain` image ordering, draft player asset backfills | `SportsPlayerRecord.headshotUrl*`, `SportsPlayer.imageUrl` | provider image normalizers | admin sports sync, sports sync | partial | no | player cards, draft room | provider-health tests | Backfill missing headshots. |
| Player headshots | NCAAF | ClearSports, TheSportsDB, API-Sports | provider-specific | `api-chain` image ordering | `SportsPlayerRecord.headshotUrl*`, `SportsPlayer.imageUrl` | provider image normalizers | admin sports sync | provider-unavailable/partial | no | beta player cards | provider-health tests | Mark unavailable when provider lacks support. |
| Team logos | NFL | TheSportsDB, ClearSports, API-Sports, Rolling Insights | provider-specific | `api-chain`, `TeamAsset` consumers | `TeamAsset`, `SportsTeam.logo` | provider image/team normalizers | admin sports sync | partial | no | team logos, scoreboards | provider-health tests | Normalize to TeamAsset where possible. |
| Team logos | NCAAF | TheSportsDB, API-Sports, CFBD, ClearSports | provider-specific | `api-chain` | `TeamAsset`, `SportsTeam.logo` | provider image/team normalizers | admin sports sync | partial/provider-limited | no | beta UI | provider-health tests | Verify NCAAF logo support by provider. |
| Schedules | NFL | Rolling Insights, TheSportsDB, API-Sports | RI/API-Sports keys | `runScheduleImporter`, `api-chain`, direct cron | `SportsGame`, `GameSchedule` | schedule normalizers/cache persist | cron import-schedules, admin import | working/partial | yes | ScoresTab, AI, weather | fantasy-data tests | Domain import now invokes chain. |
| Schedules | NCAAF | CFBD, API-Sports, TheSportsDB | CFBD/API-Sports keys | `runScheduleImporter`, `cfbdProvider`, `api-chain` | `SportsGame`, `GameSchedule` | CFBD/API-Sports normalizers | cron import-schedules, admin import | partial | yes | beta schedule, AI | fantasy-data tests | Continue partial status when CFBD/API-Sports rows absent. |
| Scores | NFL | TheSportsDB, API-Sports | API-Sports or TheSportsDB | `api-chain`, cron import-scores | `SportsGame`, `GameSchedule` | game normalizers/cache persist | cron import-scores, admin sports sync | partial | yes | ScoresTab, AI | provider-health tests | Out-of-season counts may be zero. |
| Scores | NCAAF | CFBD, API-Sports, TheSportsDB | CFBD/API-Sports | `api-chain`, cron import-scores | `SportsGame`, `GameSchedule` | game normalizers/cache persist | cron import-scores | partial | yes | beta scoreboards, AI | provider-health tests | Same as schedules. |
| Standings/rankings | NFL | API-Sports, TheSportsDB | API-Sports | `api-chain`, cron import-standings | `SportsDataCache` | cache payload | cron import-standings | partial | yes | AI/admin diagnostics | provider-health tests | No `SportsStanding` model; cache-only is honest. |
| Standings/rankings | NCAAF | CFBD, API-Sports | CFBD/API-Sports | `api-chain`, cron import-standings | `SportsDataCache` | cache payload | cron import-standings | partial/provider-limited | yes | AI/admin diagnostics | provider-health tests | Consider normalized standings model later if UI requires. |
| Injuries | NFL | API-Sports, ESPN, Rolling Insights | API-Sports | `runInjuryImporter`, `api-chain`, cron import-injuries | `InjuryReportRecord`, `SportsInjury` | injury normalizers/cache persist | cron import-injuries, admin import | working/partial | yes | player cards, draft, start/sit, AI | fantasy-data tests | Keep dual model evidence. |
| Injuries | NCAAF | API-Sports, ESPN where available | API-Sports | `runInjuryImporter`, `api-chain` | `InjuryReportRecord`, `SportsInjury` | injury normalizers/cache persist | cron import-injuries | provider-limited | yes | beta player cards, AI | fantasy-data tests | Mark unavailable when provider gives no rows. |
| Depth charts | NFL | Rolling Insights | Rolling Insights | `syncNFLDepthChartsToDb`, cron import-depth-charts | `DepthChart` | RI depth chart normalizer | cron import-depth-charts, admin import | partial | yes | draft advisor, AI | provider-health tests | Admin fantasy import now attempts NFL depth charts. |
| Depth charts | NCAAF | provider support unclear | CFBD/API-Sports if available | none confirmed | `DepthChart` | none confirmed | none specific | provider-unavailable | yes as missing | beta AI | provider-health tests | Keep missing evidence; add provider only after endpoint confirmed. |
| News | NFL | Rolling Insights, TheSportsDB, ESPN, NewsAPI, ClearSports | NewsAPI optional | `runNewsImporter`, `api-chain`, sports news helpers | `PlayerNewsRecord`, `SportsNews` | news importer normalizer | cron import-news, admin import | working/partial | yes | player cards, AI | fantasy-data tests | AI digest now includes latest rows. |
| News | NCAAF | TheSportsDB, ESPN, NewsAPI, CFBD where available | NewsAPI optional | `runNewsImporter`, `api-chain` | `PlayerNewsRecord`, `SportsNews` | news importer normalizer | cron import-news, admin import | partial/provider-limited | yes | beta AI | fantasy-data tests | Use available provider rows only. |
| Weather | NFL | OpenWeatherMap | `OPENWEATHERMAP_API_KEY` | `lib/weather/*`, sports weather routes, GameSchedule weather | `WeatherCache`, `GameSchedule.weather` | weather service normalizers | `/api/sports/weather`, `/api/start-sit/weather` | partial | yes | ScoresTab, start/sit, AI | provider-health tests | No dedicated cron route; missing weather should not block advice. |
| Weather | NCAAF | OpenWeatherMap when venue/location known | `OPENWEATHERMAP_API_KEY` | weather service routes | `WeatherCache`, `GameSchedule.weather` | weather service normalizers | sports weather routes | partial/provider-limited | yes | beta AI | provider-health tests | Needs venue/stadium coordinates to attach consistently. |
| ADP | NFL | Sleeper/FantasyCalc/AllFantasy consensus | public/Sleeper plus local data | `runAdpImporter`, cron adp-refresh | `AdpDataRecord`, `SportsPlayerRecord.adp` | ADP importer | cron adp-refresh, admin import | working/partial | yes | DraftTab, draft room, mock draft, AI | fantasy-data tests | Continue refresh cadence. |
| ADP | NCAAF | limited mainstream provider support | none reliable | importer returns zero | `AdpDataRecord` if rows exist | ADP importer | admin import | provider-unavailable | yes as missing | devy/C2C beta | fantasy-data tests | Keep honest zero count until source exists. |
| Projections | NFL | ClearSports, Rolling Insights, AllFantasy | provider-specific | models exist; chain can cache projections | `FantasyProjection`, `AFProjectionSnapshot` | partial | admin sports sync | missing/partial | yes as missing/present | player cards, start/sit, AI | provider-health tests | Need provider-backed projection sync before citing values. |
| Projections | NCAAF | provider-limited | provider-specific | none confirmed | `FantasyProjection`, `AFProjectionSnapshot` | none confirmed | admin sports sync | provider-unavailable | yes as missing | beta AI | provider-health tests | Keep unavailable until provider support is confirmed. |
| Fantasy values | NFL | Rolling Insights, Sleeper/ADP, AllFantasy | RI optional | `SportsPlayerRecord.adp/dynastyValue`, ADP importer | `SportsPlayerRecord`, `AdpDataRecord` | player/ADP normalizers | admin import, adp cron | partial | yes | draft room, AI | provider-health tests | Dedicated valuation source remains partial. |
| Fantasy values | NCAAF | provider-limited | none reliable | none confirmed | `SportsPlayerRecord`, `AdpDataRecord` | partial | admin import | provider-unavailable | yes as missing | beta AI | provider-health tests | Keep beta/missing state. |
| Season stats | NFL | Rolling Insights, API-Sports | RI/API-Sports | `syncNFLPlayersToDb`, `syncNFLTeamStatsToDb`, API-Sports stats helpers | `PlayerSeasonStats`, `TeamSeasonStats` | provider stats normalizers | admin import/sports sync | partial | yes | player cards, draft advisor, AI | provider-health tests | Admin import now attempts NFL team stats. |
| Season stats | NCAAF | CFBD, API-Sports | CFBD/API-Sports | helpers exist; orchestration partial | `PlayerSeasonStats`, `TeamSeasonStats` | provider stats normalizers | admin sports sync | partial/provider-limited | yes | beta AI | provider-health tests | Add focused CFBD stats ingestion if needed. |
| Game logs | NFL | Sleeper/API-Sports | API-Sports optional | `PlayerGameLogCache`, stats helpers | `PlayerGameLogCache`, `PlayerGameStat` | cache/stat normalizers | admin sports sync | partial | yes | player cards, start/sit, AI | provider-health tests | Add full per-game stat cron if needed. |
| Game logs | NCAAF | CFBD/API-Sports | CFBD/API-Sports | helpers partial | `PlayerGameLogCache`, `PlayerGameStat` | partial | admin sports sync | provider-limited | yes | beta AI | provider-health tests | Same as season stats. |
| Defensive/IDP stats | NFL | API-Sports, Rolling Insights | API-Sports/RI | stats models can store defensive positions | `PlayerSeasonStats`, `PlayerGameStat` | stats normalizers | admin sports sync | partial/missing | yes | IDP AI, draft advisor | provider-health tests | Need explicit IDP stat coverage tests. |
| Defensive/IDP stats | NCAAF | CFBD/API-Sports | CFBD/API-Sports | none confirmed | `PlayerSeasonStats`, `PlayerGameStat` | partial | admin sports sync | provider-limited | yes as missing | beta AI | provider-health tests | Keep provider-limited. |

## What Was Already Working

- Cron auth is centralized through `requireCronAuth` and accepts cron/admin bearer secrets.
- `api-chain` already provides fallback ordering, cache writes, and normalized writes for core sports rows.
- Direct cron routes exist for players, schedules, scores, standings, injuries, depth charts, news, and ADP refresh.
- Draft room and mock draft already read DB-first player pools, ADP, injuries, and image fields.
- `leagueSportsGroundingPacket` already loads deterministic league settings, managers, draft status, player pool, ADP, and injury evidence.

## Completed In This Pass

- Added per-sport provider health diagnostics exposed through `GET /api/admin/fantasy-data/status`.
- Added domain-level provider-chain import orchestration for teams, schedules, scores, standings, news, images, projections, and fantasy values.
- Expanded fantasy evidence to include teams, scores, standings, news, weather, projections, fantasy values, depth charts, season stats, game logs, and IDP stats.
- Fixed NCAAF import summaries to return `sport: "NCAAF"` instead of the previous typed `"NFL"` placeholder.
- Added NFL depth chart/team stats attempts to the high-level NFL fantasy import.
- Added news/domain chain attempts to NFL and NCAAF fantasy imports.
- Added AI grounding digests for provider health, news, weather, schedules, and standings.
- Added deterministic league-data-usage answer support to the Chimmy route and injected the grounding packet into the route context when a league is present.

## Remaining Provider Limitations

- Standings/rankings are cache-backed because no `SportsStanding` model exists.
- Projection and fantasy value coverage depends on provider-backed rows. The AI must mark these domains missing/stale when rows are absent.
- NCAAF ADP, projections, depth charts, headshots, injuries, and game logs remain provider-limited and should stay in beta/missing state when no rows are present.
- Weather has route/service support but no dedicated cron route; missing weather is non-blocking evidence.

## Final Verification - 2026-06-12

Classification: **partially wired and DB-backed, but not production-verified**.

`origin/main` contains `10f8b8a57` via current HEAD `1c400a659`, but the accessible Vercel project is `allfantasy-v2`, not `allfantasy-v2-main`. Its current production deployment for `www.allfantasy.ai` is `dpl_CgQriyJXhDhrBGDJqfZTqCtiNF7c`, created 2026-05-26 from branch `visual/brackets-world-cup-premium-pass` at commit `5883720`, so it does not prove this ingestion/evidence work is live. A separate deploy hook accepted a job for project `prj_xMYOVacH6URCKx5ZDa8XbOFq4oHm`, but that project is not inspectable through the currently linked Vercel CLI account/project.

| Area | Status | Evidence | Blocker / fix needed |
| --- | --- | --- | --- |
| Git/origin | working | `origin/main` resolves to `1c400a659bf3c74143c3e40be70130b240ec0b51`, which includes `10f8b8a57`. | None for source availability. |
| Production deploy | blocked by deploy/build | Accessible production alias `www.allfantasy.ai` points to an older May 26 deployment from commit `5883720`. | Deploy current `main` to the real production project and inspect the resulting deployment logs. |
| Local Vercel build | blocked by build | `npm run vercel-build` passed `world-cup-launch-typecheck` but failed in Next/webpack on Windows with `EISDIR: illegal operation on a directory, readlink 'F:\allfantasy-v2-main'`. | Reproduce on Linux/Vercel for current `main`; do not treat the older Ready deployment as proof. |
| Vercel route availability | partial | `scripts/vercel-next-build.cjs` excludes `app/api/cron` except a small keep-list; import players/schedules/standings/scores/injuries/depth-charts/news/adp routes are temporarily removed during build. | Cron import routes are source-wired but not available in the current Vercel build strategy. Use admin routes or revise route-budget exclusions. |
| Env readiness | working/partial | Local `.env.local` has Rolling Insights, `API_SPORTS_KEY`, CFBD, ClearSports, OpenWeatherMap, and cron/admin secrets. Vercel env names also include these. | NFL/NCAAF API-Sports code uses `APISPORTS_API_KEY` or `API_SPORTS_KEY`; `X_RAPIDAPI_KEY` exists in Vercel but is not the active wrapper alias. |
| Admin fantasy import/status routes | working | `POST /api/admin/fantasy-data/import` and `GET /api/admin/fantasy-data/status` use `requireAdminOrBearer`; status loads evidence + provider health; import dispatches NFL/NCAAF importers. | Needs live production deployment before production-route smoke. |
| Admin sports sync routes | working/partial | `POST /api/admin/sports/sync` runs schedule, injury, news, player, game-log, and identity jobs and records provider sync state. `POST /api/sports/sync` directly calls RI/API-Sports/API-Football/ClearSports helpers and returns diagnostics. | `/api/sports/sync` direct route is broader/legacy and not a full SyncJobRun logger. |
| Cron import routes | source-wired, production-blocked | Each audited cron route uses `requireCronAuth` and structured `ok`/count/error responses. Routes call the intended importer/provider helper. | Excluded from Vercel build, so source presence does not equal production availability. |
| NFL DB persistence | partial/working by domain | DB counts: `SportsPlayerRecord` 8,653; `SportsPlayer` 5,951; player images 5,184; headshots 408; teams 66; standings cache 32; injury rows 573 + 458; news 612 + 679; weather 72; ADP 11,594; game-log cache 5. | Missing current-season NFL `SportsGame` schedules/scores, `TeamAsset` logos, depth charts, projections, season stats, IDP stats. Most player/injury/news/ADP rows are stale from late April/early May. |
| NCAAF DB persistence | partial/provider-limited | DB counts: `SportsPlayer` 61,219; teams 261; `SportsGame` schedules/scores 97; injuries 8 + 1; news 143 + 634. | No NCAAF `SportsPlayerRecord`, headshots, logos, standings cache, weather, ADP, projections, depth charts, season stats, game logs, or IDP stats in the verified DB. |
| Evidence snapshot | working after audit fixes | `fantasyDataEvidence` now reads ADP from `createdAt/source`, counts uppercase/lowercase standings cache keys, and avoids selecting missing `player_game_stats.source`. | Freshness still uses the latest domain timestamp, so domain-level stale statuses must be read alongside headline freshness. |
| Provider health | working after audit fixes | `providerHealth` now sees uppercase `NFL:standings:*` cache rows and reports domain counts/staleness. | Domains with zero rows remain missing/provider-limited. |
| League sports grounding packet | working after audit fixes | Real league `6d4c1c94-eb33-4002-a22b-4e0e8e28c027` produced deterministic context: NFL, redraft, snake, 12 teams, pre-draft, player/ADP/injury/news/weather/standings evidence, top ADP players from `AdpDataRecord`. | The verified league has no `LeagueTeam` manager rows; schedule/projections are missing; canonical scoring resolves to `fb_half_ppr` even though the league row label says `PPR`. |
| Chimmy league chat data-usage answer | working locally | The deterministic answer did not fall back to "without your specific league settings"; it cited league settings and provider domain counts. | Needs authenticated production smoke after current code is deployed. |
| Best available players prompt | partial | Grounding packet now includes top ADP rows: Ja'Marr Chase, Josh Allen, Jonathan Taylor, Saquon Barkley, Bijan Robinson. | Availability is a pool summary, not draft-room drafted-player exclusion for that league unless roster/draft state is populated. |
| Injury/news/weather prompts | partial | Packet includes 20 top injuries, 8 news rows, and 8 weather rows for NFL. | Injury/news are stale; some old test-like injury rows exist and should be cleaned/backfilled before relying on production advice. |
| NCAAF/devy/C2C prompts | partial/provider-limited | Evidence can honestly report beta/pending domains and NCAAF DB counts where rows exist. | NCAAF fantasy-specific player pool/ADP/projections/depth charts remain unavailable. |
| UI surfaces | partial | Players/Draft/League chat/admin diagnostics can consume persisted player, ADP, injury, news, weather, and provider health evidence. | UI cannot show missing domains; cron-backed freshness is not production-active while cron routes are excluded. |
| Tests | partial | `npm run test -- __tests__/fantasy-data` passed 7 files / 54 tests; `npm run test -- __tests__/chimmy-context` passed 12 files / 134 tests. | `npm run test -- __tests__/league` failed 5 tests unrelated to the evidence readers: stale string-contract tests and league-create mock/response-shape drift. |

Highest-priority next fix: deploy current `main` to the actual production Vercel project, then decide whether the NFL/NCAAF import cron routes should be kept in production or replaced with admin/API worker scheduling. After that, run a real authenticated Chimmy smoke against a populated league and backfill current-season NFL schedules/scores/projections/depth charts.
