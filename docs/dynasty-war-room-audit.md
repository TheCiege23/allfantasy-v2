# Dynasty AF War Room — Audit & Data-Path Decision

_Audited 2026-06-13 against live Neon. Mirrors the redraft War Room standard. Dynasty-only;
no redraft short-season logic for asset values. No fabrication; NFL/NCAAF pools never mix._

## Existing dynasty infrastructure

| Area | Status | Notes |
| --- | --- | --- |
| Dynasty defaults | **complete** | `lib/league-concepts/dynastyDefaults.ts`, `lib/dynasty-core/*Presets`, `DynastySettingsService` |
| League creation / settings | **complete** | `League.isDynasty` + `leagueVariant`; `getEffectiveDynastySettings`, taxi settings service |
| Roster / taxi / pick models | **partial** | Native rosters use legacy `Roster` (`playerData.playerIds`) + `LeagueTeam`; taxi via `DevyTaxiSlot`/taxi settings; **`FutureDraftPick`/`RookieDraftWindow` tables MISSING in this DB (P2021)** → pick capital provider-limited |
| Sleeper + FantasyCalc decision context | **complete (connected leagues)** | `lib/league-decision-context.ts` builds WIN_NOW/REBUILD/MIDDLE + needs/surplus + pickCapital + partnerFit from **Sleeper rosters + FantasyCalc**. Used by `app/api/trade-evaluator/route.ts` for connected leagues — NOT a native-league context. |
| Dynasty trade analyzer | **complete (connected)** | `app/api/trade-evaluator/route.ts` (FantasyCalc-powered, dynasty-aware) |
| Chimmy dynasty context | **stub (settings-only)** | `lib/dynasty-core/dynastyContextForChimmy.ts` explains playoff/SF/taxi/rookie-draft settings only — **no value/roster/trade/buy-sell grounding** |
| Dynasty War Room (intelligence layer) | **missing** | no `lib/dynasty-war-room`, no context/engines/routes/panel |
| Player values / rankings | **available** | `AllFantasyAdpSnapshot` leagueType='dynasty' (96 NFL rows) + FantasyCalc dynasty (live API) |
| Player ages / trajectory | **available** | `SportsPlayer.age` (1,484 NFL with age), `dob` |
| Injuries / news | **available** | `injury_reports` (`InjuryReportRecord`) + `player_news` (`PlayerNewsRecord`) — reuse redraft helper |
| Weekly scores / projections | **seed/sync-only** | `player_weekly_scores` (service+cron) / `fantasy_projections` (seed) — only matters for contender start/sit |
| Free-agent pool | **available** | dynasty ADP players minus rostered (same pattern as redraft, dynasty leagueType) |
| Frontend dynasty tab | **partial** | `WarRoomTab` renders dynasty/meta links today; no native dynasty War Room panel |
| Subscription / entitlement | **complete** | same `war_room_draft_strategy` / AF War Room gate as redraft |

## Step 3 — data-path decision (native dynasty)

| Concern | Authoritative source |
| --- | --- |
| Roster | **legacy `Roster`** (`playerData.playerIds`) + `LeagueTeam` (record/standings). Dynasty leagues do **not** use `RedraftSeason` (verified: 0 of 4 dynasty leagues have a redraft season). |
| League settings | `League` row + `getEffectiveDynastySettings` + `League.settings` |
| Player value / ranking | **`AllFantasyAdpSnapshot` (leagueType='dynasty')** — deterministic, cached, sport-isolated; the dynasty analog of redraft ADP. (FantasyCalc live remains the connected-league path via `trade-evaluator`.) |
| Player age / trajectory | `SportsPlayer.age` / `dob` joined by name |
| Future picks | `FutureDraftPick` (**table missing here → provider-limited flag**, never fabricated) |
| Free agents | dynasty-ADP players minus rostered (name+pos exclusion) |
| Injuries / news | `injury_reports` / `player_news` (real, by name) — reuse `redraftInjuryNews` helper |
| Global Chimmy context | new dynasty War Room context/engines/prompt (the existing settings-only `dynastyContextForChimmy` stays for rules explanation) |

**Decision:** Build a **native** dynasty War Room (legacy `Roster` + dynasty ADP value + ages),
mirroring the redraft architecture, with dynasty-appropriate signals (value/age/direction/picks)
instead of weekly projections/short-season. Connected/Sleeper leagues keep using
`league-decision-context` + `trade-evaluator`; the native War Room does not flatten to redraft values.

## Classification summary
- **complete:** defaults, settings, entitlement, connected-league decision context + trade evaluator.
- **available (wire it):** dynasty ADP values, ages, injuries/news, free-agent pool.
- **missing/provider-limited:** `FutureDraftPick`/`RookieDraftWindow` (pick capital), live weekly projections.
- **to build:** dynasty War Room context, engines, routes, prompt, panel, global-Chimmy grounding, seed, runtime.

## Build plan (mirrors redraft)
`lib/dynasty-war-room/{types,dynastyWarRoomContext,playerValue,dynastyFreeAgentPool}` + engines
(`teamDirection,rosterNeeds,trade,tradeFinder,waiver,lineup,pickValue,buySellHold`) + `dynastyWarRoomPrompt`
+ `dynastyChimmyGrounding` → `GET /api/leagues/[leagueId]/dynasty-war-room` + `POST .../[action]` →
dynasty panel → seed + `e2e/dynasty-war-room-runtime.spec.ts`.
