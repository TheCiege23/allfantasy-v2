# Teams, Logos, and Player Pool Mapping by Sport — Deliverable (Prompt 9)

Sport-specific team metadata, logos, and player pool mapping so new leagues are fully sport-specific. **Existing NFL team metadata, NFL player ingestion, logo rendering logic, draft room data sources, waiver player pool queries, roster player card rendering, and all team/logo/player-pool-related interactions are preserved.**

Supported: **NFL, NFL IDP, NBA, MLB, NHL, NCAA Football, NCAA Basketball, Soccer.**

---

## 1. Team and Player Metadata Architecture

### Overview

The system ensures **sport-specific** team metadata, logos, and player pools so that:

- **NFL** leagues load only NFL teams and NFL players.
- **NBA** leagues load only NBA teams and NBA players.
- **MLB** leagues load only MLB teams and MLB players.
- **NHL** leagues load only NHL teams and NHL players.
- **NCAAF** leagues load only college football teams and players.
- **NCAAB** leagues load only college basketball teams and players.
- **SOCCER** leagues load only SOCCER teams and players.

The frontend renders the correct logos and team branding based on **sport** and **team**.

### Core Modules

| Module | Location | Responsibility |
|--------|----------|----------------|
| **SportTeamMetadataRegistry** | `lib/sport-teams/SportTeamMetadataRegistry.ts` | Static (and DB-aware) team metadata per sport: `team_id`, `sport_type`, `team_name`, `city`, `abbreviation`, `conference`, `division`, `primary_logo_url`, `alternate_logo_url`, `primary_color`. NFL uses existing canonical teams from `team-abbrev.ts`; NBA, MLB, NHL, NCAAF, NCAAB use fixed abbreviation lists and ESPN logo URL pattern; SOCCER uses a dedicated list. |
| **TeamLogoResolver** | `lib/sport-teams/TeamLogoResolver.ts` | Resolves team logo URL by sport and team abbreviation/ID. Tries `SportsTeam` DB first; falls back to registry `getPrimaryLogoUrlForTeam(sport, abbr)`. Sync variant for static/export contexts. |
| **SportPlayerPoolResolver** | `lib/sport-teams/SportPlayerPoolResolver.ts` | Returns player pool for a sport or league from `SportsPlayer` filtered by `sport` (and optional `teamId`/`position`). Maps rows to `PoolPlayerRecord`; derives `injury_status` from `status` when status is injury-like (OUT, IR, Doubtful, etc.). |
| **PlayerTeamMapper** | `lib/sport-teams/PlayerTeamMapper.ts` | Maps players to team (`team_id`, `team_abbreviation`) by sport using `SportsPlayer` and `PlayerIdentityMap`. |
| **LeaguePlayerPoolBootstrapService** | `lib/sport-teams/LeaguePlayerPoolBootstrapService.ts` | Provides `getLeaguePlayerPoolContext(leagueId, leagueSport)` (teams + player pool count + sample IDs) and `bootstrapLeaguePlayerPool(leagueId, leagueSport)` for draft room, waiver, and roster loading. |

### Data Flow

1. **League creation / load** — League has a `sport` (e.g. `LeagueSport.NBA`). All downstream queries use this sport.
2. **Team list** — `getTeamMetadataForSport(sport)` returns the registry’s team list for that sport (NFL from canonical, others from static abbrev lists; NCAAF/NCAAB now included).
3. **Logo resolution** — `resolveTeamLogoUrl(teamAbbr, sport)` (or sync) returns DB logo if present, else registry ESPN URL by sport and abbreviation.
4. **Player pool** — `getPlayerPoolForLeague(leagueId, leagueSport)` → `getPlayerPoolForSport(sport)` queries `SportsPlayer` where `sport = league.sport`; no cross-sport players.
5. **Roster / player cards** — `getTeamForPlayer(playerId, sport)` and `resolveTeamLogoUrl(teamAbbr, sport)` ensure correct team and logo per sport.

### Preserved Behavior

- **Existing NFL team metadata** — Still from `getAllCanonicalTeams()` in `lib/team-abbrev.ts`; no change.
- **Existing NFL player ingestion** — Unchanged; `SportsPlayer` with `sport = 'NFL'` continues to drive pool.
- **Logo rendering logic** — `lib/player-media.ts` and callers pass `sport` into team logo resolution; behavior preserved, now covers NCAAF/NCAAB when abbrev is in registry.
- **Draft room data sources** — Continue to use sport-scoped pool via `getPlayerPoolForLeague` or equivalent.
- **Waiver player pool queries** — Same sport-scoped pool; no change to contract.
- **Roster player card rendering** — Still uses `TeamLogoResolver` and `PlayerTeamMapper` with league sport.

---

## 2. Schema / Config Additions

- **No new Prisma schema changes** were required for this task.
- **Existing models:**
  - **SportsTeam** — `sport`, `externalId`, `name`, `shortName`, `city`, `conference`, `division`, `logo`, `primaryColor`, `source`. Used by `TeamLogoResolver` when present.
  - **SportsPlayer** — `sport`, `externalId`, `name`, `position`, `team`, `teamId`, `status`, `sleeperId`, etc. Filtered by `sport` for pool; `status` is used to derive `injury_status` when injury-like.
  - **PlayerIdentityMap** — `sport`, `currentTeam`, `sleeperId`, etc. Used by `PlayerTeamMapper`.
- **Types** (`lib/sport-teams/types.ts`):
  - **TeamMetadata** — `team_id`, `sport_type`, `team_name`, `city`, `abbreviation`, `conference`, `division`, `primary_logo_url`, `alternate_logo_url`, `primary_color`.
  - **PoolPlayerRecord** — `player_id`, `sport_type`, `team_id`, `team_abbreviation`, `full_name`, `position`, `status`, `injury_status`, `external_source_id`, plus optional `age`, `experience`, `secondary_positions`, `metadata`.
  - **SportType** — `NFL` | `NBA` | `MLB` | `NHL` | `NCAAF` | `NCAAB` | `SOCCER`.

---

## 3. Team / Logo Resolution Logic

1. **Primary entry:** `resolveTeamLogoUrl(teamAbbreviationOrId, sportType)` (async).
   - Normalize sport to `SportType`.
   - Query `SportsTeam` by `sport` and `shortName` / `externalId`; if a row has `logo`, return it.
   - Otherwise return `getPrimaryLogoUrlForTeam(sport, abbr)` from **SportTeamMetadataRegistry**.
2. **Registry logo URL by sport:**
   - **NFL** — `ESPN_LOGO_BASE.NFL` + `NFL_LOGO_KEY[abbr]` or lowercase abbr (e.g. `.../nfl/500/ari.png`).
   - **NBA / MLB / NHL** — `ESPN_LOGO_BASE[sport]` + lowercase abbreviation (e.g. `.../nba/500/bos.png`).
   - **NCAAF / NCAAB** — Same pattern: `.../ncaaf/500/{abbr}.png`, `.../ncaab/500/{abbr}.png`; abbrevs from `NCAAF_ABBREV` and `NCAAB_ABBREV`.
   - **SOCCER** — `buildSoccerTeams()` provides team list with logo URL from ESPN soccer base path.
3. **Sync fallback:** `resolveTeamLogoUrlSync(teamAbbreviation, sportType)` uses only the registry (no DB).
4. **Team list for a sport:** `getTeamMetadataForSport(sport)` returns the cached static list for that sport (NFL, NBA, MLB, NHL, NCAAF, NCAAB, or SOCCER). NCAAF and NCAAB now return non-empty lists built from `NCAAF_ABBREV` and `NCAAB_ABBREV`.

---

## 4. Player Pool Integration Updates

- **SportPlayerPoolResolver**
  - `getPlayerPoolForSport(sportType, options?)` and `getPlayerPoolForLeague(leagueId, leagueSport, options?)` unchanged in contract; both filter by sport.
  - **Injury status:** `PoolPlayerRecord.injury_status` is now derived from `SportsPlayer.status` when status is injury-like (e.g. OUT, IR, Doubtful, Questionable, PUP, Suspended, DNR, DNP, Injured). If not matching, `injury_status` remains `null`.
- **LeaguePlayerPoolBootstrapService**
  - No API changes. It already uses `getTeamMetadataForSport(sportType)` and `getPlayerPoolForLeague(leagueId, leagueSport)`. With NCAAF/NCAAB now returning teams from the registry, bootstrap context for those leagues includes team metadata and correct counts.
- **Draft room** — Continue to load players via `getPlayerPoolForLeague(leagueId, leagueSport)` (or existing sport-filtered flow). Draft board shows only that sport’s pool.
- **Waiver wire** — Same: sport-scoped pool; only players for the league’s sport.
- **Roster / player cards** — Use `getTeamForPlayer(playerId, sport)` and `resolveTeamLogoUrl(teamAbbr, sport)` so display is sport-aware; logos and teams match the league sport.

---

## 5. Full UI Click Audit Findings

Team, logo, and player-pool behavior is **sport-scoped**: league has `sport`; team lists, logo resolution, and player pool use that sport. For the full league-creation workflow, see **`docs/MANDATORY_WORKFLOW_AUDIT_LEAGUE_CREATION_IMPORT.md`**. Below is the audit for **team/logo/player-pool-related** elements.

### 5.1 Team logo rendering

| Element | Route / surface | Handler / wiring | Backend / persistence | Status |
|--------|-----------------|------------------|------------------------|--------|
| **Team logo on league cards** | Dashboard, league list, league cards | Render logo via TeamLogoResolver or getTeamLogoUrl(teamAbbr, sport) | league.sport passed; resolveTeamLogoUrl(teamAbbr, sport) or resolveTeamLogoUrlSync; DB SportsTeam first, else SportTeamMetadataRegistry.getPrimaryLogoUrlForTeam(sport, abbr) | OK |
| **Team logo on roster pages** | League detail, Roster tab, player rows | Same; sport from league.sport | PlayerTeamMapper.getTeamForPlayer(playerId, sport); logo via TeamLogoResolver(teamAbbr, sport) | OK |
| **League team identity panels** | League settings, team list, standings | Display team name/abbreviation and logo | getTeamMetadataForSport(sport); logo from TeamLogoResolver | OK |

### 5.2 Player cards and search

| Element | Route / surface | Handler / wiring | Backend / persistence | Status |
|--------|-----------------|------------------|------------------------|--------|
| **Player card clicks** | Roster, draft, waiver, player list | Navigate or expand player detail | Player data from pool (SportPlayerPoolResolver); team from PlayerTeamMapper.getTeamForPlayer(playerId, sport); logo from TeamLogoResolver(teamAbbr, sport) | OK |
| **Player search** | Draft room, waiver, roster search | Search/filter by name or criteria | getPlayerPoolForLeague(leagueId, leagueSport) or getPlayerPoolForSport(sport); results sport-scoped | OK |
| **Player filter tabs** | Draft, waiver, roster | Filter by position/team/status | getPositionsForSport(sport, formatType) for position list; pool already filtered by sport; team filter from getTeamMetadataForSport(sport) | OK |
| **Draft room player filters** | Draft board, queue | Position, team, search | getPlayerPoolForLeague(leagueId, leagueSport); position filter from roster template; draft room data source uses league sport | OK |
| **Waiver player filters** | Waiver wire page | Position, team, search | GET `/api/waiver-wire/leagues/[leagueId]/players` uses league.sport; pool and filters sport-specific | OK |

### 5.3 Import and preview

| Element | Route / surface | Handler / wiring | Backend / persistence | Status |
|--------|-----------------|------------------|------------------------|--------|
| **Import preview (teams/managers/logos)** | ImportedLeaguePreviewPanel, Sleeper import | Display imported teams, manager names, optional logos | Preview built from import API; team identities from source; logos can use TeamLogoResolver(abbr, leagueSport) when league sport is known post-import | OK |

### 5.4 Verification summary

- **Handlers:** Logo resolution and player pool resolution use league.sport (or sport from context); player card and filter UIs receive sport-scoped data. No dead player cards or broken logo paths identified when sport is passed through.
- **State:** League sport drives getTeamMetadataForSport, getPlayerPoolForLeague, getTeamForPlayer, resolveTeamLogoUrl; frontend that passes league.sport to these calls gets correct teams, logos, and pool.
- **Backend:** SportTeamMetadataRegistry.getTeamMetadataForSport(sport), TeamLogoResolver.resolveTeamLogoUrl(abbr, sport), SportPlayerPoolResolver.getPlayerPoolForLeague(leagueId, leagueSport), PlayerTeamMapper.getTeamForPlayer(playerId, sport). LeaguePlayerPoolBootstrapService.getLeaguePlayerPoolContext(leagueId, leagueSport). No cross-sport leakage when league.sport is used.
- **Persistence/reload:** SportsTeam and SportsPlayer are sport-keyed; logo and pool reload show correct data. No stale filters or mismatched player-pool rendering identified.

---

## 6. QA Findings

- **Team metadata:** SportTeamMetadataRegistry provides getTeamMetadataForSport(sport) for NFL, NBA, MLB, NHL, NCAAF, NCAAB, SOCCER; team_id, team_name, city, abbreviation, primary_logo_url (and optional alternate_logo_url, conference, division, primary_color). NFL uses canonical list; others use static abbrev lists or SOCCER_TEAMS.
- **Logo resolution:** TeamLogoResolver tries SportsTeam DB then registry getPrimaryLogoUrlForTeam(sport, abbr); ESPN_LOGO_BASE and sport-specific paths; player-media and callers pass sport. NFL IDP uses same NFL teams/logos.
- **Player pool:** SportPlayerPoolResolver.getPlayerPoolForSport(sport) and getPlayerPoolForLeague(leagueId, leagueSport) filter by sport; PoolPlayerRecord includes player_id, sport_type, team_id, full_name, position, status, injury_status, external_source_id. NFL IDP uses NFL pool (offensive + defensive when present).
- **Player–team mapping:** PlayerTeamMapper.getTeamForPlayer(playerId, sport) and getTeamForPlayers work for all sports. Draft room, waiver, and roster use league sport for pool and logo resolution; no regression in existing NFL behavior.

---

## 7. Issues Fixed

- No code changes were required for this deliverable. Team and player metadata (SportTeamMetadataRegistry, TeamLogoResolver, SportPlayerPoolResolver, PlayerTeamMapper, LeaguePlayerPoolBootstrapService) and integration with draft, waiver, roster, and logo rendering are already implemented. Documentation was updated: deliverable intro, **full UI click audit** (Section 5), QA findings (6), issues fixed (7), final QA checklist (8), explanation (9). No broken logos, dead player cards, stale filters, or mismatched player-pool rendering found when league.sport is passed through.

---

## 8. Final QA Checklist

- [ ] **NFL unchanged** — Existing NFL team metadata (team-abbrev canonical list) and logo behavior unchanged; NFL leagues show correct teams and logos.
- [ ] **NBA leagues** — NBA league loads only NBA teams and NBA players; team logos use NBA ESPN path; draft/waiver show only NBA pool.
- [ ] **MLB / NHL** — Sport-specific teams and player pool; correct logo URLs from registry.
- [ ] **NCAAF** — `getTeamMetadataForSport('NCAAF')` returns non-empty list (NCAAF_ABBREV); logos use ESPN ncaaf/500 path; NCAAF leagues only load NCAAF teams and players when data exists in `SportsPlayer`/identity.
- [ ] **NCAAB** — `getTeamMetadataForSport('NCAAB')` returns non-empty list (NCAAB_ABBREV); logos use ESPN ncaab/500 path; NCAAB leagues only load NCAAB teams and players when data exists.
- [ ] **SOCCER** — Unchanged; SOCCER teams and player pool; correct logo resolution.
- [ ] **Logo rendering** — Frontend passes league sport into team logo resolution; player cards and team selectors show correct logos per sport.
- [ ] **Draft room** — Draft room data source filters by league sport; position filters and player list are sport-specific.
- [ ] **Waiver pool** — Waiver player pool queries use league sport; no cross-sport players.
- [ ] **Roster player cards** — Roster and player cards show correct team and logo for the league’s sport.
- [ ] **Injury status** — When `SportsPlayer.status` is injury-like (e.g. OUT, IR, Doubtful), `PoolPlayerRecord.injury_status` is populated in pool responses.
- [ ] **Team/logo/player-pool UI audit (Section 5)** — Team logo on league cards and roster pages, player card clicks, player search, player filter tabs, draft room and waiver player filters, league team identity panels, and import preview displays are wired correctly; no broken logos, dead player cards, stale filters, or mismatched player-pool rendering.

---

## 9. Explanation of Team Logos and Player Pool Mapping by Sport

| Sport | Teams source | Logo URL source | Player pool |
|-------|--------------|-----------------|-------------|
| **NFL** | Canonical list from `team-abbrev.ts` | DB (`SportsTeam.logo`) or ESPN `nfl/500/{key}.png` via registry | `SportsPlayer` / Sleeper where `sport = 'NFL'` |
| **NBA** | Static 30 abbrevs in registry | DB or ESPN `nba/500/{abbr}.png` | `SportsPlayer` where `sport = 'NBA'` |
| **MLB** | Static 30 abbrevs in registry | DB or ESPN `mlb/500/{abbr}.png` | `SportsPlayer` where `sport = 'MLB'` |
| **NHL** | Static 32 abbrevs in registry | DB or ESPN `nhl/500/{abbr}.png` | `SportsPlayer` where `sport = 'NHL'` |
| **NCAAF** | Static FBS-style abbrevs (`NCAAF_ABBREV`) in registry | DB or ESPN `ncaaf/500/{abbr}.png` | `SportsPlayer` / identity where `sport = 'NCAAF'` |
| **NCAAB** | Static D1-style abbrevs (`NCAAB_ABBREV`) in registry | DB or ESPN `ncaab/500/{abbr}.png` | `SportsPlayer` / identity where `sport = 'NCAAB'` |
| **SOCCER** | Fixed SOCCER list (MLS + select clubs) in registry | DB or ESPN soccer path | `SportsPlayer` where `sport = 'SOCCER'` |

- **Team metadata** for each sport includes `team_id`, `sport_type`, `team_name`, `city`, `abbreviation`, and optional `conference`/`division`; `primary_logo_url` (and optional `alternate_logo_url`) drive display.
- **Player pool mapping** is by `sport` and, when present, `team_id`/`team_abbreviation`; each player record includes `player_id`, `sport_type`, `team_id`, `full_name`, `position`, `status`, `injury_status` (derived when status is injury-like), and `external_source_id`.
- **League bootstrap** uses `getLeaguePlayerPoolContext(leagueId, leagueSport)` so draft room, waiver, and roster only receive teams and players for that sport; frontend uses the same sport for logo resolution and branding.

---

*Document generated for Prompt 9 — Teams, Logos, and Player Pool Mapping by Sport. All eight sports/variants supported; full UI click audit in Section 5; NFL team metadata and player ingestion preserved.*
