# Best Ball AF War Room — Audit & Data-Path Decision

_Audited 2026-06-14 against live Neon. Best ball is its OWN format: draft-only, AUTOMATIC
optimal lineup (no manual start/sit), depth/ceiling/correlation-driven. No fabrication of
stats, projections, ADP, stacks, correlations, exposure, or bye weeks._

## Existing best-ball infrastructure

| Area | Status | Notes |
| --- | --- | --- |
| Best-ball rules/profiles | **complete** | `lib/bestball/rules.ts` — `getBestBallSportProfile(sport)` (lineupSlots = auto-optimal-lineup definition, recommendedRosterSize/benchSize, scoringPeriod, notes), `normalizeBestBallSettings`, `getDefaultBestBallSettings`, `buildBestBallSettingsSummary`. waivers/trades/subs default OFF. |
| League creation / settings | **complete** | `League.bestBallMode` + `bestBallVariant` + `settings.best_ball_settings`; `bbMatchupFormat`, `bbScoringPeriod`. |
| Optimal lineup engine | **complete** | `lib/bestball/leagueOptimizer.ts` `optimizeBestBallLeagueLineup(sport, players[])` → starters/bench by best-ball slots (reuses `LineupOptimizerEngine` + soccer formation optimizer). The AUTO lineup is deterministic. |
| Best-ball league API | **complete** | `app/api/leagues/[leagueId]/bestball/route.ts` — weekly lineups (with `bestBallSlot` starter marks), standings, history, rosterComposition. Reads legacy `Roster.playerData` + `weeklyScore`/`teamWeekResult`/`fantasyStanding`. |
| Contest/portfolio layer | **complete (separate product)** | `BestBallContest`/`BestBallEntry`/`BestBallPod`/`BestBallOptimizedLineup`/`BestBallSportTemplate` — tournament portfolios. NOT the per-league War Room concern. |
| Roster source | **complete** | Legacy `Roster.playerData` (draft-only). Entries carry `playerId`/`playerName`/`position`/`team`/`byeWeek` (via `draft-to-roster-sync`) in `lineup_sections` or a flat `players[]`. |
| Roster grader (AI) | **stub** | `lib/bestball/ai/rosterGrader.ts` returns placeholder 'B' grades; `lib/bestball/ai/draftAssistant.ts` exists. Real validator: `validateBestBallRoster` + `BestBallSportTemplate`. |
| Player value / ADP | **available** | redraft ADP (`AllFantasyAdpSnapshot` leagueType=`redraft`) — best ball is single-season draft value. ADP-implied round = ceil(adp/teamCount). |
| Projections / weekly scores | **available (when played/synced)** | `fantasyProjection` + `weeklyScore`/`playerWeeklyScore` → real spike-week ceiling/variance when present. |
| Injuries / news | **available** | `fetchRedraftInjuryNews` (real, by name). |
| Stack / correlation data | **available (team-based)** | `SportsPlayer.team` → same-NFL-team groupings (QB + pass-catcher stacks) are REAL correlation. |
| Bye-week data | **provider-limited** | bye weeks only present when `playerData` entries carry `byeWeek`; no league-wide bye schedule table → mark limited when absent, never fabricated. |
| Waiver / trade permission | **complete** | `settings.best_ball_settings.waiversEnabled` / `tradesEnabled` (default OFF). Actions disabled truthfully when off. |
| Frontend tab | **partial** | `BestBallTab` shows lineups/standings/history; no War Room (construction/upside/draft/stacks) panel. |
| AI / Chimmy grounding | **missing** | no best-ball grounding adapter in `app/api/chat/chimmy/route.ts`. |
| Entitlement / gating | **complete** | same `war_room_draft_strategy` / AF War Room gate as the other formats. |
| Best Ball War Room (intelligence layer) | **missing** | no `lib/best-ball-war-room`, no context/engines/prompt/routes/panel. |

## Step 3 — data-path decision (native best ball)

| Concern | Authoritative source |
| --- | --- |
| Detection | `League.bestBallMode === true`. |
| Roster | legacy `Roster.playerData` (`lineup_sections` ∪ flat `players[]`); enrich position/team via `SportsPlayer` (by id → name). Draft-only; no manual lineup. |
| League settings | `normalizeBestBallSettings(settings.best_ball_settings)` + `getBestBallSportProfile(sport)`. |
| Scoring | best-ball scoring (auto-optimal). `bbMatchupFormat` / `bbScoringPeriod`. |
| **Automatic optimal lineup** | `optimizeBestBallLeagueLineup(sport, players)` (reused) — the lineup is AUTO; the War Room explains it, never offers start/sit. |
| Player value | redraft ADP (`AllFantasyAdpSnapshot` leagueType=`redraft`); ADP-implied round = ceil(adp/teamCount). |
| Projections / weekly scores | `fantasyProjection` + `weeklyScore`/`playerWeeklyScore` → spike-week ceiling/variance when present; else ADP proxy (flagged). |
| Injuries / news | `fetchRedraftInjuryNews`. |
| **Stacks / correlation** | `SportsPlayer.team` groupings (same team) — real. Bye clustering only when `byeWeek` present → limited otherwise. |
| Waiver / trade permission | `settings.best_ball_settings.{waiversEnabled,tradesEnabled}` — actions disabled when off. |
| Auth / membership | `resolveLeagueAccess` (legacy `Roster.platformUserId`). |
| Global Chimmy context | new Best Ball War Room context/engines/prompt. |

**Decision:** Build a **native** Best Ball War Room (`lib/best-ball-war-room`) over the legacy
`Roster` draft roster + best-ball profile (optimal-lineup slots + recommended sizes) +
redraft ADP + (when present) weekly scores for spike-week ceiling + `SportsPlayer.team`
stacks. It focuses on ROSTER CONSTRUCTION, DEPTH, UPSIDE/CEILING, DRAFT PLAN, STACK/CORRELATION,
and explains the AUTOMATIC lineup. It NEVER offers manual start/sit. Waivers/trades surface
only when league rules enable them. Bye-week clustering and true variance are honestly marked
limited when the backing data is absent.

## Classification summary
- **complete:** rules/profiles, settings, optimal-lineup engine, best-ball league API,
  roster source, ADP/injuries/news/stack(team) providers, entitlement.
- **available (wire it):** redraft ADP, weekly-score spike-week ceiling, same-team stacks.
- **stub/partial:** roster grader AI, best-ball frontend (no War Room panel).
- **provider-limited:** bye-week clustering (no bye schedule unless playerData carries it),
  true weekly variance pre-season (ADP proxy until scores exist), portfolio exposure
  (contest-layer only, out of scope for the per-league War Room).
- **missing/to build:** Best Ball War Room context, engines, prompt, consolidated routes,
  global-Chimmy grounding, frontend panel, runtime seed + E2E.

## Build plan (mirrors redraft/dynasty/keeper)
`lib/best-ball-war-room/{types,bestBallWarRoomContext,bestBallValue,bestBallWarRoomPrompt,bestBallChimmyGrounding}`
+ engines (`rosterConstruction, depth, upside, draftPlan, stackCorrelation, waiver, trade, risk`)
→ `GET /api/leagues/[leagueId]/best-ball-war-room` + `POST .../[action]` →
`BestBallWarRoomPanel` in `WarRoomTab` → seed + `e2e/best-ball-war-room-runtime.spec.ts`.
**No start/sit action anywhere.**
