# Waiver Wire Engine – Current State Audit

## 1. Existing Waiver / Roster / Settings

### 1.1 League (prisma: `leagues`)
- **League**: `id`, `userId`, `platform`, `platformLeagueId`, `name`, `sport` (enum: NFL, NBA, MLB), `season`, `leagueSize`, `scoring`, `isDynasty`, `rosterSize`, `starters` (Json), `status`, `settings` (Json), `lastSyncedAt`, etc.
- **Roster relation**: `rosters` (Roster[]).
- **Teams relation**: `teams` (LeagueTeam[]).
- **Waiver relation**: `waiverPickups` (WaiverPickup[]).
- **Gap**: No structured waiver type, processing time, FAAB budget, or claim limits. `settings` is generic Json.

### 1.2 Roster (prisma: `rosters`)
- **Roster**: `id`, `leagueId`, `platformUserId`, `playerData` (Json), `faabRemaining` (Int?), unique `(leagueId, platformUserId)`.
- **Gap**: No `waiverPriority` for rolling/reverse standings. No explicit link to LeagueTeam (LeagueTeam has optional `legacyRosterId` to LegacyRoster only).

### 1.3 LeagueTeam (prisma: `league_teams`)
- **LeagueTeam**: `leagueId`, `externalId`, `ownerName`, `teamName`, `wins`, `losses`, `currentRank`, etc. Optional `legacyRosterId` → LegacyRoster.
- Used for standings; not used as primary roster identity in app League flow. Roster is identified by `(leagueId, platformUserId)`.

### 1.4 WaiverPickup (prisma: `waiver_pickups`)
- **WaiverPickup**: `userId`, `leagueId`, `playerName`, `outcome`, `week`, `year`. Simple log only.
- **Gap**: No claim lifecycle (pending/processed), no add/drop pair, no FAAB bid, no priority rank, no tiebreak, no transaction history record.

### 1.5 Legacy / Sleeper
- **LegacyRoster**: `players` (Json), league-scoped; linked to LeagueTeam via `leagueTeam` (LegacyRoster.leagueTeam).
- **SleeperRoster**: `faabRemaining`, `waiverPriority`; `players`, `starters`, `bench` (Json). Per-league, `rosterId` + `ownerId`.
- **YahooTeam**: `waiverPriority`, `faabBalance`.
- Legacy and Sleeper have their own waiver/FAAB fields; the generic League/Roster model does not yet support a full claim engine.

### 1.6 Player / Sport
- **SportsPlayer**: `id`, `sport`, `externalId`, `name`, `position`, `team`, etc. Multi-sport.
- **PlayerIdentityMap**: cross-source identity; `sport` default "NFL".
- **League.sport**: enum NFL | NBA | MLB — no football-only assumption at league level.

### 1.7 Existing Waiver Logic (lib)
- **lib/waiver-engine**: Types (`WaiverSuggestion`, `WaiverPlayerRef`), scoring (`scoreWaiverCandidates`), team needs, Grok AI layer. Used for **suggestions only**, not claim submission or processing.
- **app/api/waiver-ai**, **app/api/legacy/waiver/analyze**: Analysis endpoints; no claim CRUD or processing.
- **useLeagueSectionData(leagueId, 'waivers')**: Proxies to `/api/waiver-ai`; no claim or settings API.

## 2. Preserved / Reused

- **League**, **Roster**, **LeagueTeam**: Keep as primary app-league and roster models. Add `waiverPriority` on Roster; keep `faabRemaining`.
- **League.settings**: Keep; add optional structured waiver config or use new `LeagueWaiverSettings` for clarity.
- **League.sport**, **SportsPlayer.sport**: Use for multi-sport; no sport-specific logic in engine.
- **WaiverPickup**: Keep for simple logs; new **WaiverClaim** + **WaiverTransaction** for full lifecycle and history.
- **lib/waiver-engine** (suggestions, scoring): Keep; frontend can use for “suggested adds” alongside new claim UI.

## 3. Summary

| Area            | Current state                     | Change                                      |
|-----------------|-----------------------------------|---------------------------------------------|
| League settings | Generic `settings` Json           | Add `LeagueWaiverSettings` (or structured)  |
| Roster          | `faabRemaining` only              | Add `waiverPriority`                        |
| Claims          | None                              | Add `WaiverClaim` (pending/processed)       |
| History         | `WaiverPickup` (simple log)       | Add `WaiverTransaction` per processed claim |
| Processing      | None                              | New claim processing engine                |
| API             | Waiver AI only                    | Add settings, claims, process, history      |
