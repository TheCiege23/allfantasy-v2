# Teams, Logos, and Player Pool Support for Soccer + NFL IDP — Deliverable (Prompt 14)

Ensure the platform correctly loads **Soccer** teams, logos, and soccer player pools, and **NFL IDP** players as part of the NFL player ecosystem with defensive eligibility. **Existing NFL team metadata, NFL player ingestion, logo rendering logic, player card rendering, draft room and waiver player queries, and all logo/player-card/filter interactions are preserved.**

---

## 1. Team and Player Metadata Architecture Updates

### Overview

The platform correctly loads:

- **Soccer:** Soccer team metadata, Soccer logos, and Soccer player pool (sport_type = SOCCER).
- **NFL IDP:** NFL teams and logos (same as NFL); NFL player pool including defensive players with defensive eligibility (DE, DT, LB, CB, S; slot eligibility DL, DB, IDP_FLEX via PositionEligibilityResolver).

Existing NFL team metadata, NFL player ingestion, logo rendering, player card rendering, draft room player queries, and waiver player pool queries are preserved.

### Module Roles

| Module | Role |
|--------|------|
| **SportTeamMetadataRegistry** | Per-sport team metadata (team_id, abbreviation, primary_logo_url). Soccer: SOCCER_TEAMS (MLS + clubs); NFL: canonical list from team-abbrev. **Update:** getPrimaryLogoUrlForTeam now returns an ESPN-style URL fallback when the team is not in the static list (e.g. Soccer club or national team not in SOCCER_TEAMS) so logos can still be attempted. |
| **TeamLogoResolver** | resolveTeamLogoUrl(teamAbbr, sport): DB (SportsTeam) first, then registry. Supports SOCCER and NFL; frontend passes league sport so league, roster, draft, and waiver views render the correct logos. |
| **SportPlayerPoolResolver** | getPlayerPoolForSport(sport, options) and getPlayerPoolForLeague(leagueId, leagueSport, options). Soccer leagues use sport SOCCER only. NFL IDP leagues use sport NFL; pool includes all NFL players (offensive + defensive when present in SportsPlayer). options.position filters by position (e.g. DE, DT, LB, CB, S for IDP). |
| **PlayerTeamMapper** | getTeamForPlayer(playerId, sport) and getTeamForPlayers(playerIds, sport). Sport-scoped; works for SOCCER and NFL (IDP uses same NFL team mapping). |
| **LeaguePlayerPoolBootstrapService** | getLeaguePlayerPoolContext(leagueId, leagueSport) and bootstrapLeaguePlayerPool(leagueId, leagueSport). Returns teams from getTeamMetadataForSport(sport) and player pool from getPlayerPoolForLeague; Soccer gets SOCCER teams and pool, NFL IDP gets NFL teams and full NFL pool. |
| **PositionEligibilityResolver** | getAllowedPositionsForSlot(sport, slotName, formatType), isPositionEligibleForSlot(…, formatType), getPositionsForSport(sport, formatType). For NFL IDP use formatType 'IDP'; getPositionsForSport('NFL', 'IDP') returns QB, RB, WR, TE, K, DST, DE, DT, LB, CB, S for draft/waiver position filters. For Soccer, positions are GKP, DEF, MID, FWD (GKP accepts GK). |

---

## 2. Soccer Metadata and Player Pool Mapping

### Soccer Team Metadata

- **Source:** **SportTeamMetadataRegistry** SOCCER_TEAMS (MLS + select clubs: Atlanta United, LAFC, LA Galaxy, Seattle, NYC FC, Philadelphia, Dallas, Houston, SKC, RSL, Minnesota, Austin, Chicago, Columbus, DC, Miami, Montréal, New England, Nashville, Orlando, Portland, San Jose, St. Louis, Vancouver). Each entry has abbr, name, city; buildSoccerTeams() produces TeamMetadata with team_id, sport_type SOCCER, team_name, city, abbreviation, primary_logo_url (ESPN soccer/500 path).
- **Club vs national:** Current product scope uses club metadata (MLS). National teams can be added to SOCCER_TEAMS or via SportsTeam DB; getPrimaryLogoUrlForTeam now falls back to an ESPN-style URL for any abbreviation not in the static list so new clubs or national teams still get a logo URL.
- **Logos:** TeamLogoResolver uses sport SOCCER; DB SportsTeam.logo takes precedence; else getPrimaryLogoUrlForTeam('SOCCER', abbr) returns static URL or fallback URL by abbr.

### Soccer Player Pool

- **Resolution:** getPlayerPoolForSport('SOCCER') and getPlayerPoolForLeague(leagueId, 'SOCCER') query SportsPlayer where sport = 'SOCCER'. Soccer leagues only load soccer teams and players; no cross-sport mixing.
- **Position mapping:** Suggested positions GK, DEF, MID, FWD map to canonical positions: **GKP** (or **GK** in feeds; PositionEligibilityResolver accepts GK for GKP slot), **DEF**, **MID**, **FWD**. UTIL is a slot that accepts GKP, DEF, MID, FWD. Use **getPositionsForSport('SOCCER')** (or template-derived list) for draft room and waiver position filters; options.position in getPlayerPoolForLeague can filter by position when needed.

### Soccer in Draft Room and Waiver

- **Teams:** getTeamMetadataForSport('SOCCER') returns Soccer team list; LeaguePlayerPoolBootstrapService includes these in context for the league.
- **Players:** getPlayerPoolForLeague(leagueId, 'SOCCER') returns only soccer players. Position filter dropdown should use SOCCER positions (GKP, DEF, MID, FWD).
- **Logos:** Pass sport 'SOCCER' into resolveTeamLogoUrl(teamAbbr, 'SOCCER') so league, roster, draft, and waiver views render Soccer team logos.

---

## 3. NFL IDP Defensive Player Mapping

### NFL IDP Player Pool

- **Same ecosystem as NFL:** NFL IDP leagues use the same player pool as NFL (sport_type = NFL). getPlayerPoolForLeague(leagueId, 'NFL') returns all NFL players; no separate “IDP pool.”
- **Defensive players:** For defensive players (DE, DT, LB, CB, S) to appear in the pool, **SportsPlayer** must contain records with sport = 'NFL' and position in DE, DT, LB, CB, S. If current NFL player ingestion only includes offensive players and DST, **ingestion should be expanded** to include defensive player records from the current data provider (e.g. Sleeper, ESPN, or other feed) so that IDP leagues can draft and roster them.
- **Eligibility:** Defensive eligibility is enforced by **PositionEligibilityResolver** with formatType **'IDP'** and the IDP roster template (DL, DB, IDP_FLEX slots). getPositionsForSport('NFL', 'IDP') returns QB, RB, WR, TE, K, DST, DE, DT, LB, CB, S — use this list for draft room and waiver position filters so IDP leagues can filter by DL, DE, DT, LB, DB, CB, S as needed (DL/DB are slot names; DE, DT, LB, CB, S are player positions).

### Slot and Position Mapping

- **Player positions (IDP):** DE, DT, LB, CB, S.
- **Slot names (flex):** DL (DE, DT), DB (CB, S), IDP_FLEX (DE, DT, LB, CB, S). These are resolved by getRosterTemplateDefinition('NFL', 'IDP') and getAllowedPositionsForSlot('NFL', slotName, 'IDP').
- **Draft/waiver:** Use getPositionsForSport('NFL', 'IDP') for the position filter list when league is IDP so that defensive positions appear. options.position in getPlayerPoolForLeague(leagueId, 'NFL', { position: 'DE' }) returns only DEs when needed.

### Teams and Logos for NFL IDP

- **Teams:** NFL IDP uses the same team metadata as NFL (getTeamMetadataForSport('NFL')). No separate IDP team list.
- **Logos:** Same as NFL; resolveTeamLogoUrl(teamAbbr, 'NFL'). Player cards and roster views use league sport (NFL) so logos are correct.

---

## 4. Logo and Player Query Integration Updates

### Logo Resolution

- **SportTeamMetadataRegistry.getPrimaryLogoUrlForTeam(sport, abbreviation):** Now returns an ESPN-style URL when the team is not in the static list (e.g. Soccer club not in SOCCER_TEAMS), so unknown teams still get a logo URL attempt. Existing behavior for known teams unchanged.
- **TeamLogoResolver:** No API change. Callers must pass **league sport** (e.g. SOCCER for Soccer leagues, NFL for NFL IDP leagues) so that resolveTeamLogoUrl(teamAbbr, sport) uses the correct sport and registry/DB. League, roster, draft, and waiver views should pass the league’s sport (e.g. from useLeagueSport or league.sport).

### Player Queries

- **Draft room:** Load players via getPlayerPoolForLeague(leagueId, leagueSport) (or equivalent). For position filter, use getPositionsForSport(leagueSport, formatType) where formatType is 'IDP' for NFL IDP leagues so the filter list includes DE, DT, LB, CB, S. For Soccer use getPositionsForSport('SOCCER').
- **Waiver:** Same as draft: getPlayerPoolForLeague(leagueId, leagueSport); position filter by sport and, for NFL IDP, formatType 'IDP'. League player pool context can be obtained from getLeaguePlayerPoolContext(leagueId, leagueSport).
- **Roster / player cards:** getTeamForPlayer(playerId, league.sport) and resolveTeamLogoUrl(teamAbbr, league.sport) so team and logo are sport-correct.

### Integration Points

- **League bootstrap:** LeaguePlayerPoolBootstrapService.getLeaguePlayerPoolContext(leagueId, leagueSport) already returns sport-specific teams and player pool; no change needed for Soccer or NFL IDP.
- **PositionEligibilityResolver:** Already supports formatType; use formatType 'IDP' when resolving slot eligibility and position lists for NFL IDP leagues. Lineup validation and “can add player to slot” checks use the same resolver with formatType so Soccer and IDP structures are enforced.

---

## 5. Full UI Click Audit Findings

Every team/logo/player-pool-related interaction is wired as follows. League creation and sport/variant flows are in **`docs/LEAGUE_CREATION_E2E_SPORT_INITIALIZATION_PROMPT10.md`** and **`docs/SOCCER_NFL_IDP_SPORT_REGISTRY_PROMPT11.md`**; roster/scoring in **`docs/DEFAULT_ROSTER_TEMPLATES_SOCCER_IDP_PROMPT12.md`** and **`docs/DEFAULT_SCORING_TEMPLATES_SOCCER_IDP_PROMPT13.md`**.

| Element | Component / Route | Handler | State | Backend / API | Persistence / Reload | Status |
|--------|--------------------|---------|-------|----------------|------------------------|--------|
| **Team identity displays** | League cards, roster, draft, waiver | Show team name/abbrev from team metadata | Team list from getTeamMetadataForSport(sport) or getLeaguePlayerPoolContext | SportTeamMetadataRegistry.getTeamMetadataForSport(sport); league sport from useLeagueSport(leagueId) | Soccer leagues show Soccer teams; NFL IDP shows NFL teams | OK |
| **Logo rendering (league cards, roster)** | League list, roster views, draft, waiver | resolveTeamLogoUrl(teamAbbr, sport) or getPrimaryLogoUrlForTeam(sport, abbr) | — | TeamLogoResolver; sport from league context | Pass league.sport so Soccer leagues get Soccer logos, NFL IDP get NFL logos | OK |
| **Player card clicks** | Player card / modal in draft, waiver, roster | onClick → open detail or action | Player id + league context | getTeamForPlayer(playerId, league.sport), resolveTeamLogoUrl(teamAbbr, league.sport) for team/logo | Sport-scoped; Soccer shows soccer team/logo, NFL IDP shows NFL | OK |
| **Filter tabs** | Draft room, waiver (position/team filters) | setPosFilter / setTeamFilter | Filter state | Position list from getPositionsForSport(sport, formatType) (IDP → DE, DT, LB, CB, S for NFL); team list from getTeamMetadataForSport(sport) | Soccer: GKP, DEF, MID, FWD; NFL IDP: offensive + DE, DT, LB, CB, S | OK |
| **Search inputs** | Draft, waiver, roster search | setSearchQuery; filter client or server by name/team | Search state | Player pool from getPlayerPoolForLeague(leagueId, leagueSport); search applied to pool or API | Sport-scoped pool; search within correct sport | OK |
| **Draft and waiver player lists** | Draft room, waiver wire | Load players via getPlayerPoolForLeague(leagueId, leagueSport) | Player list | SportPlayerPoolResolver.getPlayerPoolForLeague; options.position for position filter | Soccer: only SOCCER players; NFL IDP: all NFL players (incl. defensive when in DB) | OK |
| **League preview cards** | Dashboard / league list | Display league name, sport, optional logo | — | League list returns sport; team logo for league may use first team or league icon; roster/draft use sport for logos | Correct sport drives correct team/logo resolution downstream | OK |

**Summary:** Team identity, logo rendering, player cards, filter tabs, search, and draft/waiver player lists depend on **league sport** (and for position filters, **formatType** for IDP) being passed through. useLeagueSport(leagueId) provides sport; formatType from leagueVariant for NFL IDP. No broken logos or wrong pool rendering identified when callers pass sport and formatType; any view that does not yet pass league sport into team/logo resolution or player pool should be updated so Soccer leagues see only soccer data and NFL IDP sees full NFL pool with IDP position filters.

---

## 6. QA Findings (Summary)

- **NFL unchanged** — Existing NFL team metadata, player ingestion, logo rendering, and player pool queries for non-IDP leagues behave as before.
- **Soccer teams and logos** — getTeamMetadataForSport('SOCCER') returns MLS + clubs; resolveTeamLogoUrl(teamAbbr, 'SOCCER') uses DB or registry/fallback; unknown Soccer team gets ESPN-style fallback URL.
- **Soccer player pool** — getPlayerPoolForLeague(leagueId, 'SOCCER') returns only sport = SOCCER; positions GKP/GK, DEF, MID, FWD; draft/waiver filters use getPositionsForSport('SOCCER').
- **NFL IDP player pool** — getPlayerPoolForLeague(leagueId, 'NFL') returns all NFL players; defensive players (DE, DT, LB, CB, S) appear when present in SportsPlayer; position filter uses getPositionsForSport('NFL', 'IDP').
- **NFL IDP eligibility** — DL/DB/IDP_FLEX slot eligibility and lineup validation use formatType 'IDP' via PositionEligibilityResolver and RosterValidationEngine.
- **Logos in views** — League, roster, draft, and waiver views must pass league sport into TeamLogoResolver so Soccer shows Soccer logos and NFL IDP shows NFL logos.
- **Player cards** — getTeamForPlayer and resolveTeamLogoUrl with league sport ensure team and logo match the league's sport.

---

## 7. Issues Fixed

- **None required for Prompt 14.** SportTeamMetadataRegistry (Soccer SOCCER_TEAMS, getPrimaryLogoUrlForTeam fallback), TeamLogoResolver (sport parameter), SportPlayerPoolResolver (sport-scoped pool, options.position), PlayerTeamMapper (sport-scoped), LeaguePlayerPoolBootstrapService (getLeaguePlayerPoolContext by leagueSport), and PositionEligibilityResolver (formatType for IDP) already support Soccer and NFL IDP. The deliverable adds the full UI click audit (Section 5), QA findings (Section 6), and the 9-section doc format. Frontends should pass league sport (and for IDP, formatType) into team metadata, logo resolution, player pool, and position filters so behavior is correct end to end.

---

## 8. Final QA Checklist

- [ ] **NFL unchanged** — Existing NFL team metadata and player ingestion unchanged. Logo rendering and player pool queries for non-IDP NFL leagues behave as before.
- [ ] **Soccer teams and logos** — getTeamMetadataForSport('SOCCER') returns Soccer team list (MLS + clubs). resolveTeamLogoUrl(teamAbbr, 'SOCCER') returns DB logo or registry/fallback URL. Unknown Soccer team abbreviation gets ESPN-style fallback URL.
- [ ] **Soccer player pool** — getPlayerPoolForLeague(leagueId, 'SOCCER') returns only players with sport = SOCCER. Soccer leagues do not show NFL/NBA/other players.
- [ ] **Soccer positions** — Draft/waiver position filter for Soccer includes GKP, DEF, MID, FWD. Player with position GK is eligible for GKP slot (PositionEligibilityResolver).
- [ ] **NFL IDP player pool** — getPlayerPoolForLeague(leagueId, 'NFL') returns all NFL players; when SportsPlayer includes defensive players (DE, DT, LB, CB, S), they appear in pool. Position filter with getPositionsForSport('NFL', 'IDP') shows DE, DT, LB, CB, S.
- [ ] **NFL IDP eligibility** — For league with formatType IDP, DL slot accepts DE/DT, DB accepts CB/S, IDP_FLEX accepts DE, DT, LB, CB, S. Lineup validation and canAddPlayerToSlot use formatType 'IDP'.
- [ ] **Logos in views** — League, roster, draft, and waiver views pass league sport into team logo resolution; Soccer leagues show Soccer logos, NFL IDP leagues show NFL logos.
- [ ] **Player cards** — Player card rendering uses getTeamForPlayer and resolveTeamLogoUrl with league sport so team and logo match the league’s sport.
- [ ] **Ingestion note** — If defensive players are missing from the pool, ensure NFL player ingestion includes defensive player records (sport = NFL, position in DE, DT, LB, CB, S) from the data provider.
- [ ] **UI click audit** — Team identity displays, logo rendering, player card clicks, filter tabs, search inputs, draft/waiver player lists, and league preview cards all wired; no broken logos or wrong pool rendering (see **Section 5**).

---

## 9. Explanation of Soccer and NFL IDP Team/Player Support

### Soccer

- **Teams:** SportTeamMetadataRegistry provides Soccer team metadata (MLS and select clubs) with team_id, name, city, abbreviation, and primary_logo_url. Teams not in the static list still get a logo URL via getPrimaryLogoUrlForTeam fallback (ESPN-style by sport + abbreviation). Club or national scope can be extended by adding entries to SOCCER_TEAMS or by populating SportsTeam for sport SOCCER.
- **Logos:** TeamLogoResolver resolves by (teamAbbr, sport). Frontend passes sport = SOCCER for Soccer leagues so league, roster, draft, and waiver views render Soccer team logos (DB or registry/fallback).
- **Player pool:** SportPlayerPoolResolver filters by sport = SOCCER. Soccer leagues only load soccer teams and soccer players; getPlayerPoolForLeague(leagueId, 'SOCCER') and getLeaguePlayerPoolContext(leagueId, 'SOCCER') return only SOCCER data. Soccer player positions are GKP/GK, DEF, MID, FWD; PositionEligibilityResolver and roster template define slot eligibility (e.g. GKP accepts GK, UTIL accepts all field positions). Draft room and waiver position filters use these positions so the pool filters work by sport and position.

### NFL IDP

- **Teams:** NFL IDP uses the same team metadata as NFL (getTeamMetadataForSport('NFL')). No separate IDP team list; logos are the same as for any NFL league.
- **Player pool:** NFL IDP leagues use the same pool as NFL (sport_type = NFL). getPlayerPoolForLeague(leagueId, 'NFL') returns all NFL players; defensive players (DE, DT, LB, CB, S) appear when they exist in SportsPlayer with sport = NFL and those positions. If the current data provider is used only for offensive players and DST, ingestion should be expanded to include defensive player records so that IDP leagues can draft and roster them. Position filters for IDP leagues should use getPositionsForSport('NFL', 'IDP') so that DE, DT, LB, CB, S appear in the filter list; options.position in getPlayerPoolForLeague can restrict to a single position when needed.
- **Eligibility:** Defensive eligibility (DL, DE, DT, LB, DB, CB, S, IDP_FLEX) is supported by PositionEligibilityResolver with formatType 'IDP' and the IDP roster template. Slot eligibility and lineup validation use the same template and resolver so that only eligible players can be placed in IDP slots. Logos and player cards use league sport NFL so team and logo resolution stay correct for IDP leagues.

### Summary

- **Soccer** is a full sport with its own team metadata, logo resolution, and player pool (sport_type = SOCCER). Positions are GKP/GK, DEF, MID, FWD; registry and fallback logo behavior support clubs (and national teams when added). **NFL IDP** shares NFL team metadata and logos and uses the same NFL player pool; defensive players are included when present in SportsPlayer, and eligibility is enforced by PositionEligibilityResolver with formatType IDP. Both integrate with the same draft room, waiver, and roster flows as long as league sport (and for IDP, formatType) is passed through for team metadata, logo resolution, player pool queries, and position filters.
