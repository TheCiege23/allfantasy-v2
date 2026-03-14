# QA Checklist: Teams, Logos, and Player Pool — Soccer & NFL IDP

## Soccer team metadata and logos

- [ ] **getTeamMetadataForSport('SOCCER'):** Returns list of Soccer teams (e.g. MLS clubs: ATL, LAFC, SEA, NYC, etc.) with team_id, team_name, city, abbreviation, primary_logo_url.
- [ ] **getTeamByAbbreviation('SOCCER', abbr):** Returns single team by abbreviation (e.g. SEA → Seattle Sounders).
- [ ] **getPrimaryLogoUrlForTeam('SOCCER', abbr):** Returns logo URL (e.g. ESPN soccer base + abbreviation). Used when DB SportsTeam has no logo.
- [ ] **resolveTeamLogoUrl(teamAbbr, 'SOCCER') / resolveTeamLogoUrlSync:** TeamLogoResolver accepts SOCCER; resolves logo from DB or registry. Logos render in league, roster, draft, waiver views when sport is SOCCER.
- [ ] **ESPN_LOGO_BASE:** SOCCER entry present in SportTeamMetadataRegistry; logo path consistent with provider (e.g. ESPN soccer/500/{abbr}.png).

## Soccer player pool

- [ ] **getPlayerPoolForSport('SOCCER') / getPlayerPoolForLeague(leagueId, SOCCER):** Returns players from SportsPlayer where sport = 'SOCCER'. No offensive-only filter; positions GKP/GK, DEF, MID, FWD.
- [ ] **bootstrapLeaguePlayerPool(leagueId, SOCCER):** getLeaguePlayerPoolContext returns SOCCER teams and SOCCER player pool; teamCount and playerCount correct.
- [ ] **Draft room / waiver:** When league sport is SOCCER, player pool and position filters use SOCCER; only soccer players and teams shown.
- [ ] **PlayerTeamMapper:** getTeamForPlayer(playerId, 'SOCCER') and getTeamForPlayers(ids, 'SOCCER') work when SportsPlayer or PlayerIdentityMap has sport SOCCER.
- [ ] **Position mapping:** Soccer positions GK/GKP, DEF, MID, FWD align with SportRegistry SOCCER_POSITIONS and roster template; PositionEligibilityResolver accepts formatType for Soccer (standard).

## NFL IDP player pool and eligibility

- [ ] **getPlayerPoolForLeague(leagueId, NFL):** Returns all NFL players (no position filter by default). When options.position is DE, DT, LB, CB, S, only those positions returned.
- [ ] **IDP leagues:** Same pool as NFL; defensive players (DE, DT, LB, CB, S) included when they exist in SportsPlayer with sport 'NFL' and position set. Ingestion must write defensive players to SportsPlayer.
- [ ] **Draft room / waiver:** For NFL IDP league, position filter can pass DE, DT, LB, CB, S; getPositionsForSport('NFL', 'IDP') returns offensive + IDP positions for filter list.
- [ ] **PositionEligibilityResolver:** Slot eligibility for IDP slots (DL, DB, IDP_FLEX, DE, etc.) uses formatType 'IDP'; getPositionsForSport('NFL', 'IDP') includes DE, DT, LB, CB, S.
- [ ] **PlayerTeamMapper:** getTeamForPlayer(playerId, 'NFL') works for defensive players; no change needed (sport-agnostic).

## Logo and player query integration

- [ ] **League view:** League with sport SOCCER shows soccer teams/logos when team list comes from getTeamMetadataForSport(SOCCER). League with NFL shows NFL teams (unchanged).
- [ ] **Roster / player cards:** resolveTeamLogoUrl(teamAbbr, sport) or resolveTeamLogoUrlSync used for player team logo; SOCCER and NFL both resolve.
- [ ] **Draft room:** Player pool query uses getPlayerPoolForLeague(leagueId, leagueSport); position filter uses options.position when provided. Soccer leagues get SOCCER pool; NFL IDP leagues get NFL pool (include defensive when present in DB).
- [ ] **Waiver wire:** Same as draft room; pool and filters by sport and optional position.

## Backward compatibility

- [ ] **NFL team metadata:** getTeamMetadataForSport('NFL') unchanged; still uses getAllCanonicalTeams() and NFL_LOGO_KEY.
- [ ] **NFL player ingestion:** Existing ingestion paths unchanged; extend to include defensive players (DE, DT, LB, CB, S) where provider supports.
- [ ] **Other sports:** NBA, MLB, NHL team metadata and player pool unchanged.
- [ ] **SPORT_STR:** SOCCER added; all LeagueSport enum values present so getPlayerPoolForLeague works for every sport.

## Modules touched

- [ ] **SportTeamMetadataRegistry:** SOCCER in ESPN_LOGO_BASE and toSportType; SOCCER_TEAMS list; buildSoccerTeams(); getTeamMetadataForSport('SOCCER') returns list.
- [ ] **TeamLogoResolver:** toSportType includes SOCCER so resolveTeamLogoUrl and resolveTeamLogoUrlSync work for Soccer.
- [ ] **SportPlayerPoolResolver:** SPORT_STR includes SOCCER: 'SOCCER'; getPlayerPoolForLeague(leagueId, SOCCER) uses getPlayerPoolForSport('SOCCER'). JSDoc notes Soccer positions and NFL IDP pool behavior.
- [ ] **LeaguePlayerPoolBootstrapService:** JSDoc notes Soccer and NFL IDP support; no logic change (already sport-scoped).
- [ ] **PlayerTeamMapper:** No code change; works for any sport string including SOCCER.
- [ ] **PositionEligibilityResolver:** Already supports formatType for IDP (from Prompt 8); getPositionsForSport('NFL', 'IDP') for filter list.
