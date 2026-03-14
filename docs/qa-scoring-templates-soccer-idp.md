# QA Checklist: Default Scoring Templates — Soccer & NFL IDP

## Soccer scoring template

- [ ] **Template resolution:** getDefaultScoringTemplate('SOCCER', 'standard') returns SOCCER_STANDARD with templateId `default-SOCCER-standard`.
- [ ] **Stat keys present:** goal, assist, shot_on_target, shot, key_pass, clean_sheet, goal_conceded, goal_allowed, save, penalty_save, penalty_miss, yellow_card, red_card, own_goal, minutes_played. All have pointsValue and enabled.
- [ ] **League creation:** New Soccer league gets scoring_format from SportDefaultsRegistry; bootstrap uses format 'standard'; getScoringTemplate('SOCCER', 'standard') returns default Soccer template.
- [ ] **Live scoring:** resolveScoringRulesForLeague(leagueId, SOCCER) or getScoringTemplateForSport(SOCCER) returns Soccer rules; FantasyPointCalculator computes points for stats keyed by these keys.
- [ ] **League overrides:** Commissioner can override any stat key (e.g. goal, assist) via ScoringOverrideService; getLeagueScoringRules merges overrides with template.
- [ ] **Feed mapping:** Pipeline can map provider stat fields to these keys (e.g. goals -> goal, shots_on_target -> shot_on_target); unknown stats ignored by calculator.

## NFL IDP scoring template

- [ ] **Template resolution:** getDefaultScoringTemplate('NFL', 'IDP') returns NFL_IDP_RULES with templateId `default-NFL-IDP`. REGISTRY keys 'NFL-IDP' and 'NFL-idp' both resolve to same rules.
- [ ] **Offensive rules preserved:** All NFL PPR rules included (passing_yards, passing_td, receptions, rushing_yards, etc., plus K and DST).
- [ ] **IDP stat keys present:** idp_tackle_solo, idp_tackle_assist, idp_solo_tackle, idp_assist_tackle, idp_tackle_for_loss, idp_qb_hit, idp_sack, idp_interception, idp_pass_defended, idp_forced_fumble, idp_fumble_recovery, idp_td, idp_defensive_touchdown, idp_safety, idp_blocked_kick. Coexists with standard NFL templates (no IDP rules in standard/PPR).
- [ ] **League creation:** NFL league with variant IDP or DYNASTY_IDP gets bootstrap with formatType 'IDP'; bootstrapLeagueScoring(leagueId, NFL, 'IDP') returns IDP template.
- [ ] **Live scoring:** resolveScoringRulesForLeague(leagueId, NFL, 'IDP') returns template + overrides; IDP stats (e.g. idp_sack, idp_solo_tackle) score correctly when present in player stats.
- [ ] **League overrides:** Overrides work for both offensive and IDP stat keys; mergeRulesWithOverrides applies to full rule set.
- [ ] **AI/context:** Systems that read scoring context get full rule set (offensive + IDP) when league is IDP.

## Backend resolution

- [ ] **getDefaultScoringTemplate(sport, format):** Fallback: NFL + format 'IDP' -> 'NFL-IDP'; SOCCER -> 'SOCCER-standard'; other sports use existing fallbacks.
- [ ] **getScoringTemplate(sport, format):** DB first; else getDefaultScoringTemplate(sport, format). Soccer and NFL IDP use in-memory defaults when no DB template.
- [ ] **getLeagueScoringRules(leagueId, sport, format):** Returns template rules merged with league overrides; format 'IDP' for NFL yields IDP template.
- [ ] **getScoringTemplateForSport(leagueSport, formatType):** Uses leagueSport and optional formatType; IDP leagues pass formatType 'IDP'.

## FantasyPointCalculator and overrides

- [ ] **computeFantasyPoints(stats, rules):** Any stat key in rules that exists in stats is scored; unknown stats in stats ignored. Soccer and IDP keys work when stats object has matching keys.
- [ ] **League overrides:** getLeagueScoringRules returns rules with overrides applied; calculator uses that list. No change to calculator logic.

## Regression

- [ ] **NFL standard/PPR/Half PPR:** Unchanged; no IDP rules in those templates.
- [ ] **Other sports:** NBA, MLB, NHL, NCAAF, NCAAB default templates unchanged.
- [ ] **Matchup scoring:** Uses getLeagueScoringRules or equivalent; when league is Soccer or NFL IDP, correct template is resolved by sport + format.
- [ ] **Projections pipeline:** If it uses same scoring rules resolution, projections use correct template for Soccer and IDP leagues.
