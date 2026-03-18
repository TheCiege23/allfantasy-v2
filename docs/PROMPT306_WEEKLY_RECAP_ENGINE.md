# PROMPT 306 — Weekly Recap Engine

## Objective

**Summarize user performance** in a weekly recap.

## Include

- **Wins/losses** — User’s record across their leagues (when we can resolve their team, e.g. via Legacy league link).
- **Best players** — Placeholder or top performers (extensible from TeamPerformance or external data).
- **AI insights** — Short bullets (e.g. “Ask Chimmy for waiver and trade advice”, “Use the trade evaluator…”).

## Deliverable: Weekly Recap

### Implementation

| Piece | Description |
|-------|-------------|
| **Types** | `lib/weekly-recap-engine/types.ts` — `WeeklyRecapPayload`, `WeeklyRecapLeague`, `LeagueRecord`, `WeeklyRecapPlayer`. |
| **Engine** | `lib/weekly-recap-engine/WeeklyRecapEngine.ts` — `buildWeeklyRecapPayload(userId)`: loads user’s leagues, resolves “my” team record per league via Legacy league + Sleeper user ID (when available), aggregates total wins/losses/ties, attaches placeholder best players and default AI insights, builds a short summary sentence. |
| **API** | **GET /api/weekly-recap** (auth) — Returns the full `WeeklyRecapPayload` (period, totalWins, totalLosses, totalTies, leagues, bestPlayers, aiInsights, summary). |

### Data flow

1. **User’s leagues** — `League.findMany({ where: { userId } })`.
2. **Wins/losses** — For each league, if the user has a linked Legacy account (`AppUser.legacyUserId` → `LegacyUser.sleeperUserId`), find `LegacyRoster` for that league (via `League.legacyLeagueId`) and `ownerId = sleeperUserId`. Then `LeagueTeam` where `legacyRosterId = that LegacyRoster.id` gives wins, losses, ties, rank, pointsFor. If not linked or no legacy league, `myRecord` is omitted for that league (totals still sum only resolved leagues).
3. **Best players** — Placeholder entry for now; can be extended with `TeamPerformance` or Sleeper weekly scoring.
4. **AI insights** — Default list of suggestions (Chimmy, trade evaluator, mock draft); can be replaced or extended with dynamic AI-generated bullets.

### Relation to existing recap

- The **engagement** weekly recap (`lib/engagement-engine/WeeklyRecapGenerator`) is activity-based (league views, bracket views, AI uses) and drives the in-app notification.
- The **weekly recap engine** is performance-based (wins/losses, leagues, best players, AI insights) and is consumed by **GET /api/weekly-recap** for a dedicated recap view or for enriching the notification body. The two can be combined in the UI or in a future notification payload.

### Dependencies

- `lib/sports-media-engine/RecapGenerator` — `buildRecapContext(leagueId)` for league standings when needed.
- Prisma: `League`, `LeagueTeam`, `LegacyRoster`, `LegacyLeague`, `LegacyUser`, `AppUser`.

## Summary

- **Weekly recap** deliverable: engine that summarizes user performance (wins/losses from linked Legacy leagues, per-league breakdown, best players placeholder, AI insights) and **GET /api/weekly-recap** that returns the full payload for UI or downstream use.
