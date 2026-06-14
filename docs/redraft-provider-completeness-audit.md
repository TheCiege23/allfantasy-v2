# Redraft Provider Completeness Audit

_Audited 2026-06-13 against live Neon. The Redraft War Room consumes a source when it is
populated and emits a truthful provider-limited flag otherwise. No fabrication; NFL/NCAAF
pools never mix._

## Source matrix

| Source (table / module) | Status | NFL | NCAAF | Update / sync path | Freshness signal | War Room use | External-blocked? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `RedraftRoster` / `RedraftRosterPlayer` / standings | **live (DB)** | ✅ | ✅ | app writes | per-tx | rosters, record, PF/PA, seed, FAAB, injuryStatus field | no |
| `RedraftMatchup` | **live (DB)** | ✅ | ✅ | app/scoring | per-tx | upcoming/recent matchup + projected/actual | no |
| roster template / scoring | **live/static** | ✅ | ✅ | config | — | slots/FLEX/required-by-pos, PPR/preset | no |
| `SportsPlayer` (player pool) | **live** | ✅ 5,951 | ✅ | `cron/import-players` | `fetchedAt`/`expiresAt` | base identity for FA pool | no |
| **ADP** `AllFantasyAdpSnapshot` / `AdpDataRecord` | **live** | ✅ 468 / 11.6k | ✅ 141 | `cron/adp-refresh`, `recompute-allfantasy-adp` | `lastUpdatedAt` | **free-agent ranking + ROS value** | no |
| `fantasy_projections` (`FantasyProjection`) | **seed/sync-only** | ⚠️ 21 (seed) | ⚠️ | no committed live writer (created via `db push`); seed populates | `fetchedAt`/`expiresAt` | weekly projection (top priority for lineup) when present; else ADP/avg fallback | **yes — needs a projection provider/import** |
| `player_weekly_scores` (`PlayerWeeklyScore`) | **live-capable** | ⚠️ 21 (seed) | ⚠️ | `lib/redraft/playerWeeklyScoreService` + `cron/import-scores` + `/api/redraft/score-sync` | `updatedAt`, `isFinalized` | season-to-date average (fallback after projection) | partial — sync path exists; depends on stat provider feed |
| **Injuries** `InjuryReportRecord` (`injury_reports`) | **live** | ✅ 1,357 | ✅ | `cron/import-injuries` (sports-data-importer) | `reportDate` | per-player injury status (downgrades lineup/waiver), availability flag, freshness | no |
| **News** `PlayerNewsRecord` (`player_news`) | **live** | ✅ 1,523 | ✅ | `cron/import-news` | `publishedAt` | availability flag + freshness (panel data status) | no |
| `sports_core_injury_reports` / `sports_core_player_news_items` | **MISSING (P2021)** | ❌ | ❌ | platform-backend foundation (unmigrated here) | — | NOT used — superseded by the populated `injury_reports` / `player_news` tables above | n/a |
| free-agent route `app/api/redraft/players` | **placeholder** | — | — | — | — | superseded by `redraftFreeAgentPool` | no |

## What the War Room now uses (real)
- **Free agents:** ADP-ranked, sport-isolated, rostered-excluded, fantasy-position-filtered.
- **Value precedence:** weekly projection → season-to-date average → ADP/ROS proxy → none (confidence high/medium/low/none).
- **Injuries:** real `injury_reports` joined by player name → downgrades + `availability.injuries: available`.
- **News:** real `player_news` presence + freshness → `availability.news: available`.
- **Standings/matchups:** real RedraftRoster + RedraftMatchup.

## Remaining external-provider gaps
1. **Weekly projections** — no committed live provider import for `fantasy_projections` (table exists,
   populated only by seed in this env). When a projection feed is added, the context already consumes
   it (lineup/start-sit prioritizes it). **External-blocked.**
2. **Weekly stat sync at scale** — `player_weekly_scores` has a real service + cron, but live coverage
   depends on the stat provider feed running for the active season/week. Context consumes rows when present.

## Not gaps (resolved this pass)
- Injuries + news are **wired to real populated tables** (were mistakenly pointed at the unmigrated
  `sports_core_*` tables before).
- ADP / free-agent pool / trade values are live.

## Verdict
Redraft War Room is **provider-complete for the data that exists in this environment** (rosters,
standings, matchups, ADP/free agents, injuries, news) and **honestly provider-limited only for live
weekly projections** (and full-season weekly-score coverage), which are external-feed dependencies the
context already consumes when present. No fabricated data anywhere.
