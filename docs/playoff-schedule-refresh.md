# NBA/NHL Playoff Schedule Refresh

## Purpose

NBA and NHL playoff bracket cards need late schedule metadata even after the playoff series are already known. The scheduled refresh calls ESPN for near-term scoreboard data so cards can update game time, venue, broadcast/where-to-watch text, live score, and live status.

## Provider Order

Rolling Insights `schedule-season` remains the primary source for NBA/NHL playoff series discovery and official bracket construction.

ESPN is supplement-only. It is used after bracket series already exist and only updates display metadata:

- `nextGameAt`
- `venue`
- `broadcastNetwork`
- `liveHomeScore`
- `liveAwayScore`
- `liveStatus`
- `providerGamesJson`
- `lastSyncedAt`

The ESPN refresh does not create playoff series, replace official team names, create user picks, set official winners, or change lock behavior.

## Cron Window

Vercel Cron is configured in UTC:

- `0 16-19 * * *`

During May playoff season in Eastern Daylight Time, that corresponds to 12 PM-3 PM ET / 16:00-19:00 UTC. This window catches late-posted game times, venue updates, and broadcast updates before evening games.

## Required Env

- `CRON_SECRET`

Send it server-side only as `Authorization: Bearer <CRON_SECRET>` or `x-cron-secret`.

## Manual Test

```bash
curl -i "https://www.allfantasy.ai/api/brackets/playoffs/cron/refresh-schedule?sport=all&provider=espn&dryRun=true" -H "Authorization: Bearer <CRON_SECRET>"
```
