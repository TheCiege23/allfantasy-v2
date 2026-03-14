# Default Scoring Templates: Soccer and NFL IDP

## Overview

Default scoring templates ensure **Soccer** leagues use soccer-specific stat keys and point values, and **NFL IDP** leagues use offensive scoring plus defensive (IDP) categories. The same resolution path (ScoringDefaultsRegistry → ScoringTemplateResolver → getLeagueScoringRules + overrides) and FantasyPointCalculator are used for all sports; league overrides, live scoring, and AI context read the correct template by sport and format.

## Scoring defaults architecture

- **ScoringDefaultsRegistry** — In-memory default templates per sport and format. Keys like `SOCCER-standard`, `NFL-IDP`, `NFL-PPR`. `getDefaultScoringTemplate(sportType, formatType)` returns a ScoringTemplateDefinition (templateId, name, rules). Fallback: NFL + format `IDP` → `NFL-IDP`; SOCCER → `SOCCER-standard`.
- **ScoringTemplateResolver** — `getScoringTemplate(sportType, formatType)`: DB ScoringTemplate first; else `getDefaultScoringTemplate(sport, format)`. `getLeagueScoringRules(leagueId, sportType, formatType)`: template rules merged with LeagueScoringOverride rows.
- **FantasyPointCalculator** — `computeFantasyPoints(stats, rules)`: for each rule, `points += stats[rule.statKey] * pointsValue * multiplier`. Stat keys are canonical; data providers map feed fields to these keys.
- **LeagueScoringBootstrapService** — `bootstrapLeagueScoring(leagueId, leagueSport, formatType?)`: resolves template via `getScoringTemplateForSport(leagueSport, formatType)`; used after league create so Soccer and IDP leagues get the right template. Does not persist template rows; uses in-memory defaults when no DB template.
- **ScoringOverrideService** — League-level overrides (statKey, pointsValue, enabled). `getLeagueScoringRules` merges overrides with template; override keys can be any stat key from the template (Soccer or IDP).

## Soccer scoring template

- **Template id:** `default-SOCCER-standard` (format `standard`).
- **Stat keys (configurable; map to provider feed):**
  - goal, assist, shot_on_target, shot, key_pass
  - clean_sheet, goal_conceded, goal_allowed (goal_allowed alias for goal_conceded)
  - save, penalty_save, penalty_miss
  - yellow_card, red_card, own_goal
  - minutes_played
- **Default point values (examples):** goal 6, assist 3, clean_sheet 4, goal_conceded/goal_allowed -1, save 0.5, penalty_save 5, penalty_miss -2, yellow_card -1, red_card -3, own_goal -2, shot_on_target 0.5, shot 0.2, key_pass 0.5, minutes_played 0.02.
- **Resolution:** New Soccer league → bootstrap with format `standard` → `getScoringTemplate('SOCCER', 'standard')` → SOCCER_STANDARD. Live scoring and matchups use same resolution; overrides apply per stat key.

## NFL IDP scoring template

- **Template id:** `default-NFL-IDP` (format `IDP`).
- **Contents:** Full NFL PPR offensive rules (passing, rushing, receiving, K, DST) plus IDP rules. Coexists with NFL-PPR / NFL-Standard (no IDP rules in those).
- **IDP stat keys:**
  - solo tackle: idp_tackle_solo, idp_solo_tackle (same value; feed can use either)
  - assist tackle: idp_tackle_assist, idp_assist_tackle
  - tackle_for_loss: idp_tackle_for_loss
  - qb_hit: idp_qb_hit
  - sack: idp_sack
  - interception: idp_interception
  - pass_defended: idp_pass_defended
  - forced_fumble: idp_forced_fumble
  - fumble_recovery: idp_fumble_recovery
  - defensive_touchdown: idp_td, idp_defensive_touchdown
  - safety: idp_safety
  - blocked_kick: idp_blocked_kick
- **Resolution:** League with variant IDP or DYNASTY_IDP → bootstrap with formatType `IDP` → `getScoringTemplate('NFL', 'IDP')` → NFL_IDP_RULES. getLeagueScoringRules(leagueId, 'NFL', 'IDP') returns offensive + IDP rules merged with overrides.

## Backend scoring resolution flow

1. **League create:** For IDP variant, scoring format passed to runLeagueBootstrap is `'IDP'`; for Soccer, format is `'standard'`.
2. **Bootstrap:** bootstrapLeagueScoring(leagueId, leagueSport, formatType) calls getScoringTemplateForSport(leagueSport, formatType) → getScoringTemplate(sportType, formatType) → DB or getDefaultScoringTemplate(sport, format).
3. **Live scoring / matchups:** resolveScoringRulesForLeague(leagueId, leagueSport, formatType) or equivalent uses league’s sport and format (from leagueVariant for IDP) to get template, then getLeagueScoringRules(leagueId, sport, format) for template + overrides.
4. **AI / projections:** Same resolution (sport + format) yields correct rule set for Soccer or NFL IDP.

## League scoring overrides

- Overrides are per league and per statKey. Any stat key from the active template can be overridden (pointsValue, enabled). Soccer leagues can override goal, assist, etc.; IDP leagues can override idp_sack, idp_tackle_solo, etc. Merge logic unchanged; ScoringOverrideService and getLeagueScoringRules already support arbitrary stat keys.

## Stat feed mapping

- Stat keys in the registry are canonical. Data providers (or a normalization layer) should map feed fields to these keys (e.g. goals → goal, shots_on_target → shot_on_target; solo_tackles → idp_tackle_solo or idp_solo_tackle). FantasyPointCalculator only scores stats that exist on the player stats object; unknown keys in the rules are skipped when the stat is missing.

## Summary

| Area | Soccer | NFL IDP |
|------|--------|---------|
| **Template key** | SOCCER-standard | NFL-IDP / NFL-idp |
| **Format** | standard | IDP |
| **Stat keys** | goal, assist, shot_on_target, shot, key_pass, clean_sheet, goal_conceded, goal_allowed, save, penalty_*, cards, own_goal, minutes_played | NFL PPR + idp_solo_tackle, idp_tackle_for_loss, idp_qb_hit, idp_sack, idp_interception, idp_pass_defended, idp_forced_fumble, idp_fumble_recovery, idp_defensive_touchdown, idp_safety, etc. |
| **Bootstrap** | format standard | format IDP when leagueVariant IDP/DYNASTY_IDP |
| **Overrides** | Yes, any Soccer stat key | Yes, any offensive or IDP stat key |

Existing NFL (non-IDP) scoring, matchup logic, projections, and stat normalization are unchanged; IDP and Soccer are additive templates and resolution paths.
