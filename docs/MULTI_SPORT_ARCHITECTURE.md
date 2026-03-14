# Multi-Sport Core Architecture

## Overview

The AllFantasy platform is refactored from an NFL-first design to a **reusable multi-sport engine** supporting:

- **NFL** (existing)
- **NHL**
- **MLB**
- **NBA**
- **NCAA Football (NCAAF)**
- **NCAA Basketball (NCAAB)**

Existing NFL league creation, roster logic, player data, scoring engine, matchup engine, draft engine, waiver system, AI analysis, and dashboard grouping are preserved. New behavior is **configuration-driven** and **sport-agnostic** at the core.

---

## Schema Additions and Entity Updates

### LeagueSport enum (extended)

- **Before:** `NFL`, `NBA`, `MLB`
- **After:** `NFL`, `NHL`, `MLB`, `NBA`, `NCAAF`, `NCAAB`

### New tables

| Table | Purpose |
|-------|--------|
| `RosterTemplate` | Per-sport/format roster template (id, sportType, name, formatType) |
| `RosterTemplateSlot` | Slot definitions: slotName, allowedPositions (JSON), starter/bench/reserve/taxi/devy counts, isFlexibleSlot |
| `LeagueRosterConfig` | League → template id + optional overrides (one per league) |
| `ScoringTemplate` | Per-sport/format scoring template |
| `ScoringRule` | statKey, pointsValue, multiplier, enabled |
| `LeagueScoringOverride` | League-level overrides for specific stat keys |

### Canonical `sport_type` / `sport`

- **League:** already has `sport` (LeagueSport).
- **RosterTemplate / ScoringTemplate:** use `sportType` (string, e.g. `NFL`, `NHL`).
- Other core entities (teams, rosters, matchups, drafts, waivers) derive sport from their **league**; no duplicate sport column added there to avoid redundancy.

---

## Core Modules

| Module | Role |
|--------|------|
| **SportRegistry** | Supported sports, display names, emoji, **positions per sport**, default format. |
| **SportConfigResolver** | Maps `LeagueSport` ↔ `SportType`; resolves `SportConfig` for a league or string. |
| **MultiSportLeagueService** | League creation presets (roster + scoring templates by sport); attach roster config; get scoring rules for a league. |
| **MultiSportRosterService** | Get roster template for a league; resolve league roster config; position validation and slot allowed positions. |
| **MultiSportScoringResolver** | Effective scoring rules for a league (template + league overrides); scoring template by sport. |
| **MultiSportScheduleResolver** | Schedule context (week vs round, total weeks) by sport; placeholder for future schedule ingestion. |
| **RosterTemplateService** | DB + in-memory default roster templates; get or create league roster config. |
| **ScoringTemplateResolver** | DB + default NFL scoring rules; league overrides merge. |

---

## Where NFL Logic Was Generalized

- **Engine types** (`lib/engine/types.ts`): Still `sport: 'nfl'` in `EngineLeagueContext`; normalization remains NFL-specific. **Next step:** pass league’s `sport` into normalizer and use `MultiSportScoringResolver` / `RosterTemplateService` when building context for other sports.
- **League creation / sync**: Existing flows do not always set `sport`; import routes (Sleeper, ESPN) map to `LeagueSport`. New UI can set `sport` explicitly; `getLeagueCreationPreset(sport)` loads default roster and scoring templates.
- **Roster and scoring**: No longer hardcoded NFL-only in the new modules. Templates are keyed by `(sportType, formatType)`; NFL uses the same pipeline with default templates when no DB rows exist.

---

## Usage

### League creation (sport-specific)

1. User selects sport (e.g. NHL).
2. Call `getLeagueCreationPreset(LeagueSport.NHL)` to get default roster template, scoring template, display name, emoji.
3. Create league with `sport: LeagueSport.NHL`.
4. Call `attachRosterConfigForLeague(leagueId, LeagueSport.NHL)` so the league has a roster config (or use default in-memory template).

### Roster validation

- Use `MultiSportRosterService.getRosterTemplateForLeague(league.sport)` for slot definitions.
- Use `isPositionAllowedForSport(league.sport, position)` and `getAllowedPositionsForSlot(slotAllowedPositions, league.sport)` for validation.

### Scoring

- Use `MultiSportScoringResolver.resolveScoringRulesForLeague(leagueId, league.sport)` for matchup/scoring engine.
- Use `getScoringTemplateForSport(league.sport)` for display or defaults.

### Dashboard grouping

- Group leagues by `league.sport`; use `SportRegistry` or `SportConfigResolver` for display name and emoji (e.g. 🏒 NHL).

---

## QA Checklist

- [ ] **NFL league creation** – Create NFL league; roster and scoring defaults apply; no regression.
- [ ] **NFL roster** – Existing roster views and validation still work.
- [ ] **NFL scoring** – Matchup and scoring calculations unchanged.
- [ ] **Sport enum** – Leagues can be created with NHL, MLB, NBA, NCAAF, NCAAB (schema + API).
- [ ] **Roster templates** – `getRosterTemplate('NHL')` returns NHL slots (e.g. C, LW, RW, D, G, UTIL); NFL returns QB, RB, WR, TE, FLEX, BENCH.
- [ ] **Scoring templates** – `getScoringTemplate('NFL')` returns PPR-style rules; other sports return empty or DB-defined rules.
- [ ] **League preset** – `getLeagueCreationPreset(LeagueSport.NBA)` returns NBA roster + scoring template and display info.
- [ ] **Dashboard** – Leagues grouped by `sport` show correct labels (when UI uses new grouping).
- [ ] **Migrations** – Run `npx prisma migrate dev` for new enum and tables; Prisma generate succeeds.

---

## Next Steps (Prompts 2–4)

- **Prompt 2 (Player pool + roster templates):** Universal player model with `sport_type`; `RosterValidationEngine`, `EligiblePositionResolver`, `LeagueRosterInitializer`; draft/waiver filtering by sport.
- **Prompt 3 (Scoring + schedule/stats):** `FantasyPointCalculator`, `ScheduleIngestionService`, `StatNormalizationService`, `MultiSportMatchupScoringService`; GameSchedule / PlayerGameStat schema if needed.
- **Prompt 4 (UI + AI):** LeagueCreationSportSelector, LeagueCreationTemplateLoader, DashboardSportGroups, SportAwareDraftRoom, SportAwareWaiverWire; AI sport context (DeepSeek, Grok, OpenAI).
