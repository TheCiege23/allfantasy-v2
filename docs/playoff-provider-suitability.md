# NBA/NHL Playoff Provider Suitability

Status: Rolling Insights remains the best proven NBA/NHL playoff schedule and series-discovery source. Do not replace the production sync provider until another source returns postseason rows with stable round/series context for both sports.

Last local audits:

- `node --env-file=.env --import tsx scripts/audit-playoff-provider-data.ts --season 2026 --json`
- `node --env-file=.env --import tsx scripts/audit-playoff-provider-data.ts --season 2025 --json`

Key finding: Rolling Insights uses the season start year for NBA/NHL playoff feeds. A 2025-26 playoff challenge should test provider season `2026`, then fall back to `2025`.

- `schedule-season/2026/NBA`: 0 rows.
- `schedule-season/2025/NBA`: 1,380 rows, 75 postseason rows.
- `schedule-season/2024/NBA`: 1,383 rows, 90 postseason rows.
- `schedule-season/2026/NHL`: 0 rows.
- `schedule-season/2025/NHL`: 1,480 rows, 66 postseason rows.
- `schedule-season/2024/NHL`: 1,436 rows, 86 postseason rows.

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

## Detailed Proof Matrix

| Provider | Endpoint Used | NBA Rows / Postseason Rows | NHL Rows / Postseason Rows | Team IDs | Team Names | Scores | Status | Start Time | Venue | Broadcast | Round/Event Name | Series Context | Postseason Marker | Confidence | Recommended Usage |
| --- | --- | ---: | ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Rolling Insights | `schedule-season/<YEAR>/<SPORT>` | `2025`: 1,380 / 75; `2024`: 1,383 / 90 | `2025`: 1,480 / 66; `2024`: 1,436 / 86 | Yes | Yes | Not in sampled postseason rows | Yes | Yes | Partial/field-map dependent | NBA broadcast field mapped; NHL unknown/field-map dependent | Yes via `event_name`; NBA stronger in 2025 sample, NHL stronger in 2024 sample | Best available, series can be aggregated from repeated team pairs + event name | Yes, `season_type=postseason` | Medium-high for schedule/series discovery | Primary series discovery and schedule import. Use candidate season fallback. |
| ESPN | `site.api.espn.com/.../scoreboard` | Current slate only: 1 / 1 in audit | Current slate only: 1 / 1 in audit | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Event name only; no reliable bracket round in adapter | No full bracket/series discovery | Current event can indicate postseason | Medium for live/final scores; low for discovery | Live score/status/final score supplement after series are known. |
| TheSportsDB | `eventsseason.php` | `2025-2026`: 1,364 / 0; `2024-2025`: 1,388 / 0 | `2025-2026`: 1,486 / 0; `2024-2025`: 1,503 / 0 | Yes | Yes | Yes | Yes | Yes | Not proven in audit | Not proven in audit | Has fields, but not postseason-specific | No reliable series marker | No postseason marker in local sample | Medium for generic schedule/events; low for playoffs | Backup for event identity/scores only, not primary series builder. |
| ClearSports | `/api/v1/<sport>/games?season_type=3` | 0 / 0 | 0 / 0 | Not proven | Not proven | Not proven | Not proven | Not proven | Not proven | Not proven | Not proven | Not proven | Intended filter, but no successful proof | Low | Not recommended until keyed proof returns usable rows. |

## Provider Recommendations

### NBA

| Data Purpose | Recommended Provider Order | Notes |
| --- | --- | --- |
| Series discovery | Rolling Insights `schedule-season`, candidate season fallback | Best proof: 75 postseason rows for provider season `2025`, 90 for `2024`; includes team IDs, team names, status, start time, event names, postseason marker. |
| Schedule / venue / broadcast | Rolling Insights first, ESPN supplement | Rolling Insights has schedule and NBA broadcast field mapping; ESPN can fill current-event venue/broadcast when available. |
| Live score / status | ESPN scoreboard, then Rolling Insights live/scores adapter | ESPN has strong current event score/status/venue/broadcast. Rolling Insights live can supplement through the existing live score service. |
| Final scores / results | ESPN scoreboard/current final first, Rolling Insights live/scores if available, derive series wins from game finals | Rolling Insights schedule audit rows did not include postseason scores; final series wins should be derived after final score rows are available. |
| News / injury / context | NewsAPI / existing news aggregation later | Useful for display/context only; not part of bracket series discovery. |

### NHL

| Data Purpose | Recommended Provider Order | Notes |
| --- | --- | --- |
| Series discovery | Rolling Insights `schedule-season`, candidate season fallback | Best proof: 66 postseason rows for provider season `2025`, 86 for `2024`; includes team IDs, team names, status, start time, event names, postseason marker. NHL event-name mapping should stay under diagnostics because the 2025 sample was weaker than 2024 for explicit round fields. |
| Schedule / venue / broadcast | Rolling Insights first, ESPN supplement | Rolling Insights gives the best playoff schedule rows; ESPN can fill current-event venue/broadcast/status where present. |
| Live score / status | ESPN scoreboard, then Rolling Insights live/scores adapter | ESPN current scoreboard returned score/status/team IDs. It should not be used as primary series discovery. |
| Final scores / results | ESPN scoreboard/current final first, Rolling Insights live/scores if available, derive series wins from game finals | Rolling Insights schedule audit rows did not include postseason scores; series wins should be derived from final game scores. |
| News / injury / context | NewsAPI / existing news aggregation later | Useful for display/context only; not part of bracket series discovery. |

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

Best primary source remains Rolling Insights `schedule-season` with candidate season fallback from challenge year to season start year. For a 2025-2026 playoff challenge, test `2026` and `2025`; prefer the season with postseason rows. ESPN can supplement live score/status/final score only after series discovery.

Recommended next slice after proof:

1. Add a provider adapter only for the proven sport/provider pair.
2. Normalize rows into the existing playoff sync diagnostics shape.
3. Add fixture tests from the audited sample payload, with secrets removed.
4. Keep ESPN as a score/status fallback, not a series discovery source.
