# Teams, Logos, and Player Pool: Soccer and NFL IDP

## Overview

The platform loads **Soccer** teams, logos, and player pool by `sport_type = SOCCER`, and treats **NFL IDP** as part of the same NFL player ecosystem with defensive eligibility (DE, DT, LB, CB, S). Team metadata and logo resolution are sport-scoped; player pool is sport-scoped with optional position filter. Draft room and waiver wire use the same resolvers so Soccer leagues only see soccer data and NFL IDP leagues see full NFL pool with defensive players when present in the DB.

## Team and player metadata architecture

- **SportTeamMetadataRegistry** — Static fallback team list and logo URLs per sport. `getTeamMetadataForSport(sportType)` returns teams (team_id, team_name, city, abbreviation, primary_logo_url). For SOCCER, returns a configurable list (e.g. MLS clubs); for NFL, uses existing canonical teams. `getTeamByAbbreviation(sport, abbr)` and `getPrimaryLogoUrlForTeam(sport, abbr)` for single-team lookup and logo.
- **TeamLogoResolver** — `resolveTeamLogoUrl(teamAbbr, sportType)` and `resolveTeamLogoUrlSync`: try DB (SportsTeam) first, then SportTeamMetadataRegistry. Sport type must include SOCCER so Soccer leagues resolve logos.
- **SportPlayerPoolResolver** — `getPlayerPoolForSport(sportType, options?)` queries SportsPlayer by sport; optional filter by teamId and position. `getPlayerPoolForLeague(leagueId, leagueSport, options?)` uses league’s sport (SOCCER or NFL, etc.). For NFL IDP, same pool as NFL; use `options.position` to filter by DE, DT, LB, CB, S when needed.
- **PlayerTeamMapper** — `getTeamForPlayer(playerId, sportType)` and `getTeamForPlayers(ids, sportType)`: sport-agnostic; work for SOCCER and NFL (including defensive players).
- **LeaguePlayerPoolBootstrapService** — `getLeaguePlayerPoolContext(leagueId, leagueSport)` and `bootstrapLeaguePlayerPool(leagueId, leagueSport)`: return teams via `getTeamMetadataForSport(sportType)` and pool via `getPlayerPoolForLeague(leagueId, leagueSport)`. Soccer leagues get SOCCER teams and pool; NFL IDP gets NFL teams and full NFL pool.
- **PositionEligibilityResolver** — Already supports `formatType` (Prompt 8). For NFL IDP, `getPositionsForSport('NFL', 'IDP')` returns offensive + DE, DT, LB, CB, S for draft/waiver position filters and slot eligibility.

## Soccer metadata and player pool mapping

- **Teams:** SOCCER_TEAMS in SportTeamMetadataRegistry (e.g. MLS: ATL, LAFC, LAG, SEA, NYC, PHI, DAL, HOU, SKC, RSL, MIN, ATX, CHI, CLB, DC, MIA, MTL, NE, NSH, ORL, POR, SJ, STL, VAN). Each has abbreviation, name, city; `buildSoccerTeams()` builds TeamMetadata with primary_logo_url from ESPN soccer base + abbreviation.
- **Logos:** ESPN_LOGO_BASE['SOCCER'] and logo path by abbreviation; TeamLogoResolver.toSportType includes SOCCER so async/sync logo resolution works for Soccer.
- **Player pool:** `getPlayerPoolForSport('SOCCER')` / `getPlayerPoolForLeague(leagueId, SOCCER)` query SportsPlayer where sport = 'SOCCER'. Positions: GKP, GK, DEF, MID, FWD (align with SportRegistry and roster template).
- **Scope:** Club or national team scope is determined by the team list and ingestion; registry can be extended with more leagues or national teams without changing resolver interfaces.

## NFL IDP defensive player mapping

- **Pool:** No separate “IDP pool”; NFL IDP leagues use the same NFL player pool. `getPlayerPoolForLeague(leagueId, NFL)` returns all NFL players. Defensive players (DE, DT, LB, CB, S) must be present in SportsPlayer with sport = 'NFL' and position set (from ingestion).
- **Eligibility:** PositionEligibilityResolver with `formatType 'IDP'` and roster template (IDP slots) determine which players can fill DE, DT, LB, CB, S, DL, DB, IDP_FLEX. Draft room and waiver can filter by `options.position` (e.g. DE, DT, LB, CB, S) using positions from `getPositionsForSport('NFL', 'IDP')`.
- **Ingestion:** If current ingestion only writes offensive players and DST, extend it to write defensive player records (position DE, DT, LB, CB, S) from the provider so they appear in the pool and can be drafted/claimed in IDP leagues.
- **Logos:** No change; NFL teams and logos already shared by standard and IDP leagues.

## Logo and player query integration

- **Rendering:** League, roster, draft, and waiver views that show team logos call TeamLogoResolver (or getPrimaryLogoUrlForTeam) with (teamAbbr, sport). SOCCER and NFL both resolve.
- **Draft room:** Load pool via `getPlayerPoolForLeague(leagueId, league.sport)`; position filter from roster template or `getPositionsForSport(sport, formatType)`. Soccer: positions GKP, DEF, MID, FWD; NFL IDP: include DE, DT, LB, CB, S in filter options.
- **Waiver:** Same as draft: pool by league sport; optional position filter; logos via resolver.
- **Player cards:** PlayerTeamMapper and TeamLogoResolver used with player’s team and league sport so Soccer and NFL (including IDP) players show correct team logo.

## Summary

| Area | Soccer | NFL IDP |
|------|--------|---------|
| **Teams** | getTeamMetadataForSport('SOCCER') → MLS (or configured) list | Existing NFL teams (unchanged) |
| **Logos** | resolveTeamLogoUrl(abbr, 'SOCCER'); SOCCER in toSportType | Existing NFL logo resolution |
| **Player pool** | getPlayerPoolForLeague(leagueId, SOCCER) → sport = SOCCER | getPlayerPoolForLeague(leagueId, NFL) → all NFL; include defensive when in DB |
| **Positions** | GKP/GK, DEF, MID, FWD | Offense + DE, DT, LB, CB, S; eligibility via formatType IDP |
| **Bootstrap** | bootstrapLeaguePlayerPool(leagueId, SOCCER) → SOCCER teams + pool | Same as NFL; pool includes IDP when ingestion adds them |

Existing NFL team metadata, NFL player ingestion paths, logo rendering, player cards, and draft/waiver queries are preserved; Soccer and NFL IDP are additive.
