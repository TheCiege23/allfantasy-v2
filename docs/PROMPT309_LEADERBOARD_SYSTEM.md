# PROMPT 309 — Leaderboard System

## Objective

**Add competition** via platform leaderboards.

## Show

- **Top users** — Overall ranking by GM prestige (championships + win % + activity).
- **Best drafters** — Average draft grade score across leagues.
- **Win %** — Highest career win percentage (min games threshold).

Additional boards: **Most championships**, **Most active** (leagues played).

## Deliverable: Leaderboard

### Implementation

| Piece | Description |
|-------|-------------|
| **Service** | `lib/platform-leaderboards/PlatformLeaderboardsService.ts`: `getTopUsersLeaderboard`, `getBestDraftGradesLeaderboard`, `getHighestWinPctLeaderboard`, `getMostChampionshipsLeaderboard`, `getMostActiveLeaderboard`. Display names from UserProfile + AppUser. |
| **Best drafters** | Resolves manager from DraftGrade via app League (uuid) + Roster.platformUserId or LeagueTeam → LegacyRoster.ownerId; supports legacy Sleeper league id + roster id. Aggregates by manager, sorts by avg score. |
| **Top users** | ManagerFranchiseProfile ordered by gmPrestigeScore desc, then championshipCount, then careerWinPercentage. |
| **Win %** | ManagerFranchiseProfile ordered by careerWinPercentage desc (optional min games). |
| **API** | **GET /api/leaderboards?board=top\|draft_grades\|championships\|win_pct\|active&limit=** — Returns `{ entries, total, generatedAt }`. Default board `top`. |
| **Page** | **/leaderboards** — Tabs: Top users, Best drafters, Most championships, Win %, Most active. Lists rank, display name, value, and optional extra (count, grade). |

### Boards

1. **top** — Top users (prestige score).
2. **draft_grades** — Best drafters (avg draft grade).
3. **championships** — Most championships.
4. **win_pct** — Highest win %.
5. **active** — Most active (leagues played).

### Data sources

- **Draft grades:** `DraftGrade` + resolution to manager via League/Roster or LeagueTeam/LegacyRoster (app and legacy).
- **Championships / Win % / Prestige / Activity:** `ManagerFranchiseProfile` (managerId, championshipCount, careerWinPercentage, gmPrestigeScore, totalLeaguesPlayed).

## Summary

The **leaderboard system** adds competition with **top users**, **best drafters**, and **win %**, plus championships and activity boards. Implemented in `lib/platform-leaderboards`, GET /api/leaderboards, and the /leaderboards page with tabbed boards.
