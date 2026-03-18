# PROMPT 307 — Achievement System

## Objective

**Add progression** via achievements (no money rewards).

## Examples

- **First win** — Won your first matchup
- **Best draft** — Had the best draft in your league (by grade or result)
- **Highest score** — Scored the most points in a single week in your league

Additional progression achievements: **Draft Complete**, **Ten Wins**.

## No money rewards

All achievements grant **XP/progression points only**. No cash, credits, or payouts.

## Deliverable: Achievement System

### Implementation

| Piece | Description |
|-------|-------------|
| **Definitions** | New achievement types in `lib/badge-engine.ts`: `first_win`, `best_draft`, `highest_score`, `draft_completed`, `ten_wins`. Same definitions in `lib/achievement-system/definitions.ts` for the achievement API. |
| **Storage** | Uses existing **AiBadge** (Prisma): `userId`, `badgeType`, `badgeName`, `description`, `tier`, `xpReward` (progression only), `data`, `earnedAt`. |
| **Service** | `lib/achievement-system/`: `awardAchievement(userId, type, meta?)`, `getAchievementsForUser(userId)`, `hasAchievement(userId, type)`. Wraps `checkAndAwardBadge` from badge-engine. |
| **API** | **GET /api/achievements** (auth) — Returns all progression achievements with earned status for the current user. |

### When achievements are awarded

- **first_win** — When building the weekly recap, if the user has `totalWins >= 1` and has not already earned `first_win`, it is awarded (weekly recap engine).
- **ten_wins** — Same flow when `totalWins >= 10`.
- **draft_completed** — When a league draft is completed (`completeDraftSession` in `DraftSessionService`), the league owner is awarded `draft_completed` if not already earned.
- **best_draft** — Award from your code when you determine “best draft” (e.g. when draft rankings are computed and the user is #1): `awardAchievement(userId, 'best_draft', { leagueId })`.
- **highest_score** — Award when you have weekly score data and the user had the top score in a week: `awardAchievement(userId, 'highest_score', { leagueId, week })`.

### Usage

- **List achievements (UI)** — `GET /api/achievements` → `{ achievements: AchievementWithEarned[] }` (each has `earned`, `earnedAt`, `meta`).
- **Award from backend** — `import { awardAchievement } from '@/lib/achievement-system'; await awardAchievement(userId, 'highest_score', { leagueId, week });`

### Dependencies

- `lib/badge-engine` — `checkAndAwardBadge`, `getUserBadges`; stores in `AiBadge`.

## Summary

- **Achievement system** adds progression: first win, best draft, highest score, draft completed, ten wins. Stored as badges; **GET /api/achievements** returns definitions and earned status. **No money rewards** — XP/progression only. Award hooks are integrated for first_win, ten_wins (weekly recap), and draft_completed (draft completion); best_draft and highest_score can be awarded where you compute those results.
