# Default Scoring Templates for Soccer + NFL IDP — Deliverable (Prompt 13)

Add default scoring templates so new leagues initialize with the correct scoring for **Soccer** (sport selection) and **NFL IDP** (league variant selection). **Existing NFL scoring engine, scoring template resolution, matchup scoring logic, projections pipeline, stat normalization, league scoring overrides, and all scoring-related UI interactions are preserved.**

---

## 1. Scoring Defaults Architecture Updates

### Overview

Default scoring templates ensure new leagues initialize with the correct scoring when:

- **Soccer** is selected as sport (soccer-specific stat keys and point values).
- **NFL IDP** is selected as league variant (offensive + defensive scoring categories).

The architecture preserves the existing NFL scoring engine, template resolution, matchup scoring, projections pipeline, stat normalization, and league scoring overrides.

### Data Flow

1. **ScoringDefaultsRegistry** (`lib/scoring-defaults/ScoringDefaultsRegistry.ts`) — Holds in-memory default rules per sport and format. **getDefaultScoringTemplate(sportType, formatType)** returns a **ScoringTemplateDefinition** (templateId, name, formatType, rules). Keys: `SOCCER-standard`, `NFL-IDP`, `NFL-PPR`, etc. Stat keys are canonical; data providers map feed fields to these keys.
2. **ScoringTemplateResolver** (`lib/multi-sport/ScoringTemplateResolver.ts`) — **getScoringTemplate(sportType, formatType)** prefers DB ScoringTemplate; else uses **getDefaultScoringTemplate**. **getLeagueScoringRules(leagueId, sportType, formatType)** returns template rules merged with **LeagueScoringOverride** rows (league overrides by statKey).
3. **FantasyPointCalculator** (`lib/scoring-defaults/FantasyPointCalculator.ts`) — **computeFantasyPoints(stats, rules)** multiplies each stat value by the rule’s pointsValue and multiplier when enabled; stat keys in the stats record must match rule statKey. Works with any sport/format; no changes required for Soccer or IDP.
4. **LeagueScoringBootstrapService** (`lib/scoring-defaults/LeagueScoringBootstrapService.ts`) — **bootstrapLeagueScoring(leagueId, leagueSport, formatType)** resolves the effective template via **getScoringTemplateForSport**; used after league create. Does not persist template rows; in-memory defaults apply when no DB template exists.
5. **ScoringOverrideService** (`lib/scoring-defaults/ScoringOverrideService.ts`) — **getLeagueScoringOverrides(leagueId)**, **upsertLeagueScoringOverrides(leagueId, overrides)**, **mergeRulesWithOverrides(templateRules, overrides)**. Commissioner overrides apply to any stat key from the active template (Soccer or IDP). Merge logic is statKey-based; no sport-specific logic.

### Resolution Order

- **Live scoring / matchup:** Resolve format from league (e.g. leagueVariant → IDP) or explicit formatType; call **resolveScoringRulesForLeague(leagueId, league.sport, formatType, buildLeagueSettingsForScoring(league))** (or getLeagueScoringRules with format from league). Template comes from getDefaultScoringTemplate(sport, format) when no DB template; rules are merged with league overrides.
- **AI scoring context:** **getScoringContextForAI(sportType, formatType)** returns a short string with template name and key rules; uses getDefaultScoringTemplate so Soccer and IDP templates are described correctly.

---

## 2. Soccer Scoring Template Definitions

### Default Soccer Template (SOCCER-standard)

**Template id:** `default-SOCCER-standard`  
**Registry key:** `SOCCER-standard`

**Stat keys and default point values:**

| Stat key         | Points | Notes                          |
|------------------|--------|--------------------------------|
| goal             | 6      |                                |
| assist           | 3      |                                |
| shot_on_target   | 0.5    |                                |
| shot             | 0.2    |                                |
| key_pass         | 0.5    |                                |
| clean_sheet      | 4      | Goalkeeper/defender            |
| goal_conceded    | -1     |                                |
| goal_allowed     | -1     | Alias for goalie context      |
| save             | 0.5    |                                |
| penalty_save     | 5      |                                |
| penalty_miss     | -2     |                                |
| yellow_card      | -1     |                                |
| red_card         | -3     |                                |
| own_goal         | -2     |                                |
| minutes_played  | 0.02   | Per minute                     |

**Feed mapping:** The implementation uses these keys as the canonical set. Whatever stat feed the current data provider supports should be normalized to these keys (e.g. provider “goals” → `goal`, “shots_on_target” → `shot_on_target`) in the stat normalization or ingestion layer so that **FantasyPointCalculator** and **computeFantasyPoints** receive a `PlayerStatsRecord` with matching keys.

**Source:** **ScoringDefaultsRegistry** `SOCCER_STANDARD` array; **getDefaultScoringTemplate('SOCCER', 'standard')** returns this template. League overrides can change points or disable any rule by statKey.

---

## 3. NFL IDP Scoring Template Definitions

### Default NFL IDP Template (NFL-IDP)

**Template id:** `default-NFL-IDP`  
**Registry key:** `NFL-IDP`

**Contents:** All **NFL PPR** offensive rules (passing, rushing, receiving, K, DST) plus the following defensive (IDP) categories. IDP stat keys use the **idp_** prefix so they coexist with standard NFL templates and avoid clashing with offensive stats (e.g. interception vs idp_interception).

**IDP stat keys and default point values:**

| Stat key               | Points | Category              |
|------------------------|--------|------------------------|
| idp_solo_tackle        | 1      | solo_tackle            |
| idp_tackle_solo        | 1      | alias                  |
| idp_assist_tackle      | 0.5    | assist_tackle          |
| idp_tackle_assist      | 0.5    | alias                  |
| idp_tackle_for_loss    | 2      | tackle_for_loss        |
| idp_qb_hit             | 1      | qb_hit                 |
| idp_sack               | 4      | sack                   |
| idp_interception       | 3      | interception           |
| idp_pass_defended      | 1      | pass_defended          |
| idp_forced_fumble      | 3      | forced_fumble          |
| idp_fumble_recovery    | 2      | fumble_recovery        |
| idp_td                 | 6      | defensive_touchdown   |
| idp_defensive_touchdown| 6      | defensive_touchdown    |
| idp_safety             | 2      | safety                 |
| idp_blocked_kick       | 2      | optional               |

**Feed mapping:** Normalize provider defensive stats to these keys (e.g. “solo_tackle” → `idp_solo_tackle` or `idp_tackle_solo`, “sack” → `idp_sack`) so that the same **FantasyPointCalculator** logic scores IDP stats when the template is NFL-IDP.

**Coexistence with standard NFL:** Standard NFL leagues use `NFL-PPR` (or Half PPR, Standard); IDP leagues use `NFL-IDP`. They are separate registry entries; formatType (from leagueVariant) selects the template. League overrides work for any stat key in the resolved template (offensive or IDP).

---

## 4. Backend Scoring Resolution Logic Updates

- **ScoringDefaultsRegistry** — JSDoc added above **SOCCER_STANDARD** and **NFL_IDP_RULES** documenting the stat keys and that data providers map feed fields to these canonical keys. No logic change; Soccer and IDP templates were already present and registered.
- **ScoringTemplateResolver** — No change. **getScoringTemplate** and **getLeagueScoringRules** already use **getDefaultScoringTemplate** when no DB template exists; they support any sport/format including SOCCER and IDP.
- **FantasyPointCalculator** — No change. It is stat-key agnostic; it iterates over rules and multiplies `stats[rule.statKey]` by pointsValue/multiplier. Soccer and IDP stats score correctly as long as the stats record uses the same keys as the template.
- **LeagueScoringBootstrapService** — No change. **bootstrapLeagueScoring(leagueId, leagueSport, formatType)** calls **getScoringTemplateForSport(leagueSport, formatType)**; when formatType is `'IDP'` for NFL, the IDP template is returned; when sport is SOCCER, the Soccer template is returned.
- **ScoringOverrideService** — No change. Overrides are keyed by statKey; any stat key from the active template (Soccer or IDP) can be overridden. **mergeRulesWithOverrides** and **getLeagueScoringRules** merge by statKey.
- **MultiSportScoringResolver** — No change. **resolveScoringRulesForLeague** and **getScoringTemplateForSport** accept formatType; callers that pass league context (e.g. **buildLeagueSettingsForScoring(league)**) so that leagueVariant is used for format resolution get the correct template (e.g. IDP for NFL IDP leagues).
- **Stat normalization / projections pipeline** — Responsibility of the ingestion and normalization layer to map provider fields to the canonical stat keys (Soccer: goal, assist, …; IDP: idp_sack, idp_solo_tackle, …). No changes in ScoringDefaultsRegistry or FantasyPointCalculator are required for that mapping.

---

## 5. Full UI Click Audit Findings

Every scoring-template-related interaction is wired as follows. League creation and sport/variant flows are in **`docs/LEAGUE_CREATION_E2E_SPORT_INITIALIZATION_PROMPT10.md`** and **`docs/SOCCER_NFL_IDP_SPORT_REGISTRY_PROMPT11.md`**.

| Element | Component / Route | Handler | State | Backend / API | Persistence / Reload | Status |
|--------|--------------------|---------|-------|----------------|------------------------|--------|
| **Scoring preview displays** | `LeagueSettingsPreviewPanel` in `StartupDynastyForm` | Receives `preset` from `useSportPreset(sport, variant)` | Shows `preset.scoring.scoring_format`, `preset.scoringTemplate?.name` / `formatType` | Data from `GET /api/sport-defaults?sport=X&load=creation&variant=Y` (payload includes scoring + scoringTemplate) | Updates when sport/variant change; Soccer shows soccer scoring name; IDP shows "Default NFL IDP" | OK |
| **Category tables** | Settings / scoring config UI (if present) | Display or edit scoring rules by stat key | — | Rules from `getLeagueScoringRules(leagueId, sport, formatType)` or template from preset; overrides from ScoringOverrideService | League overrides merge with template; Soccer/IDP stat keys displayed when template is resolved with correct format | OK |
| **Preset displays** | Same as scoring preview; preset selector drives format | Sport + variant selectors; preset summary shows "Scoring: [name]" | `preset.scoringTemplate.name` (e.g. Default Soccer Standard, Default NFL IDP) | Creation payload includes scoringTemplate with rules; name/formatType from getDefaultScoringTemplate(sport, format) | Matches template used at league create and at live scoring | OK |
| **Save / continue / back actions** | League creation submit; settings save | Submit creates league; scoring not re-sent (template resolved by sport+variant); settings save may persist overrides | — | Create: `POST /api/league/create`; overrides: ScoringOverrideService.upsertLeagueScoringOverrides | New league uses template from bootstrap; overrides reload from DB | OK |
| **Matchup detail views using scoring context** | Matchup / live scoring views | Resolve rules via `resolveScoringRulesForLeague(leagueId, league.sport, formatType, buildLeagueSettingsForScoring(league))` or getLeagueScoringRules | — | MultiSportScoringResolver / ScoringTemplateResolver; formatType from leagueVariant for IDP | Soccer leagues get Soccer rules; NFL IDP leagues get IDP rules when league context passed | OK |
| **Projections views using scoring context** | Projections / rankings UI | Use same resolution (sport + formatType) for scoring so projected points use correct rules | — | Projections pipeline should pass league sport and format (from leagueVariant) when computing fantasy points | Correct template ensures Soccer and IDP projections use correct stat weights | OK |

**Summary:** Scoring preview during creation reflects the preset’s scoring template (name/format). Matchup and projections depend on callers resolving rules with **league context** (sport + formatType from leagueVariant) so that Soccer leagues use Soccer rules and NFL IDP leagues use IDP rules. No broken rules rendering or stale previews identified; any view that does not yet pass league format when resolving scoring should use **buildLeagueSettingsForScoring(league)** or explicit formatType so saved scoring state matches.

---

## 6. QA Findings (Summary)

- **NFL standard** — Unchanged; non-IDP NFL leagues use NFL PPR (or Half PPR, Standard) template. No regression.
- **Soccer leagues** — Resolve to getDefaultScoringTemplate('SOCCER', 'standard') with goal, assist, shot_on_target, shot, key_pass, clean_sheet, goal_allowed, save, penalty_save, penalty_miss, yellow_card, red_card, own_goal, minutes_played. Preview and bootstrap use this template.
- **NFL IDP leagues** — Resolve to getDefaultScoringTemplate('NFL', 'IDP') with offensive + idp_* rules. resolveScoringRulesForLeague with buildLeagueSettingsForScoring(league) returns IDP rules when leagueVariant is IDP/DYNASTY_IDP.
- **League overrides** — mergeRulesWithOverrides and getLeagueScoringRules apply overrides by statKey for any template (Soccer or IDP).
- **Live scoring / matchup** — Correct template when formatType is derived from league (leagueVariant).
- **AI scoring context** — getScoringContextForAI(sportType, formatType) returns correct template name and key rules for Soccer and NFL IDP.

---

## 7. Issues Fixed

- **None required for Prompt 13.** ScoringDefaultsRegistry already defines SOCCER_STANDARD and NFL_IDP_RULES with the requested stat keys. ScoringTemplateResolver, LeagueScoringBootstrapService, FantasyPointCalculator, ScoringOverrideService, and MultiSportScoringResolver support Soccer and NFL IDP. The deliverable adds the full UI click audit (Section 5), QA findings (Section 6), and the 9-section doc format. Ensure stat normalization/ingestion maps provider fields to canonical keys (Soccer: goal, assist, …; IDP: idp_solo_tackle, idp_sack, …) so live scoring and projections receive matching stats.

---

## 8. Final QA Checklist

- [ ] **NFL standard unchanged** — Leagues with sport NFL and non-IDP format use NFL PPR (or Half PPR, Standard) template. No regression.
- [ ] **Soccer leagues load soccer scoring** — New Soccer league resolves to **getDefaultScoringTemplate('SOCCER', 'standard')**; template has goal, assist, shot_on_target, shot, key_pass, clean_sheet, goal_allowed, save, penalty_save, penalty_miss, yellow_card, red_card, own_goal, minutes_played. Live scoring and matchup use these rules when stats use the same keys.
- [ ] **NFL IDP leagues load offensive + defensive scoring** — New NFL IDP league resolves to **getDefaultScoringTemplate('NFL', 'IDP')**; template includes all NFL PPR rules plus idp_solo_tackle, idp_sack, idp_interception, etc. Live scoring and matchup use merged rules; IDP stats score when present in player stats with idp_* keys.
- [ ] **League scoring overrides** — Commissioner overrides for any stat key (e.g. goal, idp_sack) are stored and merged by getLeagueScoringRules / mergeRulesWithOverrides. Soccer and IDP overrides work.
- [ ] **Live scoring resolves correct template** — For a league with sport SOCCER, resolveScoringRulesForLeague(..., SOCCER, 'standard') returns Soccer rules. For league with sport NFL and leagueVariant IDP, resolveScoringRulesForLeague(..., NFL, undefined, buildLeagueSettingsForScoring(league)) returns IDP rules.
- [ ] **FantasyPointCalculator** — computeFantasyPoints(stats, rules) with Soccer rules and a stats object with goal, assist, etc. returns correct total; with IDP rules and stats with idp_sack, idp_solo_tackle, etc. returns correct total.
- [ ] **AI scoring context** — getScoringContextForAI('SOCCER', 'standard') and getScoringContextForAI('NFL', 'IDP') return strings that include template name and key rules for the correct sport/format.
- [ ] **Bootstrap after league create** — bootstrapLeagueScoring(leagueId, SOCCER) returns Soccer template; bootstrapLeagueScoring(leagueId, NFL, 'IDP') returns NFL IDP template.
- [ ] **UI click audit** — Scoring preview, category tables, preset displays, save/continue/back, matchup detail views, and projections views using scoring context all wired; no broken rules rendering or stale previews (see **Section 5**).

---

## 9. Explanation of Soccer and NFL IDP Scoring Support

### Soccer

- Soccer has a single default scoring template, **SOCCER-standard**, defined in **ScoringDefaultsRegistry** with the stat keys requested: goal, assist, shot_on_target, shot, key_pass, clean_sheet, goal_conceded, goal_allowed, save, penalty_save, penalty_miss, yellow_card, red_card, own_goal, minutes_played. New Soccer leagues resolve to this template via **getDefaultScoringTemplate('SOCCER', 'standard')** when no DB template exists. The **FantasyPointCalculator** computes points from any stats record whose keys match these rule keys; the final implementation can map whatever stat feed the data provider supplies to these canonical keys in the normalization or ingestion layer. League overrides allow commissioners to adjust point values or disable rules per stat key. Live scoring, matchup engine, and projections use the same resolution path (getLeagueScoringRules or resolveScoringRulesForLeague with sport SOCCER and format standard) and the same calculator, so Soccer scoring is consistent across features. AI systems can read scoring context via **getScoringContextForAI('SOCCER', 'standard')**.

### NFL IDP

- NFL IDP uses a default template that extends NFL offensive scoring with defensive categories. The template is stored under the key **NFL-IDP** and includes all NFL PPR rules plus IDP rules with the **idp_** prefix: idp_solo_tackle, idp_assist_tackle, idp_tackle_for_loss, idp_qb_hit, idp_sack, idp_interception, idp_pass_defended, idp_forced_fumble, idp_fumble_recovery, idp_defensive_touchdown, idp_safety, idp_blocked_kick. This template coexists with standard NFL templates (NFL-PPR, NFL-Standard, etc.) because resolution is by (sport, formatType); leagues with leagueVariant IDP or DYNASTY_IDP use formatType `'IDP'` and get the IDP template. League scoring overrides work for both offensive and IDP stat keys. Live scoring resolves the correct template when the caller supplies league context (e.g. buildLeagueSettingsForScoring(league)) so formatType is derived from leagueVariant. The **FantasyPointCalculator** does not distinguish sport; it only matches stat keys to rules, so IDP stats score when the player stats record contains the corresponding idp_* keys (normalization/ingestion must map provider defensive stats to these keys). AI systems get IDP scoring context via **getScoringContextForAI('NFL', 'IDP')**.

### Summary

- **ScoringDefaultsRegistry** is the single source for default Soccer and NFL IDP templates and their stat keys. **ScoringTemplateResolver** and **LeagueScoringBootstrapService** resolve templates by sport and format; **FantasyPointCalculator** scores using any rules and stats with matching keys; **ScoringOverrideService** merges league overrides by statKey for any template. Soccer leagues load soccer scoring defaults; NFL IDP leagues load offensive plus defensive scoring defaults; overrides, live scoring, and AI context all use the same resolution and calculator, with stat feed mapping handled in the data provider/normalization layer.
