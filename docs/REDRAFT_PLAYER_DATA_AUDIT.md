# REDRAFT Player Data Audit

## Goal
Create a non-destructive audit path for redraft player pool quality so we can identify duplicate identities, missing/broken images, malformed names, missing stats/status/team/position fields, and rookie flag gaps before any cleanup job modifies data.

## Data Source Map

### Draft room request path
1. API route: `/api/leagues/[leagueId]/draft/pool`
2. Resolver: `lib/draft-room/getResolvedDraftPoolForLeague.ts`
3. Sport-scoped pool resolver: `lib/sport-teams/SportPlayerPoolResolver.ts`
4. Normalization layer: `lib/draft-asset-pipeline` (`normalizePlayerList`)
5. UI mapping layer:
   - `components/app/draft-room/DraftRoomPageClient.tsx`
   - `components/app/draft-room/PlayerPanel.tsx`
   - `components/app/draft-room/DraftPlayerCard.tsx`
   - `components/app/draft-room/DraftBoardCell.tsx`

### Primary DB models involved
- `SportsPlayer`
- `PlayerIdentityMap`
- `DraftPoolCache`
- `PlayerSeasonStats`
- `PlayerAnalyticsSnapshot`
- `AllFantasyAdpSnapshot`
- `DevyPlayer`
- `DraftSession` (for `draftId -> leagueId` resolution)

## Audit Endpoint

### Route
`GET /api/admin/player-pool-audit`

### Query params
- `sport` (default: `NFL`)
- `season` (default: `2025`)
- `leagueId` (optional)
- `draftId` (optional; resolves `leagueId` from `DraftSession`)
- `limit` (optional; default `300`, max `2000`)

### Access behavior
- If `leagueId`/`draftId` is provided: user must have draft access to that league or be admin.
- If `leagueId`/`draftId` is not provided: admin-only (global audit scope).

## Example Command

```bash
curl "http://localhost:3010/api/admin/player-pool-audit?leagueId=<league-id>&sport=NFL&season=2025&limit=300"
```

## Response Highlights
The endpoint returns:
- `totalPlayers`
- `duplicateCanonicalGroups`
- `duplicateProviderGroups`
- `duplicateNameTeamPositionGroups`
- `duplicateNameBirthdateGroups`
- `duplicateNameSportNoTeamGroups`
- `missingImageCount`, `missingImageExamples`
- `suspiciousImageCount`, `suspiciousImageExamples`
- `missingNameCount`, `malformedNameExamples`
- `missingTeamCount`, `missingPositionCount`, `missingStatusCount`, `missingStatsCount`
- `rookieFlagMissingCount`, `rookieExamples`
- `sourceBreakdown`
- `topProblemPlayers`
- `recommendedFixes`
- `dataSourceMap` (request + resolved flow metadata)

## Known Problem Categories Captured
- Duplicate identity groups by canonical ID and provider ID
- Duplicate logical players by normalized `name + team + position`
- Missing or placeholder image URLs
- Same image URL reused for multiple different players
- Malformed/unreadable names
- Missing team/position/status/stats
- Missing rookie flag for rows with `yearsExp = 0`

## Frontend Dev Diagnostics
When `NEXT_PUBLIC_DRAFT_PLAYER_AUDIT='true'`, draft room logs dev-only warnings from `DraftRoomPageClient` for:
- duplicate player IDs
- duplicate normalized names
- missing images
- malformed names
- missing team/position

No production console spam is added.

## Next Cleanup Phases
1. Canonicalization and source-level dedupe (ingestion/upsert contract)
2. Image repair pipeline with approved source preference and placeholder fallback policy
3. Rookie/status/stats backfill consistency checks and freshness metadata
4. Automated regression checks in draft pool CI gates
