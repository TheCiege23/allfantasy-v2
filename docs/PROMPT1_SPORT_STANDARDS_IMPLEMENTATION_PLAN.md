# CURSOR PROMPT 1 OF 3 — SET THE SPORT STANDARDS AS THE DEFAULTS

## Implementation Plan

### Objective
Set the provided sport configurations as the **app-wide default** baseline for league creation. Commissioners retain the ability to customize where league rules allow. Every new league must pull: **sport**, **scoring_profile**, **roster_template**, **schedule_type**, **calendar**; these defaults load as the standard presets.

### Approach
- **Extend, do not replace.** The repo already has:
  - **DB:** `RosterTemplate` / `RosterTemplateSlot`, `ScoringTemplate` / `ScoringRule`, `ScheduleTemplate`, `SeasonCalendar`, `SportFeatureFlags`
  - **In-memory:** `SportDefaultsRegistry`, `DefaultPlayoffConfigResolver`, `DefaultScheduleConfigResolver`, `ScheduleTemplateResolver`, `SeasonCalendarResolver`, `ScoringDefaultsRegistry`
  - **Resolution:** League creation uses `getLeagueCreationPreset(leagueSport)` → `config.defaultFormat` → `getRosterTemplate(sport, formatType)`, `getScoringTemplate(sport, formatType)`; schedule/calendar use `formatType: 'DEFAULT'`.
- **Single change for “what is default”:** Each sport has a **default format** (e.g. NFL currently `'PPR'`). To make “standard” the app default for NFL, set that default to `'standard'` and ensure the **standard** scoring and roster templates (and schedule/calendar) match the spec. Same idea for other sports: align default format + seeded/in-memory templates to the spec, and keep optional toggles (PPR, TEP, superflex, etc.) as alternate templates/variants.

### Implementation Steps (high level)

1. **Backend – default format**
   - In `lib/multi-sport/SportRegistry.ts`, `DEFAULT_FORMAT_BY_SPORT`: set NFL to `'standard'` (today it is `'PPR'`). All other sports already use `'standard'` or `'points'`; confirm they match the spec (see alignment table below).
   - No new tables; existing `RosterTemplate`, `ScoringTemplate`, `ScheduleTemplate`, `SeasonCalendar` remain the source of truth. Leagues already “pull” template by `(sport, formatType)`; `formatType` comes from `config.defaultFormat` when no variant is selected.

2. **Backend – scoring profiles**
   - **Seed (`prisma/seed-sport-config.ts`):** For each sport, ensure the **default** formatType’s scoring template exists and matches the spec (name + stat keys + point values). Map spec stat names to existing canonical stat keys (e.g. `pass_td` → `passing_td`, `rec_td` → `receiving_td`, `interception_thrown` → `interception`, `team_defense_sack` → `dst_sack`, `points_allowed_scale` → existing `dst_points_allowed_*` rules). Add or adjust rules so that:
     - NFL: Name `NFL_STANDARD_DEFAULT`, formatType `standard` (0 PPR), FG distance-based (fg_1_to_39 / fg_40_to_49 / fg_50_plus or existing fg_0_39, fg_40_49, fg_50_plus), points_allowed scale as in seed.
     - MLB: `MLB_POINTS_DEFAULT` — single, double, triple, home_run, rbi, run, stolen_base; pitcher: inning_pitched, strikeout, win, save, earned_run, walk_allowed (map to existing keys e.g. innings_pitched, strikeouts_pitched, win, save, earned_runs, walk_allowed).
     - NHL, NBA, SOCCER, NCAAB, NCAAF: Align names and values to spec (goalie_win → win or existing key, etc.).
   - **In-memory fallback (`lib/scoring-defaults/ScoringDefaultsRegistry.ts`):** Align in-memory definitions for each sport’s default format so that when no DB template exists, the same standard default is returned. Ensure `getDefaultScoringTemplate(sport, 'standard')` (and NFL `'standard'`) returns the spec values.

3. **Backend – roster templates**
   - **Seed:** Ensure the default formatType for each sport has a roster template matching the spec (slot names and counts). Existing seed already has NFL default with QB=1, RB=2, WR=2, TE=1, FLEX=1, K=1, DST=1, BENCH=7, IR=2; confirm and fix if needed. MLB: C, 1B, 2B, 3B, SS, OF=4, UTIL=1, SP=4, RP=2, BENCH=6 (spec says OF=4; seed currently has OF=4). NHL: C=2, LW=2, RW=2, D=3, G=2, UTIL=1, BENCH=5. NBA: PG, SG, SF, PF, C, G, F, UTIL=2, BENCH=6. SOCCER: GK=1, DEF=4, MID=4, FWD=2, BENCH=4. NCAAB: G=3, F=3, UTIL=2, BENCH=5. NCAAF: QB=1, RB=2, WR=2, FLEX=2, BENCH=7 (no K/DST in spec).
   - **In-memory (`SportDefaultsRegistry` ROSTER_DEFAULTS):** Align starter_slots, bench_slots, IR_slots so they match the seeded default template for each sport (used when no DB template or for validation/display).

4. **Backend – schedule templates**
   - **Seed:** Ensure each sport has a `ScheduleTemplate` with `formatType: 'DEFAULT'` matching spec: NFL weekly_h2h, 14 reg, 3 playoff, bye 5–14, playoff 15–17; MLB lineup_lock weekly_or_daily, head_to_head_points, long_form; NHL weekly_h2h; NBA weekly_or_daily, head_to_head_points; SOCCER weekly_matchday, matchday_based; NCAAB weekly_h2h, bracket_mode_supported; NCAAF weekly_h2h, short_season, bowl_metadata.
   - **In-memory (`ScheduleTemplateResolver` IN_MEMORY_TEMPLATES):** Same values so resolution is consistent when DB is missing.

5. **Backend – season calendar**
   - **Seed + SeasonCalendarResolver:** Ensure DEFAULT calendar per sport matches spec (NFL: preseason August, regular Sep–Jan, fantasy playoffs 15–17, Super Bowl Feb; MLB: March spring training, Apr–Oct regular, Oct playoffs, late Oct World Series; etc.). Already largely in place; align labels and month ranges to spec.

6. **Backend – optional toggles / feature flags**
   - Keep `SportFeatureFlags` and variant logic: standard_ppr_mode (standard / half / full), te_premium, superflex, extra_wr, extra_flex, taxi (dynasty only), devy (dynasty/devy only). These remain as alternate templates or commissioner options; validation continues to restrict them by sport (e.g. no kicker for soccer). No change to which options appear for which sport beyond ensuring “default” is the new standard.

7. **League creation flow**
   - `buildInitialLeagueSettings` does not currently set `roster_format_type` or `scoring_format_type` for non-dynasty leagues; they are inferred from preset/context. Ensure that when a user creates a league **without** choosing a variant, the league gets:
     - `roster_format_type` = default format for that sport (e.g. `'standard'` for NFL),
     - `scoring_format_type` = same (e.g. `'standard'` for NFL),
     - and that bootstrap/attach uses that format so LeagueRosterConfig and scoring resolution use the standard default.
   - In `LeagueCreationDefaultsLoader` and any path that builds initial settings, ensure the “default” preset uses the sport’s default format (already does via `getLeagueCreationPreset` → `config.defaultFormat`). Persist `roster_format_type` and `scoring_format_type` into `League.settings` on create when available from preset so downstream resolvers see them.

8. **Validation**
   - Keep sport-incompatible options hidden or invalid: e.g. no kicker/DST for soccer; no superflex for MLB. `SportFeatureFlags` and `validateLeagueFeatureFlags` already enforce this; ensure any new default does not turn on unsupported flags.

9. **Frontend**
   - League creation / sport selection should continue to show “Standard” (or sport-specific default name) as the default; no new UI needed beyond ensuring the default option corresponds to the new default format. Settings panels that show “current scoring/roster” should reflect the league’s template (already resolved from DB or in-memory). Mobile-first: no new screens; existing components should work with the new defaults.

10. **QA**
    - Per-sport: create a new league, confirm scoring profile name and values, roster slot counts, schedule (reg/playoff weeks), and calendar. Confirm commissioners can still change to PPR, superflex, etc. where allowed. Regression: existing leagues and drafts unchanged.

---

## Architecture Map

```
League (sport, settings)
  │
  ├─ sport (LeagueSport) ──────────────────────────────────────────────────────► SportRegistry.defaultFormat
  │                                                                                    │
  ├─ settings.roster_format_type ──► RosterTemplateService.getRosterTemplate(sport, formatType)
  │                                       │
  │                                       ├─ DB: RosterTemplate + RosterTemplateSlot (seed-sport-config)
  │                                       └─ Fallback: SportDefaultsRegistry ROSTER_DEFAULTS → defaultSlotsForSport()
  │
  ├─ settings.scoring_format_type ─► ScoringTemplateResolver.getScoringTemplate(sport, formatType)
  │                                       │
  │                                       ├─ DB: ScoringTemplate + ScoringRule (seed-sport-config)
  │                                       └─ Fallback: ScoringDefaultsRegistry getDefaultScoringTemplate()
  │
  ├─ schedule (implicit from sport) ─► ScheduleTemplateResolver.getScheduleTemplate(sport, 'DEFAULT')
  │                                       │
  │                                       ├─ DB: ScheduleTemplate (seed)
  │                                       └─ Fallback: IN_MEMORY_TEMPLATES
  │
  └─ calendar (implicit from sport) ─► SeasonCalendarResolver.getSeasonCalendar(sport, 'DEFAULT')
                                            │
                                            ├─ DB: SeasonCalendar (seed)
                                            └─ Fallback: IN_MEMORY_CALENDARS

League creation flow:
  getLeagueCreationPreset(leagueSport)
    → resolveSportConfigForLeague(leagueSport) → getSportConfig(sport) → defaultFormat
    → getRosterTemplate(sport, defaultFormat), getScoringTemplate(sport, defaultFormat)
  buildInitialLeagueSettings(sport, variant) → getDefaultLeagueSettings, getDraftDefaults, resolveDefaultScheduleConfig
  (Optional) Persist roster_format_type, scoring_format_type from preset into League.settings on create.
```

**Existing tables (extend only):**
- `roster_templates` + `roster_template_slots`
- `scoring_templates` + `scoring_rules`
- `schedule_templates`
- `season_calendars`
- `sport_feature_flags`
- `league_roster_config` (leagueId → templateId + overrides)
- `league_scoring_override` (league-level overrides)

No new tables required. “Sports” is the `League.sport` enum (LeagueSport); there is no separate `sports` table.

---

## Reusable Files / Modules to Extend

| Area | File(s) | Purpose |
|------|---------|--------|
| Default format | `lib/multi-sport/SportRegistry.ts` | `DEFAULT_FORMAT_BY_SPORT`: set NFL to `'standard'`; keep others as-is or align to spec. |
| Roster defaults | `lib/sport-defaults/SportDefaultsRegistry.ts` | `ROSTER_DEFAULTS`: align starter_slots, bench_slots, IR_slots per sport to spec. |
| Scoring seed | `prisma/seed-sport-config.ts` | `upsertScoringTemplate`: add/update rules so each sport’s default formatType (e.g. NFL `standard`) has name and values per spec; map spec stat names to existing statKey. |
| Roster seed | `prisma/seed-sport-config.ts` | `upsertRosterTemplate`: ensure default formatType roster per sport matches spec slot counts. |
| In-memory scoring | `lib/scoring-defaults/ScoringDefaultsRegistry.ts` | Align NFL_STANDARD and other default-format rules to spec; ensure `getDefaultScoringTemplate(sport, 'standard')` (and NFL `standard`) returns spec. |
| Schedule | `prisma/seed-sport-config.ts` (ScheduleTemplate), `lib/sport-defaults/ScheduleTemplateResolver.ts` | Seed: DEFAULT schedule per sport per spec. Resolver: IN_MEMORY_TEMPLATES aligned. |
| Calendar | `prisma/seed-sport-config.ts` (SeasonCalendar), `lib/sport-defaults/SeasonCalendarResolver.ts` | Seed: DEFAULT calendar per sport. Resolver: IN_MEMORY_CALENDARS aligned. |
| Playoff | `lib/sport-defaults/DefaultPlayoffConfigResolver.ts` | Already sport-specific; confirm NFL playoff_weeks = 3, playoff_start_week = 15, etc. |
| Schedule config | `lib/sport-defaults/DefaultScheduleConfigResolver.ts` | Confirm NFL regular_season_length 14 for fantasy (spec says 14 reg weeks); align other sports if needed. |
| League creation | `lib/sport-defaults/LeagueCreationDefaultsLoader.ts`, `lib/league-defaults-orchestrator/LeagueSettingsPreviewBuilder.ts` | Ensure initial settings or payload include default format so roster_format_type/scoring_format_type are set on create when no variant. |
| Validation | `lib/sport-defaults/SportFeatureFlagsService.ts`, `validateLeagueFeatureFlags` | Keep strict; no changes unless a new default requires a new flag (it should not). |

---

## Likely New Files

- **None required.** All work is in existing seed, registries, and resolvers. Optionally:
  - **`lib/sport-defaults/StandardSportSpec.ts`** (or similar): single module that exports the canonical “app standard” default values (scoring point values, roster slot counts, schedule/calendar constants) for each sport, used by both seed and in-memory fallbacks so they stay in sync. This is optional and can be done later; initially aligning seed + in-memory manually is acceptable.

---

## Migration Strategy

1. **No Prisma schema migration** for new tables. Existing schema already supports sport + formatType for templates and calendars.
2. **Seed migration:** Run updated `prisma/seed-sport-config.ts` (or equivalent seed command) so that:
   - Default formatType for each sport (e.g. NFL `standard`) has scoring and roster templates matching the spec.
   - Schedule and season calendar for `formatType: 'DEFAULT'` match the spec.
3. **Code deploy:** Deploy changes to `SportRegistry` (default format), `SportDefaultsRegistry`, `ScoringDefaultsRegistry`, `ScheduleTemplateResolver`, `SeasonCalendarResolver`, and league creation so new leagues get the new default. No backfill of existing leagues required; existing leagues keep their current roster/scoring format.
4. **Order:** (1) Update seed and run it; (2) Update in-memory fallbacks and default format; (3) Deploy; (4) Smoke-test new league creation per sport.

---

## Risks / Edge Cases

1. **NFL currently default PPR:** Changing NFL default to `standard` (0 PPR) may surprise users who expect PPR. Mitigation: Document in release notes; keep PPR/half_ppr as one-click options in league creation.
2. **Stat key naming:** Spec uses names like `interception_thrown`, `team_defense_sack`, `field_goal_1_to_39`. The app uses `interception`, `dst_sack`, `fg_0_39`. Map spec → existing keys; do not change core stat keys used by scoring engine or feeds.
3. **NCAAF roster:** Spec says QB, RB, WR, FLEX=2, BENCH=7 (no K, DEF). Current seed may have K/DST. Aligning to spec may require NCAAF-specific default roster and feature flags (e.g. no kicker for NCAAF default).
4. **MLB pitcher stat keys:** Spec “inning_pitched”, “earned_run”, “walk_allowed”. Confirm mapping to `innings_pitched`, `earned_runs`, `walk_allowed` (or whatever the scoring engine uses).
5. **Soccer clean_sheet:** Spec “clean_sheet_def_gk = 4”. May be stored as `clean_sheet`; ensure DEF/GK both get credit if that’s how the app models it.
6. **Schedule “regular_season_length”:** LeagueDefaultSettingsService uses `schedule.regular_season_length` (e.g. 18 for NFL from DefaultScheduleConfigResolver). Spec says 14 fantasy reg weeks. Confirm: “regular_season_length” in the app is fantasy weeks; if so, set NFL to 14 in DefaultScheduleConfigResolver. If it’s real-world weeks, keep 18 and use schedule template’s regularSeasonWeeks (14) for matchup generation.
7. **Existing leagues:** Unchanged; they keep current roster_format_type and scoring_format_type. Only new leagues get the new default.

---

## QA Plan

1. **Per-sport default (deterministic)**  
   For each sport (NFL, MLB, NHL, NBA, SOCCER, NCAAB, NCAAF):
   - Create a new league with no variant selected.
   - Confirm default scoring profile name and at least 3–5 key scoring values (e.g. NFL: pass_td 4, reception 0, rush_yards 0.1; MLB: single 1, home_run 4; NHL: goal 3, goalie_win 5).
   - Confirm default roster: starter counts and bench/IR match spec (e.g. NFL: QB=1, RB=2, WR=2, TE=1, FLEX=1, K=1, DEF=1, BENCH=7, IR=2).
   - Confirm schedule: regular season weeks and playoff weeks from schedule template (e.g. NFL 14 + 3).
   - Confirm calendar: labels/periods for preseason, regular, playoffs/championship match spec.

2. **Optional toggles still work**  
   - NFL: Switch to PPR or half PPR; confirm scoring updates. Enable superflex; confirm roster template changes. TEP optional.
   - Other sports: Any variant or extra WR/flex options still selectable where supported.

3. **Validation**  
   - Ensure unsupported options (e.g. kicker for soccer, superflex for MLB) remain blocked or hidden.

4. **Regression**  
   - Create existing flows: standard redraft, dynasty, devy. Confirm no breakage. Existing leagues load without error; scoring/roster resolution unchanged for them.

5. **Mobile**  
   - League creation and settings on mobile: default is applied, buttons work, no dead buttons.

6. **AI**  
   - No AI change required for this prompt; deterministic defaults first.

---

## Default vs Spec Alignment (summary)

| Sport | Default formatType (current) | Spec default name | Action |
|-------|------------------------------|-------------------|--------|
| NFL | PPR → **standard** | NFL_STANDARD_DEFAULT | Set DEFAULT_FORMAT_BY_SPORT.NFL = 'standard'; seed + in-memory standard scoring/roster to spec; roster already QB=1,RB=2,WR=2,TE=1,FLEX=1,K=1,DEF=1,BENCH=7,IR=2. |
| MLB | standard | MLB_POINTS_DEFAULT | Align scoring (single, double, …, inning_pitched, win, save, earned_run, walk_allowed) and roster (C,1B,2B,3B,SS,OF=4,UTIL,SP=4,RP=2,BENCH=6). |
| NHL | standard | NHL_POINTS_DEFAULT | Align scoring (goal 3, assist 2, shot_on_goal 0.5, hit 0.5; goalie_win 5, goalie_save 0.2, goals_against -1, shutout 5) and roster (C=2,LW=2,RW=2,D=3,G=2,UTIL=1,BENCH=5). |
| NBA | points | NBA_POINTS_DEFAULT | Align scoring and roster (PG,SG,SF,PF,C,G,F,UTIL=2,BENCH=6). |
| SOCCER | standard | SOCCER_POINTS_DEFAULT | Align scoring (goal 5, assist 3, shot_on_target 1, clean_sheet 4, yellow -1, red -3) and roster (GK=1,DEF=4,MID=4,FWD=2,BENCH=4). |
| NCAAB | points | NCAAB_POINTS_DEFAULT | Roster G=3,F=3,UTIL=2,BENCH=5; scoring per spec. |
| NCAAF | PPR | NCAAF_POINTS_DEFAULT | Consider default roster without K/DST per spec (QB=1,RB=2,WR=2,FLEX=2,BENCH=7); scoring with bonuses; default format could stay PPR or move to a dedicated 'standard' that matches spec. |

---

End of implementation plan. No code finalized in this chunk; next chunk can implement seed + registry + resolver changes and default format switch.
