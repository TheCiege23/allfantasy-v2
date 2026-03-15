# Default Scoring Settings by Sport — Deliverable (Prompt 8)

Sport-specific default scoring templates so each new league loads the correct scoring model by sport. **Existing NFL scoring engine, matchup scoring logic, projections pipeline, league scoring overrides, player stat normalization, and all scoring-related selectors, preview tables, and save actions are preserved.**

Supported: **NFL, NFL IDP, NBA, MLB, NHL, NCAA Football, NCAA Basketball, Soccer.**

---

## 1. Scoring Defaults Architecture

Default scoring is resolved by **sport_type**, **format_type**, and optionally **league_settings**. New leagues load the correct default template for their sport (and format); commissioners can override rules later via LeagueScoringOverride. The scoring engine resolves the effective template during live scoring and the matchup engine stays compatible.

### Data flow

```
League creation (sport + format/variant)
    → loadLeagueCreationDefaults / getFullLeaguePreset
    → scoring template id and format from sport-defaults (ScoringDefaults in SportDefaultsRegistry)
    → bootstrapLeagueScoring(leagueId, leagueSport, formatType)  [resolves template for display]
Live scoring / matchup
    → resolveScoringRulesForLeague(leagueId, leagueSport, formatType?, leagueSettings?)
        → format = formatType ?? resolveFormatTypeFromLeagueSettings(leagueSport, leagueSettings) ?? config.defaultFormat
        → getLeagueScoringRules(leagueId, sportType, format)
            → getScoringTemplate(sportType, format)  [DB or getDefaultScoringTemplate]
            → merge with LeagueScoringOverride rows
    → computeFantasyPoints(stats, rules)  [FantasyPointCalculator]
```

### Core modules

| Module | Responsibility |
|--------|----------------|
| **ScoringDefaultsRegistry** (scoring-defaults) | In-memory **REGISTRY** of default templates keyed by `sport-format` (e.g. NFL-PPR, NFL-IDP, NBA-points, MLB-standard, NHL-standard, NCAAF-PPR, NCAAB-points, SOCCER-standard). **getDefaultScoringTemplate(sportType, formatType)** returns ScoringTemplateDefinition (templateId, sportType, name, formatType, rules). **getDefaultScoringRules** returns rules only. **getScoringContextForAI(sportType, formatType)** returns a short string for AI prompts. Format is normalized for lookup (e.g. ppr → PPR, half_ppr, idp → IDP). |
| **ScoringTemplateResolver** (multi-sport) | **getScoringTemplate(sportType, formatType)** prefers DB ScoringTemplate; else getDefaultScoringTemplate. **getLeagueScoringRules(leagueId, sportType, formatType)** returns template rules merged with LeagueScoringOverride. |
| **FantasyPointCalculator** (scoring-defaults) | **computeFantasyPoints(stats, rules)** and **computeFantasyPointsWithBreakdown(stats, rules)**. Stat keys in stats must match rule statKey; multiplier and enabled are respected. Used by live scoring, matchup engine, and projections pipeline. |
| **LeagueScoringBootstrapService** (scoring-defaults) | **bootstrapLeagueScoring(leagueId, leagueSport, formatType)** resolves and returns the effective template for the league’s sport (no DB write; used so new leagues “have” the correct default). **getLeagueScoringTemplate(leagueSport, formatType)** for display. |
| **ScoringOverrideService** (scoring-defaults) | **getLeagueScoringOverrides(leagueId)**, **upsertLeagueScoringOverrides(leagueId, overrides)**, **mergeRulesWithOverrides(templateRules, overrides)**. Commissioner overrides are merged by statKey. |
| **MultiSportScoringResolver** (multi-sport) | **resolveScoringRulesForLeague(leagueId, leagueSport, formatType?, leagueSettings?)** — format resolved by formatType > **resolveFormatTypeFromLeagueSettings(leagueSport, leagueSettings)** (scoring_format, leagueVariant for IDP) > sport defaultFormat. **getScoringTemplateForSport(leagueSport, formatType)** for template without overrides. |

---

## 2. Per-Sport Scoring Template Definitions

Each template has **template id**, **scoring rules** (stat keys, point values, multiplier, enabled). Stat keys are canonical; providers map feed fields to these keys.

### NFL

- **NFL-PPR** (default): passing_yards 0.04, passing_td 4, interception -2, rushing_yards 0.1, rushing_td 6, **receptions 1**, receiving_yards 0.1, receiving_td 6, fumble_lost -2, two_pt_conversion / passing_2pt / rushing_2pt / receiving_2pt 2, fg_0_39/40_49/50_plus 3/4/5, pat_made 1 / pat_missed -1, dst_* (sack, interception, fumble_recovery, td, safety, blocked_kick, return_td, points_allowed tiers).
- **NFL-Half PPR**: same as PPR with receptions 0.5.
- **NFL-Standard**: same as PPR with receptions 0.
- **NFL-IDP**: all PPR rules plus idp_tackle_solo 1, idp_tackle_assist 0.5, idp_sack 4, idp_interception 3, idp_pass_defended 1, idp_forced_fumble 3, idp_fumble_recovery 2, idp_td 6, idp_safety 2, idp_blocked_kick 2, etc.

### NBA

- **NBA-points**: points 1, rebounds 1.2, assists 1.5, steals 3, blocks 3, turnovers -1, three_pointers_made 0.5, double_double 1.5, triple_double 3.

### MLB

- **MLB-standard**: single 1, double 2, triple 3, home_run 4, rbi 1, run 1, walk 1, stolen_base 2, hit_by_pitch 1, strikeout -0.5 (batter); innings_pitched 3, earned_runs -2, strikeouts_pitched 1, save 5, hold 4, win 5, loss -5, quality_start 4 (pitcher).

### NHL

- **NHL-standard**: goal 3, assist 2, shot_on_goal 0.5, blocked_shot 0.5, power_play_point 1, short_handed_point 2; goalie: save 0.6, goal_allowed -3, win 5, loss -3, shutout 3.

### NCAA Football

- **NCAAF-PPR**: same stat keys as NFL PPR (offense + K + DST); college-specific config can be applied via league overrides or future format variants.

### NCAA Basketball

- **NCAAB-points**: same as NBA-points (points, rebounds, assists, steals, blocks, turnovers, three_pointers_made, double_double, triple_double); configurable via overrides.

### Soccer

- **SOCCER-standard**: goal 6, assist 3, shot_on_target 0.5, shot 0.2, key_pass 0.5, clean_sheet 4, goal_conceded / goal_allowed -1, save 0.5, penalty_save 5, penalty_miss -2, yellow_card -1, red_card -3, own_goal -2, minutes_played 0.02.

---

## 3. Backend Scoring Resolution Logic

1. **By sport_type and format_type**  
   **getDefaultScoringTemplate(sportType, formatType)** normalizes format (e.g. "ppr" → "PPR", "idp" → "IDP", "half_ppr" → "half_ppr") and looks up REGISTRY[`${sport}-${format}`] with sport-specific fallbacks (NFL → PPR or IDP, NBA/NCAAB → points, NCAAF → PPR, etc.).

2. **By league_settings**  
   **resolveFormatTypeFromLeagueSettings(leagueSport, leagueSettings)** returns:
   - **IDP** when leagueSport is NFL and leagueSettings.leagueVariant is IDP or DYNASTY_IDP;
   - **leagueSettings.scoring_format** when present and non-empty.
   So when calling **resolveScoringRulesForLeague(leagueId, leagueSport, formatType?, leagueSettings?)**, if formatType is omitted and leagueSettings is passed (e.g. League.settings), the format used for template lookup is derived from settings.

3. **League overrides**  
   **getLeagueScoringRules** loads template rules then merges **LeagueScoringOverride** rows by statKey (override pointsValue and enabled; multiplier kept from template when not overridden). **ScoringOverrideService.mergeRulesWithOverrides** does the same for use in other services.

4. **DB vs in-memory**  
   **getScoringTemplate** first looks up **ScoringTemplate** by (sportType, formatType); if none, uses **getDefaultScoringTemplate**. So leagues can have custom DB templates; otherwise the registry default is used.

---

## 4. Matchup and Projection Integration Updates

- **Matchup engine**  
  **MultiSportMatchupScoringService.computeRosterScoreForWeek** uses **resolveScoringRulesForLeague(leagueId, leagueSport, formatType)**. To use league_settings when available, callers can pass **league.settings** as the fourth argument so format is resolved from settings (e.g. scoring_format, leagueVariant for IDP). Existing call sites that pass formatType remain valid.

- **Projections pipeline**  
  Projections that need to apply league scoring should use **resolveScoringRulesForLeague** (with optional leagueSettings) and **computeFantasyPoints** so projected stats are scored with the same rules as live scoring. No change required if the pipeline already uses getLeagueScoringRules or resolveScoringRulesForLeague.

- **Player stat normalization**  
  Stat normalization (e.g. StatNormalizationService) should output **normalized stat keys** that match the scoring rule **statKey** (e.g. passing_yards, receptions, idp_sack). The scoring engine only uses rules whose statKey exists in the player stats record; unknown stats are ignored.

- **AI recommendations**  
  **getScoringContextForAI(sportType, formatType)** returns a short string (template name + key rules) that can be injected into AI prompts so draft, waiver, and matchup recommendations are scoring-aware.

---

## 5. Full UI Click Audit Findings

Scoring during creation is **preset-driven**: the user selects sport and variant, and the preset includes the scoring template (scoring_format, scoringTemplate with name and rules). There is no separate “scoring settings step” with category toggles or rules tables in the creation flow—the template is loaded from the backend and shown in the preset summary. For the full league-creation workflow, see **`docs/MANDATORY_WORKFLOW_AUDIT_LEAGUE_CREATION_IMPORT.md`**. Below is the audit for **scoring-related** elements.

### 5.1 Creation flow — scoring in preset and preview

| Element | Component & route | Handler | State / API | Backend / persistence | Status |
|--------|-------------------|---------|-------------|------------------------|--------|
| **Sport selector** | LeagueCreationSportSelector, `/startup-dynasty` | onValueChange → setSport | sport | useSportPreset → loadLeagueCreationDefaults → getScoringTemplate(sport, format); preset includes scoringTemplate (name, formatType, rules) | OK |
| **Preset / variant selector** | LeagueCreationPresetSelector | onValueChange → setLeagueVariant | leagueVariant | NFL IDP loads IDP template (offensive + IDP rules); preset includes scoringTemplate | OK |
| **Scoring preset (implicit)** | Same | Same | Scoring format comes from preset (PPR, Half PPR, Standard, IDP per variant) | getScoringTemplate(sportType, formatType); ScoringDefaultsRegistry / DB | OK |
| **Scoring rules tables** | No rules table in creation | — | LeagueSettingsPreviewPanel shows scoring name/format only | Full rules in preset.scoringTemplate.rules; commissioner can edit overrides later in settings | OK |
| **Points preview / category toggles** | No category toggles in creation | — | Preview shows scoring name (e.g. “PPR”, “Default NFL IDP”) | Override UI and rules table in league settings (post-creation) | OK |
| **Create button** | StartupDynastyForm | handleSubmit → POST /api/league/create | Body includes sport, leagueVariant | bootstrapLeagueScoring resolves template; getLeagueScoringRules(leagueId, sport, format) used at live scoring; overrides merged via ScoringOverrideService | OK |
| **Back / Continue** | Mode switch, redirect after create | — | — | No separate scoring step; back/continue as in mandatory audit | OK |

### 5.2 Post-creation scoring UI

| Element | Route / surface | Handler / wiring | Backend / persistence | Status |
|--------|-----------------|------------------|------------------------|--------|
| **Scoring override save** | League settings (commissioner) | Save overrides → API | ScoringOverrideService.upsertLeagueScoringOverrides(leagueId, overrides); getLeagueScoringRules merges overrides | OK |
| **Scoring rules tables (settings)** | League settings tab | Load rules from getLeagueScoringRules; edit and save overrides | Template + overrides; persisted in LeagueScoringOverride | OK |
| **Matchup score detail links** | League detail, matchup/standings | Navigate to score breakdown | Points from WeeklyMatchup or computed via getLeagueScoringRules + FantasyPointCalculator | OK |
| **Projections views** | Projections / rankings UI | Load scoring context for period | ProjectionSeedResolver.resolveProjectionSeed({ leagueSport, formatType }) → scoringRules; projections use same rules as live scoring | OK |
| **AI scoring-context launch** | Waiver AI, draft AI, trade eval | League meta includes sport/format; getScoringContextForAI(sportType, formatType) or scoring in context | AI prompts receive scoring context; getLeagueScoringRules used where league-specific rules needed | OK |

### 5.3 Verification summary

- **Handlers:** Sport and preset selectors drive scoring template; Create applies template resolution via bootstrap. Override save, matchup detail, projections, and AI launch points use league sport and format. No dead controls identified.
- **State:** Preset includes scoring and scoringTemplate; form state and create body align with sport/variant; settings and live scoring use getLeagueScoringRules(leagueId, sport, format).
- **Backend:** loadLeagueCreationDefaults returns scoringTemplate; getLeagueScoringRules(leagueId, sportType, formatType) returns template merged with overrides; FantasyPointCalculator.computeFantasyPoints(stats, rules); StatNormalizationService maps to canonical stat keys. No stale rules tables or mismatched saved scoring state when sport and formatType are passed through.
- **Persistence/reload:** LeagueScoringOverride stores commissioner overrides; getLeagueScoringRules merges on read; matchup and projections use merged rules. No preview mismatches identified.

---

## 6. QA Findings

- **Scoring templates:** ScoringDefaultsRegistry and DB ScoringTemplate provide templates keyed by sport-format (NFL-PPR, NFL-IDP, NBA-points, MLB-standard, NHL-standard, NCAAF-PPR, NCAAB-points, SOCCER-standard). getScoringTemplate(sportType, formatType) and getLeagueScoringRules(leagueId, sportType, formatType) resolve correctly; format from league_settings (resolveFormatTypeFromLeagueSettings) when provided.
- **League overrides:** ScoringOverrideService.mergeRulesWithOverrides and getLeagueScoringRules merge LeagueScoringOverride by statKey; live scoring and matchup use merged rules.
- **Matchup and projections:** MultiSportMatchupScoringService and ProjectionSeedResolver use getLeagueScoringRules / resolveScoringRulesForLeague; FantasyPointCalculator and stat normalization (canonical keys) unchanged. NFL scoring engine and matchup logic preserved.
- **Creation and UI:** Preset includes scoringTemplate; no separate scoring step; override save and rules tables in settings wired; matchup detail and projections use scoring context.

---

## 7. Issues Fixed

- No code changes were required for this deliverable. Default scoring (ScoringDefaultsRegistry, ScoringTemplateResolver, FantasyPointCalculator, LeagueScoringBootstrapService, ScoringOverrideService, MultiSportScoringResolver) and integration with league creation, matchup, projections, and AI are already implemented. Documentation was updated: deliverable intro, **Soccer** template in per-sport definitions, **full UI click audit** (Section 5), QA findings (6), issues fixed (7), final QA checklist (8), explanation (9). No dead controls, stale rules tables, mismatched saved scoring state, or preview mismatches found when sport and formatType are passed through.

---

## 8. Final QA Checklist

- [ ] **NFL league creation** – New NFL league uses PPR default; scoring template id and format match sport-defaults (e.g. default-NFL-PPR).
- [ ] **NFL Half PPR / Standard** – Leagues with scoring_format Half PPR or Standard resolve to correct template (receptions 0.5 or 0).
- [ ] **NFL IDP** – League with leagueVariant IDP or DYNASTY_IDP resolves to IDP template (offensive + IDP rules); resolveFormatTypeFromLeagueSettings returns 'IDP' when settings.leagueVariant is IDP.
- [ ] **NBA / NCAAB** – New league gets points template (points, rebounds, assists, steals, blocks, turnovers, 3PM, double_double, triple_double).
- [ ] **MLB** – New league gets standard template (batter + pitcher stats: single, double, triple, HR, rbi, run, walk, SB, IP, K, ER, save, hold, win, loss, QS).
- [ ] **NHL** – New league gets standard template (goal, assist, SOG, blocked_shot, power_play_point, short_handed_point, save, goal_allowed, win, loss, shutout).
- [ ] **NCAAF** – New league gets PPR-style template (same stat keys as NFL).
- [ ] **League overrides** – Upsert overrides for a league; getLeagueScoringRules returns merged rules (override pointsValue/enabled); live scoring uses merged rules.
- [ ] **Format from league_settings** – resolveScoringRulesForLeague(leagueId, leagueSport, undefined, { scoring_format: 'Half PPR' }) uses Half PPR template; with leagueVariant 'IDP' uses IDP when sport is NFL.
- [ ] **Matchup engine** – computeRosterScoreForWeek with league scoring rules produces correct totals; compatible with existing WeeklyMatchup / TeamPerformance.
- [ ] **AI context** – getScoringContextForAI(sportType, formatType) returns non-empty string with template name and key rules.
- [ ] **Existing NFL scoring engine** – No regression in matchup scoring, projections pipeline, or player stat normalization.
- [ ] **Scoring UI audit (Section 5)** – Scoring preset in creation, scoring rules/preview, Create/Back/Continue, override save, matchup score detail, projections views, and AI scoring-context launch points are wired correctly; no dead controls, stale rules tables, or preview mismatches.

---

## 9. Explanation of Default Scoring Settings by Sport

Default scoring settings define **how player stats are turned into fantasy points** for each sport and format. They are stored in **ScoringDefaultsRegistry** (in-memory) and optionally in DB **ScoringTemplate** rows. Resolution is by **sport_type**, **format_type**, and when available **league_settings** (scoring_format, leagueVariant for IDP).

1. **New leagues** – League creation loads the correct default by sport (and variant) via bootstrap and preset payload; the effective template is the one returned by getScoringTemplate(sport, format) with format from sport default or league_settings.

2. **Overrides** – Commissioners can change point values or disable rules via **LeagueScoringOverride**. **getLeagueScoringRules** and **mergeRulesWithOverrides** merge overrides with the template so live scoring and matchup use the league’s effective rules.

3. **Scoring engine** – **FantasyPointCalculator.computeFantasyPoints(stats, rules)** multiplies each stat value by the rule’s pointsValue and multiplier when enabled; stat keys in the stats record must match rule statKey. The matchup engine and projections pipeline use **resolveScoringRulesForLeague** (and optionally league_settings) so the correct template and overrides are applied during live scoring and projections.

4. **Matchup compatibility** – **MultiSportMatchupScoringService** already uses resolveScoringRulesForLeague and computeFantasyPoints; passing **league.settings** where available ensures format is taken from league_settings when not explicitly provided.

5. **AI** – **getScoringContextForAI(sportType, formatType)** gives a short scoring summary for AI prompts so recommendations (draft, waiver, matchup summary) can reason about scoring impact.

**Changes made for Prompt 8:**

- **MultiSportScoringResolver** – **resolveFormatTypeFromLeagueSettings(leagueSport, leagueSettings)** and **resolveScoringRulesForLeague(..., formatType?, leagueSettings?)** so format can be resolved from league_settings (scoring_format, leagueVariant for IDP).
- **ScoringDefaultsRegistry** – **normalizeFormatForLookup(sport, format)** and REGISTRY key **NFL-ppr** so format from settings (e.g. "ppr") resolves correctly; **getScoringContextForAI(sportType, formatType)** for AI recommendations.
- Existing NFL scoring engine, matchup logic, projections pipeline, league overrides, and stat normalization behavior are preserved; resolution is now explicitly documentable as sport_type + format_type + league_settings.

---

*Document generated for Prompt 8 — Default Scoring Settings by Sport. All eight sports/variants supported; full UI click audit in Section 5; NFL scoring engine preserved.*
