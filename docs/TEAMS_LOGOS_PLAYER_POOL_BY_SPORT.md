# Teams, Logos, and Player Pool Mapping by Sport

## Architecture

- **SportTeamMetadataRegistry** (`lib/sport-teams/SportTeamMetadataRegistry.ts`) — Static team metadata per sport: `team_id`, `sport_type`, `team_name`, `city`, `abbreviation`, `conference`, `division`, `primary_logo_url`, `alternate_logo_url`, `primary_color`. NFL uses existing canonical teams from `team-abbrev.ts`; NBA, MLB, NHL use fixed abbreviation lists and ESPN logo URL pattern. NCAAF/NCAAB return empty list (can be extended from DB or external source).
- **TeamLogoResolver** (`lib/sport-teams/TeamLogoResolver.ts`) — `resolveTeamLogoUrl(teamAbbr, sport)` (async) checks `SportsTeam` DB first, then falls back to registry; `resolveTeamLogoUrlSync(teamAbbr, sport)` for sync contexts. Frontend and player cards use this so logos are sport-correct.
- **SportPlayerPoolResolver** (`lib/sport-teams/SportPlayerPoolResolver.ts`) — `getPlayerPoolForSport(sport, options?)` and `getPlayerPoolForLeague(leagueId, leagueSport, options?)` return players from `SportsPlayer` filtered by sport (and optional team/position). `isPlayerInSportPool(playerId, sport)` checks membership.
- **PlayerTeamMapper** (`lib/sport-teams/PlayerTeamMapper.ts`) — `getTeamForPlayer(playerId, sport)` and `getTeamForPlayers(playerIds, sport)` return `team_id` and `team_abbreviation` from `SportsPlayer` or `PlayerIdentityMap`. `mapPlayerToTeamFromRecord(player)` for in-memory records.
- **LeaguePlayerPoolBootstrapService** (`lib/sport-teams/LeaguePlayerPoolBootstrapService.ts`) — `getLeaguePlayerPoolContext(leagueId, leagueSport)` returns teams + player pool count and sample IDs; `bootstrapLeaguePlayerPool(leagueId, leagueSport)` returns counts. Use when loading draft room or waiver to ensure sport-scoped data.

**Logo rendering:** `lib/player-media.ts` now passes `sport` into team logo resolution; `getTeamLogoUrl(teamAbbr, sport)` and `sleeperTeamLogoUrl(teamAbbr, sport)` use `TeamLogoResolver` for non-NFL sports so NBA/MLB/NHL leagues get correct logos.

## Schema / config

- **Existing:** `SportsTeam` (sport, externalId, name, shortName, city, conference, division, logo, primaryColor, source), `SportsPlayer` (sport, externalId, name, position, team, teamId, status, sleeperId, …), `PlayerIdentityMap` (sport, currentTeam, sleeperId, …). No schema changes required.
- **Types:** `lib/sport-teams/types.ts` — `TeamMetadata`, `PoolPlayerRecord`, `SportType`. Team metadata includes `primary_logo_url` / `alternate_logo_url`; player record includes `player_id`, `sport_type`, `team_id`, `team_abbreviation`, `full_name`, `position`, `status`, `injury_status`, `external_source_id`.

## Team / logo resolution logic

1. **Logo URL:** Call `resolveTeamLogoUrl(teamAbbr, sport)` (or sync variant). Resolver queries `SportsTeam` by sport and shortName/externalId; if `logo` is set, return it; else return `getPrimaryLogoUrlForTeam(sport, teamAbbr)` from registry (ESPN CDN path by sport).
2. **Team list for a sport:** `getTeamMetadataForSport(sport)` returns static list; for DB-backed list, query `SportsTeam` where `sport = X` and map to `TeamMetadata` (logo from `SportsTeam.logo` or registry).
3. **Frontend:** Use `attachTeamMedia(teamAbbr, sport)` or `sleeperTeamLogoUrl(teamAbbr, sport)` with the league’s sport so NFL/NBA/MLB/NHL render the correct branding.

## Player pool integration

- **Draft room:** Load players via `getPlayerPoolForLeague(leagueId, leagueSport)` or existing Sleeper/API flow filtered by league sport. Ensure draft board only shows players in that sport’s pool; use `isPlayerInSportPool(playerId, sport)` if validating.
- **Waiver wire:** Use the same sport-scoped pool: `getPlayerPoolForLeague(leagueId, leagueSport)` so only NFL players appear for NFL leagues, etc.
- **Roster / player cards:** Resolve team with `getTeamForPlayer(playerId, leagueSport)` and logo with `resolveTeamLogoUrl(teamAbbr, sport)` so display is sport-aware.
- **League bootstrap:** On league load (or first open of draft/waiver), call `getLeaguePlayerPoolContext(leagueId, leagueSport)` to get teams and player count for the UI.

## QA checklist

- [ ] **NFL unchanged** — Existing NFL team metadata and logo behavior (team-abbrev, media-url, player-media) unchanged; NFL leagues still show correct teams and logos.
- [ ] **NBA leagues** — NBA league loads only NBA teams and NBA players; team logos use NBA ESPN path; draft/waiver show only NBA pool.
- [ ] **MLB / NHL** — Same: sport-specific teams and player pool; correct logo URLs.
- [ ] **NCAAF / NCAAB** — Leagues filter by sport; team list may be empty until populated (DB or external); player pool still sport-scoped from `SportsPlayer`/identity.
- [ ] **Logo rendering** — Frontend passes league sport into team logo resolution; player cards and team selectors show correct logos per sport.
- [ ] **Draft room** — Draft room data source filters by league sport; position filters and player list are sport-specific.
- [ ] **Waiver pool** — Waiver player pool queries use league sport; no cross-sport players.
- [ ] **Roster player cards** — Roster and player cards show correct team and logo for the league’s sport.

## Team logos and player pool by sport

- **NFL:** 32 teams from canonical list; logos via ESPN `/nfl/500/{key}.png` or Sleeper CDN; player pool from `SportsPlayer`/Sleeper where sport = NFL.
- **NBA:** 30 teams (static abbrevs); logos via ESPN `/nba/500/{key}.png`; player pool from `SportsPlayer` where sport = NBA.
- **MLB:** 30 teams (static abbrevs); logos via ESPN `/mlb/500/{key}.png`; player pool from `SportsPlayer` where sport = MLB.
- **NHL:** 32 teams (static abbrevs); logos via ESPN `/nhl/500/{key}.png`; player pool from `SportsPlayer` where sport = NHL.
- **NCAAF / NCAAB:** Team list from registry is empty (extend with DB or external list); logos use ESPN `/ncaaf/500` or `/ncaab/500` if team abbrev is known; player pool from `SportsPlayer`/identity where sport = NCAAF or NCAAB.
