# NBA/NHL Playoff Provider Suitability

Status: proof-of-data required before production sync changes. NBA/NHL playoff brackets should remain beta/static until a provider returns current postseason rows with enough structure to build best-of-seven series.

Last local audit: `node --env-file=.env --import tsx scripts/audit-playoff-provider-data.ts --season 2026 --json`.

Key finding: Rolling Insights appears to use the season start year for NBA/NHL playoff feeds. `schedule-season/2026/<SPORT>` returned no rows locally, while `schedule-season/2025/NBA` returned 74 postseason rows and `schedule-season/2025/NHL` returned 66 postseason rows.

Run the local read-only audit:

```bash
node --env-file=.env --import tsx scripts/audit-playoff-provider-data.ts --season 2026
```

Use `--json` when attaching the output to implementation notes.

## Matrix

| Provider | NBA Support | NHL Support | Schedule Support | Live Score Support | Postseason Marker | Round/Series Support | Team ID Support | Score/Status Support | Recommended Usage | Confidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Rolling Insights | Yes, proven locally for season `2025` | Yes, proven locally for season `2025` | `schedule-season/<YEAR>/<SPORT>` via REST probe | `live/<DATE>/<SPORT>` / scores adapter | Yes for `2025`; `2026` returned no rows | NBA has event-name context; NHL needs mapping verification from sampled event names | Yes | Status/date yes; scores absent in sampled postseason rows | Primary series discovery candidate, using candidate season fallback | Medium |
| ClearSports | Docs list NBA teams/games/stats/injuries | Docs list NHL teams/games/stats/injuries | `/api/v1/nba/games`, `/api/v1/nhl/games` | Games endpoint may include status/scores | Potential `season_type=3` filter based on docs pattern | Unknown; local audit returned no rows due fetch failure/no proof | Unknown from local audit | Unknown from local audit | Do not wire until keyed proof returns rows | Low |
| TheSportsDB | Basketball/NBA season events returned locally | Ice Hockey/NHL season events returned locally | `eventsseason`, league/team schedule endpoints | v2 livescore endpoints | No playoff marker in local `eventsseason` sample | Round/event fields present but not enough postseason/series context | Yes | Yes | Backup for schedule/event identity and scores, not primary series builder | Medium for fallback data, low for series construction |
| ESPN | Existing NBA scoreboard works | Existing NHL scoreboard works | Scoreboard gives current event slate, not full playoff bracket | Yes for current live/final games | Current response may indicate postseason season type | No round/series context in current adapter | Yes | Yes | Last fallback for live status/scores after series are already known | Medium for live status, low for series construction |

## Suitability Criteria

A provider is high-confidence for `PlayoffBracketSeries` only when real current rows include:

- Stable game/event ID.
- Home and away team names.
- Home and away team IDs.
- Status and start time.
- Scores for final games.
- Postseason marker.
- Round or event name that maps to first round, semifinals/second round, conference finals, and finals.

Without postseason plus round/event context, the provider can help update live scores only after another provider or manual source has already established the series.

## Current Recommendation

Keep NBA/NHL playoff sync conservative. Do not advertise live accuracy until the sync uses provider proof and exposes season fallback diagnostics.

Best next candidate is Rolling Insights `schedule-season` with candidate season fallback from challenge year to season start year. For a 2025-2026 playoff challenge, test `2026` and `2025`; prefer the season with postseason rows. ESPN can supplement live score/status only after series discovery.

Recommended next slice after proof:

1. Add a provider adapter only for the proven sport/provider pair.
2. Normalize rows into the existing playoff sync diagnostics shape.
3. Add fixture tests from the audited sample payload, with secrets removed.
4. Keep ESPN as a score/status fallback, not a series discovery source.
