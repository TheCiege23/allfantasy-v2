# PROMPT 308 — User Profile System

## Objective

**Show user stats** on the profile: record, rankings, and achievements.

## Include

- **Record** — Win-loss-tie aggregate across leagues, with per-league breakdown when available (from legacy/synced league data).
- **Rankings** — Draft grades and rank per league (from post-draft manager rankings).
- **Achievements** — Progression achievements (PROMPT 307) with earned status.

## Deliverable: Profile system

### Implementation

| Piece | Description |
|-------|-------------|
| **Profile stats service** | `lib/profile-stats/`: `getProfileStats(userId)` returns `{ record, rankings, achievements }`. Record comes from weekly recap logic; rankings from `DraftGrade` for the user’s rosters/teams; achievements from `getAchievementsForUser`. |
| **API** | **GET /api/profile/stats** (auth) — Returns profile stats for the current user. |
| **Profile UI** | On `/profile` (own profile), a “Your stats” section shows: **Record** (W-L-T and per-league), **Rankings** (draft grades by league), **Achievements** (count and list with earned ✓). |

### Data sources

- **Record:** Same logic as weekly recap: user’s leagues → legacy/sleeper link → `LeagueTeam` / legacy roster wins-losses-ties. Aggregated and per-league.
- **Rankings:** User’s leagues → resolve “my” roster/team ids per league (Roster by `platformUserId`, or LeagueTeam via LegacyRoster) → `DraftGrade` for those rosterIds in each league.
- **Achievements:** Existing achievement system (GET /api/achievements); no money rewards.

### Usage

- **Profile page:** When viewing your own profile, the stats section loads `/api/profile/stats` and displays record, rankings, and achievements.
- **Programmatic:** `import { getProfileStats } from '@/lib/profile-stats'; const stats = await getProfileStats(userId);`

## Summary

The **profile system** surfaces user stats on the profile: **record** (W-L-T and by league), **rankings** (draft grades), and **achievements** (progression only). Implemented via `lib/profile-stats`, GET /api/profile/stats, and the profile page “Your stats” block.
