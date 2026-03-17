# PROMPT 187 — Sports API Normalization for All Draft Types (Deliverable)

## Overview

AllFantasy draft ecosystem now consumes **normalized** sports data for player images, stats, team logos, abbreviations, metadata, bye weeks, position eligibility, team affiliation, injury status (when available), and college/pro pipeline markers for devy/C2C. All draft-related player cards use a single internal model layer and consistent fallbacks.

---

## Normalization Notes

### Providers and Raw → Internal Mapping

| Provider / Source | Raw Fields | Normalized To |
|-------------------|------------|---------------|
| **Sleeper / Live ADP** | `player_name`, `pos`, `team`, `sleeper_id`, `adp`, `bye` | `displayName`, `metadata.position`, `teamAbbreviation`, `playerId`, `stats.adp`, `metadata.byeWeek` |
| **SportPlayerPoolResolver** (non-NFL) | `name`, `position`, `team`, `id`, etc. | Same `PlayerDisplayModel` / `NormalizedDraftEntry` |
| **Generic** | `full_name`, `pos`, `teamAbbr`, `id`, `byeWeek`, `status`, `college` | All mapped via `RawDraftPlayerLike` in `normalize-draft-player.ts` |

### Field Normalization Rules

- **Name:** `name` \|\| `playerName` \|\| `full_name` → `displayName` / `name`
- **Position:** `position` \|\| `pos` → `metadata.position`
- **Team:** `team` \|\| `teamAbbr` → `metadata.teamAbbreviation`, `team` (string), and `TeamDisplayModel`
- **Player ID:** `playerId` \|\| `sleeperId` \|\| `id` → `playerId`; fallback synthetic: `name:${name}:${position}:${team}`
- **ADP:** `adp` → `stats.primaryStatLabel/Value`, `stats.adp`, `adp`
- **Bye:** `bye` \|\| `byeWeek` → `metadata.byeWeek`, `stats.secondaryStatLabel/Value`, `byeWeek`
- **Injury:** `injuryStatus` \|\| `status` → `metadata.injuryStatus`
- **Devy/C2C:** `collegeOrPipeline` \|\| `college` → `metadata.collegeOrPipeline`

### Sport-Specific Handling

- **Sport:** Always normalized via `normalizeToSupportedSport(sport)` from `lib/sport-scope.ts`. Supported: NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER.
- **NFL:** Draft pool uses `getLiveADP('redraft', limit)`; headshots use Sleeper CDN template.
- **Other sports:** Draft pool uses `SportPlayerPoolResolver.getPlayerPoolForLeague(leagueId)` then normalized; headshots/team logos use `buildPlayerMedia` + `SportTeamMetadataRegistry` where applicable.
- **Bye weeks:** Relevant for NFL (and NCAAF where applicable); other sports may have `null` bye.

---

## Cache Strategy

| Layer | What | TTL / Strategy |
|-------|------|----------------|
| **Player assets (headshot + team logo)** | In-memory map in `player-asset-resolver.ts` | 6 hours TTL per key `assets:${sport}:${playerId}:${teamAbbr}` |
| **Draft pool API** | No server-side cache; each GET fetches live | ADP from `getLiveADP` (NFL) or `getPlayerPoolForLeague` (others), then normalize on demand |
| **Team logos** | From `SportTeamMetadataRegistry.getPrimaryLogoUrlForTeam(sport, abbr)` | Registry is static/config-driven; no TTL |
| **Hot path** | Asset resolution in `normalizeDraftPlayer` | Sync only; no DB in asset resolver (template + registry only) |

- **Cache invalidation:** `clearAssetCache()` exported for tests or admin; normal flow relies on TTL.
- **Fallbacks:** Missing headshot → UI shows initials; missing team logo → UI shows team abbreviation. No broken image URLs left in model.

---

## QA Checklist

### Loading / Missing / Error States (Mandatory Click Audit)

- [ ] **Loading:** Draft room player list shows skeleton (avatar + text lines) when `loading === true` on cards.
- [ ] **Missing asset fallback:** Player image missing or fails load → initials or placeholder; team logo missing/fail → team abbreviation; no broken image areas.
- [ ] **Error state:** When `error` is set on the card, amber message is shown; no dead refresh buttons (refresh triggers `fetchDraftPool` / `handleResync` and works).

### Draft Types (Consistent Player Cards)

- [ ] **Live draft:** Player pool uses normalized `draftPool.entries`; `DraftPlayerCard` receives `display` and shows image, logo, position, team, ADP, bye, injury when present.
- [ ] **Mock draft:** Same `DraftPlayerCard` and normalized pool when wired to same pool API (or shared component).
- [ ] **Auction draft:** Same normalized models and card; drafted/available state and key stats from normalized data.
- [ ] **Slow draft:** Same as live/mock; player cards render consistently.
- [ ] **Keeper draft:** Same models; keeper-specific fields (if any) do not override normalized display/metadata.
- [ ] **Devy draft:** `metadata.collegeOrPipeline` (and eligibility note) shown when available; same asset/stat normalization.
- [ ] **C2C draft:** Same as devy for college/pipeline; consistent assets and stats.

### Sport Coverage

- [ ] **NFL:** ADP, bye week, Sleeper headshot, team logo; no one-sport-only assumptions in shared components.
- [ ] **NBA, NHL, MLB, NCAAB, NCAAF, Soccer:** Pool and normalization run for league sport; team logos and abbreviations from registry; no forced NFL defaults in UI.

### Data Integrity

- [ ] Player cards never show raw provider-specific shapes; all data comes from `PlayerDisplayModel` / `NormalizedDraftEntry`.
- [ ] Position, team abbreviation, and bye week (where applicable) are present and correct.
- [ ] Injury and college/pipeline markers appear when architecture supports them and data is present.

---

## File Manifest (Reference)

| Path | Label |
|------|--------|
| `lib/draft-sports-models/types.ts` | [NEW] |
| `lib/draft-sports-models/player-asset-resolver.ts` | [NEW] |
| `lib/draft-sports-models/normalize-draft-player.ts` | [NEW] |
| `lib/draft-sports-models/index.ts` | [NEW] |
| `app/api/leagues/[leagueId]/draft/pool/route.ts` | [NEW] |
| `components/app/draft-room/DraftPlayerCard.tsx` | [NEW] |
| `components/app/draft-room/PlayerPanel.tsx` | [UPDATED] |
| `components/app/draft-room/DraftRoomPageClient.tsx` | [UPDATED] |
| `components/app/draft-room/index.ts` | [UPDATED] (DraftPlayerCard export) |

---

## Required Internal Models (Implemented)

- **PlayerDisplayModel** — Full normalized player (playerId, displayName, sport, assets, team, stats, metadata).
- **TeamDisplayModel** — teamId, abbreviation, displayName, sport, logoUrl, logoFallbackUsed.
- **PlayerDraftMetadataModel** — position, secondaryPositions, teamAbbreviation, byeWeek, injuryStatus, collegeOrPipeline, eligibilityNote, sport.
- **PlayerStatSnapshotModel** — primaryStatLabel/Value, secondaryStatLabel/Value, adp, byeWeek.
- **PlayerAssetModel** — headshotUrl, teamLogoUrl, headshotFallbackUsed, teamLogoFallbackUsed.

All are sport-aware and support the seven supported sports (NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER).
