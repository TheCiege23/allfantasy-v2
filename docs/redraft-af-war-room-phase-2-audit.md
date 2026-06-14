# Redraft AF War Room — Phase 2 Provider/Data Audit

_Audited 2026-06-13 against live Neon (`DATABASE_URL` present). Counts are live._

Phase 2 wires **real** native-redraft data into the War Room. This audit records exactly which
sources are populated so engines use real signals where they exist and emit truthful
provider-limited states where they don't. **No fabrication. NFL and NCAAF pools never mix.**

## Source-by-source

| Source (table/module) | Status | NFL | NCAAF | Freshness | Safe for redraft | War Room use | Risk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `RedraftRosterPlayer` | **live** | ✅ | ✅ | per-tx | ✅ | rostered set (exclude from FA), positions, bye, injuryStatus field | — |
| `RedraftRoster` / standings | **live** | ✅ | ✅ | per-tx | ✅ | record, PF/PA, seed, FAAB, waiverPriority, streak | — |
| `RedraftSeason` | **live** | ✅ | ✅ | per-tx | ✅ | sport, season, currentWeek, totalWeeks, playoffStartWeek | — |
| `RedraftMatchup` | **live** | ✅ | ✅ | per-tx | ✅ | upcoming/recent matchup, projected/actual scores | — |
| roster template (`getEffectiveLeagueRosterTemplate`) | **live** | ✅ | ✅ | memo | ✅ | lineup slots / FLEX / required-by-position | — |
| scoring (`League.settings.sportConfig`) | **live/static** | ✅ | ✅ | — | ✅ | PPR/preset/superflex/TEP | — |
| **`SportsPlayer`** (canonical player pool) | **live** | ✅ **5,951** | ✅ | provider sync | ✅ | base player identity for FA pool | name/pos join only |
| **`AllFantasyAdpSnapshot`** (`playerKey=name\|pos`) | **live** | ✅ **468** | ✅ **141** | computed | ✅ | **primary FA/waiver ranking + ROS value proxy** (avg overall pick, lower=better) | redraft `leagueType` rows present |
| **`AdpDataRecord`** (`adp_data`, `format='redraft'`) | **live** | ✅ **~11.6k all sports** | ✅ | provider | ✅ | secondary ADP/value (per name+pos) | name-based join |
| `fantasy_projections` | **seed-only (21)** | ⚠️ | ⚠️ | seed | ✅ | weekly projection when present; else fallback to ADP/avg | not populated for real players yet → projections-missing flag |
| `player_weekly_scores` | **seed-only (21)** | ⚠️ | ⚠️ | seed | ✅ | season-to-date average when present | not populated for real players |
| `sports_core_injury_reports` (`InjuryReport`) | **MISSING table (P2021)** | ❌ | ❌ | — | ✅ when present | injury downgrade; uses `RedraftRosterPlayer.injuryStatus` if set | platform-backend foundation not migrated here |
| `sports_core_player_news_items` (`PlayerNewsItem`) | **MISSING table (P2021)** | ❌ | ❌ | — | ✅ when present | news flags | same |
| `app/api/redraft/players` free-agent route | **placeholder (returns [])** | — | — | — | — | superseded by the new pool service | — |
| `lib/redraft/ai/*` | **stubs** | — | — | — | — | superseded by deterministic engines + grounded prompt | — |

## Phase 2 signal strategy (deterministic, honest)
1. **Free-agent pool** = ADP-ranked players for the league's sport+season (`AllFantasyAdpSnapshot`,
   redraft leagueType) **minus rostered** `RedraftRosterPlayer` (matched by normalized name+position),
   bounded to the fantasy-relevant ADP set. Sport carried through — NFL never returns NCAAF and vice-versa.
2. **Per-player value signal precedence:** current-week **projection** → **ADP/ranking** (ROS proxy) →
   **season-to-date average** (finalized weekly scores) → none (low-confidence / structural only).
3. **Injuries/news:** use `RedraftRosterPlayer.injuryStatus` when set; the `sports_core_*` provider
   tables are absent here, so news + cross-player injury enrichment surface as provider-limited.
4. **Lineup/start-sit:** projection-first; ADP/avg fallback at lower confidence.
5. **Waivers:** ADP-ranked real free agents at need positions; FAAB/priority suggestions.
6. **Trade analyzer/finder:** projection→ADP/ROS→avg per player; season-horizon; `needs_more_data`
   when no signal exists for the involved players.

## Net availability for a fresh real league
- **Available now (real):** rosters, standings, matchups, scoring/roster rules, **free-agent pool +
  ADP rankings** (NFL & NCAAF).
- **Available when seeded / after provider sync:** projections, weekly scores.
- **Provider-limited (absent here):** injury reports + news (`sports_core_*` not migrated).

## Phase 2 — BUILT (2026-06-13)

Implemented and verified against live Neon:

- **Real free-agent pool** — `lib/redraft-war-room/redraftFreeAgentPool.ts`: ADP-ranked players for
  the league's sport+season (`AllFantasyAdpSnapshot`, redraft leagueType) minus rostered
  (`buildPlayerKey(name,pos)` match), filtered to real fantasy positions (excludes coaches/staff),
  deduped to best ADP, capped at 60. **Verified:** the seeded NFL league resolves **60 real free
  agents** (Mike Evans, A.J. Brown, …) with ADP.
- **Signal precedence** — `lib/redraft-war-room/playerValue.ts`: projection → season-avg → ADP/ROS
  proxy → none, with confidence high/medium/low/none. ADP inverted to a comparable value scale.
- **Context** — `redraftWarRoomContext.ts` attaches `adp` to every player fact, populates
  `freeAgents`, and sets `availability.waiverPool`/`tradeValues` from real data. **Verified:**
  `waiverPool: available`, `tradeValues: available`.
- **Engines** — waiver (ranks real ADP free agents at need positions, FAAB/priority), lineup
  (projection→avg→ADP fallback, confidence reflects weakest signal), trade analyzer/finder (ADP as
  ROS value; `needs_more_data` only when no signal), team-needs (ADP-aware strength) all consume the
  shared signal.
- **Prompt** — `redraftWarRoomPrompt.ts` surfaces per-player ADP + a Top-Free-Agents block so the
  AI `ask` is grounded in the real pool; redraft-only + no-invention rules unchanged.
- **Frontend** — `RedraftWarRoomPanel` now shows a matchup/standings + data-status card and real
  ADP-tagged waiver candidates (was provider-limited in Phase 1).
- **Tests** — `__tests__/redraft-war-room-phase2.test.ts` (value precedence, ADP fallback, waiver
  ADP ranking, trade ADP-as-ROS, lineup confidence); existing suites updated; the `@db` Playwright
  spec asserts real free agents + waiverPool available + real UI waiver candidates. **4/4 E2E green.**

### Provider completeness update (2026-06-13) — injuries/news + global Chimmy NOW wired
- **Injuries / news:** ✅ **wired to real populated tables** — `InjuryReportRecord` (`injury_reports`,
  1,357 rows) + `PlayerNewsRecord` (`player_news`, 1,523), joined by player name
  (`lib/redraft-war-room/redraftInjuryNews.ts`). `availability.injuries`/`news` now report **available**
  with real freshness. (Previously pointed at the unmigrated `sports_core_*` tables.) The earlier
  audit's "injuries/news missing" line is superseded.
- **Global Chimmy chat route:** ✅ **wired** — `lib/redraft-war-room/redraftChimmyGrounding.ts`
  (`buildRedraftContextForChimmy`) mirrors the existing `build*ContextForChimmy` adapters and is
  injected in `app/api/chat/chimmy/route.ts` (non-fatal, gated to native redraft leagues only — not
  dynasty/specialty). It reuses the War Room context + engines + grounded prompt (no duplication) so
  global Chimmy answers carry redraft team needs / lineup / waivers / ADP free agents + the redraft-only
  & no-invention rules. Other formats unaffected (own adapters / null short-circuit).
- See [`redraft-provider-completeness-audit.md`](./redraft-provider-completeness-audit.md) for the full source matrix.

### Still external-provider-limited (honest)
- **Weekly projections:** no committed live import for `fantasy_projections` (populated by seed only
  in this env). The context already consumes projection rows when present (lineup prioritizes them);
  real free agents currently rank on **ADP** until a projection feed exists.
- **Full-season weekly scores:** `player_weekly_scores` has a real service + `cron/import-scores`;
  live coverage depends on the stat provider feed running.

## Migration/provider risks
- `sports_core_injury_reports` / `sports_core_player_news_items` are unmigrated in this DB. Engines
  must not assume them; they already `.catch(() => [])` and flag missing. No migration added this pass
  (out of scope; would need the platform-backend foundation).
