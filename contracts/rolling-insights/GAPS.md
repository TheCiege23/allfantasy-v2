# Known Gaps — append here instead of probing

**Purpose:** record what we don't know so nobody re-probes the API to rediscover it.

**Status values:** `UNVERIFIED` (never probed) · `PROBE_PENDING` (queued for next capture) · `RESOLVED` (fixture committed) · `WONTFIX` (vendor doesn't have it)

---

## Blocking — resolve before shipping that sport

| ID | Gap | Status | Blocks | How to resolve |
|---|---|---|---|---|
| `G-01` | Field names in `/live` for **NHL** | UNVERIFIED | NHL scoring | One probe during an NHL game → commit fixture |
| `G-02` | Field names in `/live` for **NCAAFB** | UNVERIFIED | CFB scoring | Probe on a Saturday → commit fixture |
| `G-03` | Field names in `/live` for **NCAABB** | UNVERIFIED | CBB scoring | Probe during a game → commit fixture |
| `G-04` | Field names in `/live` for **SOCCER** (all 3 leagues) | UNVERIFIED | Soccer scoring | Probe with `?league=EPL` during a match |
| `G-05` | `game_id` format for NHL / NCAAFB / NCAABB / SOCCER | UNVERIFIED | Per-game polling | Read `game_ID` off any `/schedule` response |
| `G-06` | **`/injuries` field list** for NFL beyond the 5 known keys | PARTIAL | Injury detail | Known: `player`, `player_id`, `injury`, `date_injured`, `returns`. Probe for more. |
| `G-07` | `/depth-charts` field list — **all sports** | UNVERIFIED | Depth-chart features | Probe NFL first |

## Non-blocking but worth resolving

| ID | Gap | Status | Notes |
|---|---|---|---|
| `G-08` | In `game_id` = `YYYYMMDD-{n}-{n}`, is the first number **home or away**? | UNVERIFIED | One weak sample suggests `{home}-{away}`. **Do not codify on one sample.** Cross-check 3+ games against a known schedule. |
| `G-09` | Does `RS-DATA-TYPE` response header actually exist? | CONTRADICTED | Notion docs mention it (`LIVE-DATA`, `INJURY-REPORTS`). The vendor's own skill repo documents **no** custom response headers. **Do not depend on it either way.** |
| `G-10` | Are NCAAFB/NCAABB injuries genuinely absent, or just undocumented? | UNVERIFIED | Vendor instructs agents not to call them — that's **policy, not a 404 guarantee**. Worth one probe before hard-coding unavailability. |
| `G-11` | Does `/play-by-play` really 404 for NHL/NCAAFB? | UNVERIFIED | Same reasoning as G-10. Vendor scripts hard-block it client-side, which tells us nothing about the server. |
| `G-12` | Actual observed live latency vs broadcast | UNVERIFIED | Vendor says "medium-latency", never quantified. **Measure during the 30-day trial.** Drives UX promises. |
| `G-13` | Payload size of a league-wide `/live` call on a full slate | UNVERIFIED | Determines whether league-wide polling beats per-game (see INTEGRATION.md §4). |
| `G-14` | 304 frequency under 35s cache-busted polling | UNVERIFIED | If busting works, should be ~0. Track via `v_feed_health.cache_304_last_hour`. |
| `G-15` | `season_type` / `status` enum values for non-NFL sports | UNVERIFIED | NFL enums are documented. Others assumed similar — verify. |
| `G-16` | Whether `/team-stats/{SPORT}` (season-less) works per sport | PARTIAL | Documented default only for PGA and DARTS. |

## Vendor doesn't have it — `WONTFIX`, do not probe

| Gap | Confirmed by |
|---|---|
| Play-by-play for NHL, NCAAFB, NCAABB, SOCCER, DARTS, PGA | Support matrix, 4 independent statements in skill repo |
| Injuries / depth charts for NCAAFB, NCAABB, SOCCER, DARTS, PGA | Support matrix |
| Player season stats for SOCCER | Support matrix |
| Team info / team stats for DARTS, PGA | Support matrix |
| Odds endpoints — any sport | Vendor FAQ: "Do you have Odds data? No" |
| Projection endpoints — any sport | Vendor FAQ: "We do not offer projection stats" |
| Bundesliga, Ligue 1, Champions League, MLS | 0 hits in Euro Soccer doc; pricing lists only EPL/LALIGA/SERIEA |
| Practice-participation grid (DNP/Limited/Full) | Injury payload has `returns` status only |
| A fantasy endpoint | Fantasy values are fields inside football payloads only |
| GraphQL for anything except NFL and MLB | Skill repo excludes GraphQL entirely |

---

## Probe protocol

When you genuinely need to resolve a gap:

1. Run `scripts/probe.sh <endpoint> <SPORT> [league]`
2. Commit the response to `fixtures/<endpoint>.<SPORT>[.<LEAGUE>].json`
3. Insert/update the row in `ri.contract_probe_log`
4. Update `ENDPOINTS.yaml` `fields:` with the discovered field list and raise its `confidence`
5. Move the row above to `RESOLVED` with the fixture path
6. **Commit all of it in one change.** A probe whose result isn't committed will be repeated.

**Probe on a game day.** Off-day probes return empty arrays and teach you nothing about payload shape — that ambiguity is the original source of the re-probing loop.
