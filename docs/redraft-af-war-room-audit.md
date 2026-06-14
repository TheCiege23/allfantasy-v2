# Redraft AF War Room — Phase 1 Build

_Built 2026-06-12 on `origin/main`. Companion to the pre-build [`redraft-war-room-audit.md`](./redraft-war-room-audit.md)._

> **Phase 2 (2026-06-13): real provider/data integration built and DB-verified** — ADP-ranked
> free-agent pool (sport-isolated), ADP/ROS value signal across all engines, grounded prompt, panel
> matchup/standings + real waiver candidates. **Injuries + news now wired to the real populated
> `injury_reports` / `player_news` tables** (availability: available). **Global Chimmy chat is now
> grounded for native redraft leagues** via `buildRedraftContextForChimmy` (injected in
> `app/api/chat/chimmy/route.ts`, reusing War Room context/engines/prompt). See
> [`redraft-af-war-room-phase-2-audit.md`](./redraft-af-war-room-phase-2-audit.md) and
> [`redraft-provider-completeness-audit.md`](./redraft-provider-completeness-audit.md). Only
> external-provider-limited now: live weekly **projections** feed and full-season weekly-score
> coverage (the context already consumes both when present).

Phase 1 delivers the **deterministic + AI-grounding backend** for the Redraft AF War Room,
plus a wired UI panel. No live stats/projections/injuries/odds/news are fabricated; missing
data is reported as such.

## Current redraft architecture (reused, not rebuilt)

The native redraft stack already exists and is the data source: `RedraftSeason / RedraftRoster /
RedraftRosterPlayer / RedraftMatchup` (Prisma), the resolved roster template
(`getEffectiveLeagueRosterTemplate`), config-driven scoring (`lib/redraft/scoringEngine`), and
membership/commissioner auth (`lib/league-access`, `lib/league/league-access`). The previous
`lib/redraft/ai/*` analyzers were stubs returning `[]`; this build supersedes them with grounded
engines (the stubs are left untouched for the legacy `/api/redraft/ai/*` routes).

## What was built

### Services — `lib/redraft-war-room/`
| File | Role |
| --- | --- |
| `types.ts` | Canonical context + data-availability contract types |
| `redraftWarRoomContext.ts` | **Only DB-touching file.** Builds the deterministic, serializable context (scoring/roster/lineup/standings/teams/rosters/matchups/projections/injuries + freshness + missing-data flags + feature flags). Enforces league membership. |
| `redraftTeamNeedsEngine.ts` | Pure. Roster holes vs required slots, bench depth, bye stacks, injury flags, playoff-push context, urgency score, trade-target positions |
| `redraftLineupEngine.ts` | Pure. Greedy slot assignment honouring dedicated/FLEX/SUPERFLEX, ranked by projection→season-avg, start/sit questions, confidence + missing-data flags |
| `redraftWaiverEngine.ts` | Pure. Drop-side analysis + target positions always; add targets + FAAB/priority suggestions when a pool exists; `needsProviderIntegration` flag otherwise |
| `redraftTradeEngine.ts` | Pure. `analyzeTrade` (verdict accept/reject/neutral/needs_more_data, value + roster-fit deltas, lineup/bench/playoff impact); `findTradeTargets` (complementary needs/surplus fit) |
| `redraftWarRoomPrompt.ts` | Pure. Serializes context + engine output into a grounded prompt; exports `REDRAFT_WAR_ROOM_SYSTEM_RULES` (no-invention + redraft-only rules) |
| `client.ts` | Typed client helpers for the routes |

### Routes — `app/api/leagues/[leagueId]/redraft-war-room/`
Consolidated into **two files** (keeps the Vercel route count low — see decision below):
- `route.ts` → `GET` state (context + viewer team needs)
- `[action]/route.ts` → `POST` `waivers` · `lineup` · `trade-analyze` · `trade-find` · `ask`

Logical endpoints (per the spec):
- `GET  /api/leagues/:id/redraft-war-room` → state
- `POST /api/leagues/:id/redraft-war-room/waivers`
- `POST /api/leagues/:id/redraft-war-room/lineup`
- `POST /api/leagues/:id/redraft-war-room/trade-analyze`  _(spec's `trade/analyze`)_
- `POST /api/leagues/:id/redraft-war-room/trade-find`     _(spec's `trade/find`)_
- `POST /api/leagues/:id/redraft-war-room/ask`            _(AF War Room-gated)_

### UI
- `app/league/[leagueId]/tabs/redraft/RedraftWarRoomPanel.tsx` - wired panel: team needs,
  Start/Sit, Waivers, Trade analyzer, Trade finder, and an "Ask the War Room" box. Each tool calls a
  real consolidated redraft route. Missing-data flags and provider-limited waiver messaging are
  surfaced, and Ask degrades to grounded facts if AI is unavailable.
- Rendered inside the existing `war_room` tab (`WarRoomTab.tsx`) only for redraft, non-dynasty
  leagues. The compact NFL redraft shell now exposes that tab in
  `app/league/[leagueId]/LeagueTabs.tsx` and `app/league/[leagueId]/LeagueShell.tsx`; without that
  tab-list fix, pure NFL redraft leagues could have a working panel that was not reachable.

## Data sources used & liveness
See [`redraft-war-room-audit.md` §5](./redraft-war-room-audit.md). Summary: scoring/roster/standings/schedule = live DB; player stats = `PlayerWeeklyScore` (when ingested); projections/injuries/news = provider tables (flagged when empty); **waiver pool & redraft trade values = missing/needs provider**.

## AI grounding rules
The `ask` route runs the deterministic engines, builds the grounded prompt, and calls
`openaiChatText` with `REDRAFT_WAR_ROOM_SYSTEM_RULES`: explain over provided facts only; never
invent stats/projections/injury status/odds/news; redraft season-horizon framing (no
dynasty/picks/taxi/devy/C2C); no betting/medical certainty; personalized advice for the viewer's
own team unless commissioner. If OpenAI is unconfigured/unavailable the route returns the
deterministic grounding instead of an error.

## Permissions
- All routes require an authenticated league **member or commissioner** (`resolveLeagueAccess`).
- A member may only request recommendations for **their own roster**; passing another `rosterId`
  is `403` unless the viewer is the **commissioner** (who may target any roster).
- The `GET` state route returns full per-player rosters only for the viewer's own team to members;
  commissioners receive league-wide team rosters.
- `ask` additionally requires the AF War Room entitlement (`war_room_draft_strategy`).

## Runtime verification harness
Follow-up verification on 2026-06-13 added an idempotent seeded runtime fixture plus Playwright
coverage for the real browser/auth route chain:

- `scripts/seed-redraft-war-room-runtime.ts` seeds `rwr-runtime-nfl-redraft-league` with synthetic
  NFL redraft rosters, matchup context, projections, weekly stats, injuries, and news.
- Member login: `rwr_runtime_member` / `Password123!` (not AF-entitled, so Ask should lock).
- Commissioner login: `rwr_runtime_commish` / `Password123!` (seeded with `af_war_room`, so Ask
  should return 200 and then either grounded AI output or the safe AI-unavailable fallback).
- Outsider login: `rwr_runtime_outsider` / `Password123!` for access-control checks.
- `e2e/redraft-war-room-runtime.spec.ts` verifies the War Room tab/panel, real UI POST calls for
  lineup/waivers/trade-analyze/trade-find, member privacy, commissioner league-wide context,
  unauthenticated 401, entitlement behavior, and a mobile Spanish/dark-mode smoke path.

The spec is gated on `DATABASE_URL` plus `NEXTAUTH_SECRET` or `AUTH_SECRET`. In this local worktree it
was parse/list verified and executed as 4 skipped because those env vars were not present. That is an
environment gap, not a route/UI implementation failure.

## Decision: existing AI/trade routes (build requirement 9)
- `app/api/trade-evaluator/route.ts` and `app/api/legacy/trade/analyze/route.ts` are **dynasty /
  Sleeper + FantasyCalc** value engines. **Not reused** for redraft — they would inject dynasty
  values, violating the redraft guardrail. The War Room uses the new redraft-specific
  `redraftTradeEngine` instead.
- `lib/redraft/ai/*` stubs are **superseded** (left in place for the legacy `/api/redraft/ai/*`
  routes; not deleted to avoid breaking those endpoints).
- `app/api/chat/chimmy/route.ts` is the general assistant; the War Room `ask` is a focused,
  self-contained grounded endpoint rather than a Chimmy wrapper, to keep the no-invention contract tight.

## Route-structure decision
The originating production incident was the Vercel 2048-route limit. To add the War Room without
worsening it, the six logical POST endpoints are served by a single dynamic `[action]/route.ts`
(2 files total instead of 7). Behaviour matches the spec; the client helper exposes each operation.

## DB schema
**No schema changes.** All reads use existing models. No Prisma migration or Neon SQL required.

## Tests run
- **New:** `__tests__/redraft-war-room.test.ts` — 12 passing. Covers: team-needs detection of weak
  positions; structural-only flag when no value signal; lineup slot/FLEX handling; lineup
  low-confidence + missing-projection flagging; waiver drop-side + needs-provider flag; waiver adds
  when pool present (incl. FAAB suggestion); trade analyze accept on value+fit; trade
  `needs_more_data` with no signal; trade finder fit + needs-more-data; prompt grounding includes
  availability/missing-data/no-invention rules.
- **New:** `__tests__/redraft-war-room-panel.test.ts` - 2 passing. Covers panel rendering, tool
  button/client wiring for lineup/waivers/trade-analyze/trade-find, provider-limited waiver
  messaging, and AF entitlement lock messaging for Ask.
- **New:** `e2e/redraft-war-room-runtime.spec.ts` - Playwright DB/auth runtime harness. The spec
  lists and parses successfully; local execution skipped 4/4 without `DATABASE_URL` and auth secret.
- **Updated:** `__tests__/nfl-redraft-core-tab-bar.test.ts` now locks War Room into the compact NFL
  redraft tab bar.
- **Typecheck:** full repo `npm run typecheck` still has a pre-existing unrelated baseline. The new
  seed helper and E2E spec have no remaining touched-file type errors after the CSRF-token narrowing
  fix.
- **Lint:** `next lint --file ...` clean on touched/new files except pre-existing warnings in
  `LeagueShell.tsx` (hook dependency/no-img warnings). `git diff --check` clean.
- **Regression:** focused War Room/tab suites pass; full redraft/draft-room sweep is 31 files / 610
  tests passing (excluding only the playoff trade contract suite per the project restriction).

## Guardrails enforced
Redraft-only (no dynasty values, taxi/devy/C2C, or future picks); season-horizon trade/waiver
framing; sport carried through context so NFL/NCAAF pools never mix; commissioner-only league-wide
data not leaked to members; no fabricated stats/injuries/odds/news; injury = listed status only.

## Phase 2 TODOs
- Run `e2e/redraft-war-room-runtime.spec.ts` in CI/staging with real `DATABASE_URL` and auth secret
  before declaring full runtime clearance.
- Polished War Room dashboard UI (mobile-first redesign).
- **Free-agent / waiver pool provider integration** (unblocks add recommendations + FAAB optimizer with historical context).
- **Live stat / projection provider integration** (raises lineup/trade confidence to "high" league-wide).
- Player news/injury provider integration surfaced as content.
- Automated weekly matchup plan; rest-of-season & playoff-push plans.
- Trade finder across all teams with proposed asset packages.
- Playoff odds / probability engine.
- AI commissioner weekly league report.
- Notifications for waiver/trade/lineup recommendations.
- Subscription gating refinement for the AF War Room tier.
