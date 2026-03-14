# Sport Defaults Core Registry

## Overview

The Sport Defaults Core Registry is a **centralized, backend-first** system so each sport (NFL, NBA, MLB, NHL, NCAA Football, NCAA Basketball) can automatically load league-specific defaults during league creation. It does not replace existing NFL logic; it extends it so all sports get consistent treatment.

## Goals

- **League creation** — When a user selects a sport, the app loads the correct league settings, roster slots, scoring rules, draft defaults, and waiver defaults for that sport.
- **Single source of truth** — Defaults live in shared TypeScript config (and optionally DB templates); both API and frontend consume the same backend services.
- **No hardcoding in frontend** — Frontend calls `GET /api/sport-defaults?sport=NBA&load=creation` (or equivalent) and prefills forms; all domain logic stays in the registry.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  League Creation (API / UI)                                      │
│  POST /api/league/create { sport?, name?, leagueSize?, ... }     │
│  GET  /api/sport-defaults?sport=NFL&load=creation                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  LeagueCreationDefaultsLoader                                    │
│  loadLeagueCreationDefaults(leagueSport) → full payload           │
└────────────────────────────┬────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌─────────────────┐  ┌──────────────────┐  ┌─────────────────────┐
│ SportLeague     │  │ SportDefaults     │  │ MultiSportLeague    │
│ PresetService   │  │ Resolver          │  │ Service (templates)  │
│ getFullLeague   │  │ resolveSport      │  │ getLeagueCreation    │
│ Preset(sport)   │  │ Defaults(sport)   │  │ Preset(sport)        │
└────────┬────────┘  └────────┬─────────┘  └─────────────────────┘
         │                    │
         │                    ▼
         │           ┌─────────────────────────────────────────────┐
         │           │ SportDefaultsRegistry                       │
         │           │ getLeagueDefaults, getRosterDefaults,       │
         │           │ getScoringDefaults, getDraftDefaults,       │
         │           │ getWaiverDefaults, getTeamMetadataDefaults  │
         │           └─────────────────────────────────────────────┘
         │                    │
         │                    ▼
         │           ┌─────────────────────────────────────────────┐
         │           │ SportMetadataRegistry                       │
         │           │ getSportMetadata (display_name, icon, etc.)  │
         │           └─────────────────────────────────────────────┘
         └────────────────────┴───────────────────────────────────┘
```

## Core Modules

| Module | Role |
|--------|------|
| **SportMetadataRegistry** | sport_type → display_name, short_name, icon, logo_strategy, default_season_type. |
| **SportDefaultsRegistry** | sport_type → LeagueDefaults, RosterDefaults, ScoringDefaults, DraftDefaults, WaiverDefaults, TeamMetadataDefaults (in-memory). |
| **SportDefaultsResolver** | resolveSportDefaults(sport) → full SportDefaultSet; resolveLeagueCreationDefaults(sport) for minimal set. |
| **SportLeaguePresetService** | getFullLeaguePreset(leagueSport) → defaults + preset (templates from MultiSportLeagueService). |
| **LeagueCreationDefaultsLoader** | loadLeagueCreationDefaults(leagueSport) → LeagueCreationDefaultsPayload (defaults + roster template + scoring template) for API/UI. |

## Sport Default Domains

- **SportMetadata** — sport_type, display_name, short_name, icon, logo_strategy, default_season_type.
- **LeagueDefaults** — default_league_name_pattern, default_team_count, default_playoff_team_count, default_regular_season_length, default_matchup_unit, default_trade_deadline_logic.
- **RosterDefaults** — starter_slots (e.g. QB:1, RB:2), bench_slots, IR_slots, taxi_slots, devy_slots, flex_definitions.
- **ScoringDefaults** — scoring_template_id, scoring_format, category_type.
- **DraftDefaults** — draft_type, rounds_default, timer_seconds_default, pick_order_rules.
- **WaiverDefaults** — waiver_type, processing_days, FAAB_budget_default.
- **TeamMetadataDefaults** — sport_type + list of team_id, team_name, city, abbreviation, primary_logo, alternate_logo (empty by default; can be filled from external source).

## Schema / Config Additions

- **No new Prisma tables** — Defaults are in TypeScript under `lib/sport-defaults/`. Existing `League.sport`, `RosterTemplate`, `ScoringTemplate`, `LeagueRosterConfig` are unchanged.
- **League create** — Request body may include optional `sport`; optional `name`, `leagueSize`, `scoring`, `isDynasty` are filled from Sport Defaults when omitted. Response includes `sport`. After create, `attachRosterConfigForLeague(leagueId, sport, scoring)` is called so the league gets a roster config.

## Integration Points

- **League creation API** — `POST /api/league/create` accepts optional `sport`; when name/leagueSize/scoring/isDynasty are missing, they are resolved from `SportDefaultsRegistry` for that sport. Created league has `sport` set and roster config attached.
- **League creation UI** — Call `GET /api/sport-defaults?sport=NBA&load=creation` to get full payload (metadata, league, roster, scoring, draft, waiver, rosterTemplate, scoringTemplate) and prefill form.
- **Existing NFL flows** — Unchanged: if client sends name, leagueSize, scoring, isDynasty, behavior is as before; sport defaults only apply when values are omitted.
- **Dashboard grouping** — Continues to use `League.sport`; metadata for labels/icons can come from `SportMetadataRegistry` or existing multi-sport config.
- **AI sport context** — Can use the same sport type and display names from metadata for prompts.

## API

- **GET /api/sport-defaults?sport=NFL** — Returns raw default set (metadata, league, roster, scoring, draft, waiver, teamMetadata).
- **GET /api/sport-defaults?sport=NFL&load=creation** — Returns full league creation payload including roster and scoring templates (from DB or in-memory defaults).

## QA Checklist

- [ ] **NFL league creation unchanged** — Create league with explicit name, leagueSize, scoring, isDynasty (no sport or sport=NFL). League is created as before; roster config attached when sport is present.
- [ ] **Sport defaults applied** — Create league with only `sport=NBA` (omit name, leagueSize, scoring, isDynasty). Name = "My NBA League", leagueSize = 12, scoring = "points", isDynasty = false.
- [ ] **GET sport-defaults** — `GET /api/sport-defaults?sport=MLB` returns metadata, league, roster, scoring, draft, waiver, teamMetadata. `GET ?sport=NFL&load=creation` returns same plus rosterTemplate and scoringTemplate.
- [ ] **All six sports** — NFL, NBA, MLB, NHL, NCAAF, NCAAB each have distinct league name pattern, roster starter_slots, scoring_format, draft rounds, waiver_type where applicable.
- [ ] **Roster config attached** — After creating a league with sport, LeagueRosterConfig exists for that league (or in-memory default used) and attachRosterConfigForLeague does not throw.
- [ ] **Existing dashboard / AI** — Dashboard grouping and AI sport context still work; no regressions from adding sport-defaults.

## Explanation

The Sport Defaults Core Registry gives the platform one place to define “what does a league look like for this sport?” so that:

1. **League creation** can auto-fill settings by sport without duplicating logic in the frontend.
2. **New sports** are added by extending the registries (and optionally DB templates) instead of scattering defaults across the app.
3. **NFL behavior** is preserved: existing calls that send full league fields are unchanged; the registry only fills in missing values when a sport is provided.
