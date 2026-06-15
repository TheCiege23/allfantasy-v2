# AF War Room — Format Readiness

_Which league formats have a native, data-grounded War Room (context → deterministic
engines → consolidated routes → global-Chimmy grounding → frontend panel → DB-backed
runtime), versus what still routes through generic/strategy surfaces. Updated
2026-06-14._

## Legend

- **Native War Room** — dedicated `lib/<format>-war-room` context + pure engines +
  consolidated `GET` + `POST [action]` routes + Chimmy grounding adapter + in-league
  panel + `@db` runtime E2E.
- **Grounded (shared)** — uses a shared/connected decision context (e.g. Sleeper +
  FantasyCalc) rather than a native War Room.
- **Strategy/meta only** — generic War Room hub links (meta, mock draft, trade tools);
  no league-data-grounded panel yet.

## Current focus lock

Survivor is the active specialty-format build. It should not receive a native War Room
until the core Survivor product is fully set up on frontend and backend: creation,
draft-to-tribe bootstrap, idols/powers, challenges, private voting, reveal, Exile, jury,
finale, anti-cheat privacy, media, AI grounding, and DB-backed runtime. See
`docs/survivor-full-concept-audit.md`, `docs/survivor-full-product-spec.md`,
`docs/survivor-implementation-plan.md`, and `docs/survivor-runtime.md`.

Progress: Phase 1 (privacy + canonical settings) and Phase 2 (tribe assignment, tribe/league
chats, host intro, hidden Vote Shield idol seeding, with role-aware privacy) are COMPLETE and
DB-runtime verified — see `docs/survivor-phase-2-tribes-idols-chat.md`. Still required before a
native Survivor War Room: powerup RESOLUTION, challenges, vote reveal/tally, Exile, jury, and
finale engines. Survivor remains "strategy/meta only" until those land.

## Status by format

| Format | Status | Notes |
| --- | --- | --- |
| **Redraft** | ✅ Native War Room | `lib/redraft-war-room` — context, needs/lineup/waiver/trade engines, routes, Chimmy grounding, panel, runtime E2E. Season horizon. |
| **Dynasty** | ✅ Native War Room | `lib/dynasty-war-room` — context (legacy `Roster` + dynasty ADP + ages + **real future picks**), team-direction/needs/buy-sell-hold/trade/waiver/lineup/pick-value engines, routes, Chimmy grounding, panel, runtime E2E. Multi-year horizon; **pick capital real** (`future_draft_picks`/`rookie_draft_windows` migrated 2026-06-14). |
| Dynasty (connected/Sleeper) | ☑ Grounded (shared) | `lib/league-decision-context` + `app/api/trade-evaluator` (FantasyCalc). The native War Room does not replace this for connected leagues. |
| **Keeper** | ✅ Native War Room | `lib/keeper-war-room` — context (redraft-season rosters + `KeeperEligibility`/`KeeperRecord` costs + redraft ADP), value/recommendation/cut-list/roster-needs/draft-plan/trade/trade-finder/waiver/lineup engines, routes, Chimmy grounding, panel, runtime E2E. Single-season horizon; keeper COST vs VALUE surplus drives recommendations. NO future picks. |
| **Best Ball** | ✅ Native War Room | `lib/best-ball-war-room` — context (legacy `Roster` draft roster + best-ball profile + redraft ADP + real weekly-score ceiling + `SportsPlayer.team` stacks), construction/depth/upside/draft-plan/stack/risk/waiver(if on)/trade(if on) engines, routes, Chimmy grounding, panel, runtime E2E. DRAFT-ONLY, AUTOMATIC lineup — NO start/sit. |
| **Guillotine** | ✅ Native War Room | `lib/guillotine-war-room` — context (`getDangerTiers` elimination line + `GuillotineRosterState`/`GuillotinePeriodScore` + legacy `Roster` FAAB + `GuillotineWaiverRelease` dropped pool + redraft ADP/projections), survival-risk/roster-risk/lineup-safety/FAAB/waiver/dropped-player/trade(if on)/weekly-plan engines, routes, Chimmy grounding, panel, runtime E2E. SURVIVAL-FIRST. |
| Tournament / Survivor / Zombie / Big Brother | ⛔ Strategy/meta only | Each has a Chimmy settings/context adapter; no native War Room. |
| Salary Cap | ⛔ Strategy/meta only | Chimmy settings adapter only. |
| Devy / C2C / Merged Devy-C2C | ⛔ Strategy/meta only | Chimmy settings adapters; dynasty War Room covers the dynasty-variant rosters where `isDynasty`/`devy_dynasty`/`merged_devy_c2c`. |
| IDP | ⛔ Strategy/meta only | Chimmy settings adapter only. |

## Dynasty vs redraft — key differences (by design)

- **Value**: dynasty uses long-term asset value (`AllFantasyAdpSnapshot`
  `leagueType='dynasty'`) + **age trajectory** (position-specific curves), NOT weekly
  projections / season points. Redraft short-season logic is never used for dynasty
  asset-value decisions.
- **Direction**: dynasty adds a **contention-window** engine (contend / rebuild /
  middle) driven by record + starter age; it powers buy/sell/hold and trade-finder
  partner matching (contenders ↔ rebuilders).
- **Picks**: future draft picks are **real** (`future_draft_picks`/`rookie_draft_windows`
  migrated 2026-06-14) and priced by a deterministic structural **tier** (round + years
  out), never a fabricated market value. Engines (direction, buy/sell/hold, trade
  analyze/find) are pick-aware; the panel shows a pick-capital card. Truthful states:
  `available` / `available_empty` / `missing`. See `docs/dynasty-pick-capital-audit.md`.
- **Lineup**: dynasty start/sit is explicitly **low confidence** (value/ADP proxy, no
  weekly projections) and is most useful for contenders.

## Keeper vs redraft/dynasty — key differences (by design)

- **Value surplus, not raw value**: keeper keeps/cuts hinge on `keeperCostRound − adpRound`
  — keep players whose ADP value far exceeds their keeper cost. Pure redraft ignores cost;
  dynasty uses multi-year value. Keeper is its own model.
- **Cost source is real**: `KeeperEligibility` → `KeeperRecord` (round/auction). Missing
  cost → limited-data state, never fabricated. Auction surplus is not invented.
- **Draft plan after keepers**: kept players consume their cost rounds (round-based); the
  plan targets remaining needs. NO future picks / dynasty pick capital (keeper disables them).
- **Data layer**: keeper reuses the redraft-season roster layer + redraft ADP + redraft
  providers, then layers keeper cost/eligibility on top.

## Best ball vs the others — key differences (by design)

- **AUTOMATIC lineup — NO start/sit**: best ball auto-selects the optimal lineup each
  scoring period. The War Room has no lineup/start-sit action (the route 404s), the panel
  shows an auto-lineup explainer, and the AI is instructed to pivot start/sit questions to
  construction/depth/ceiling.
- **Construction over weekly management**: engines focus on roster construction, depth
  (fragility), spike-week CEILING, draft plan, and STACK/CORRELATION (same-team groupings
  from `SportsPlayer.team`). Ceiling uses real max weekly scores (`high`) or an ADP proxy
  (`low`, flagged) — never fabricated.
- **Waivers/trades only when enabled**: most best-ball leagues are draft-only
  (`settings.best_ball_settings` defaults OFF) — those actions return a truthful disabled
  state and the buttons are disabled. NO future picks.
- **Data layer**: legacy `Roster` draft roster + best-ball profile (auto-lineup slots +
  recommended sizes) + redraft ADP + `weeklyScore` + `SportsPlayer` enrichment.

## Guillotine vs the others — key differences (by design)

- **SURVIVAL-FIRST, not standard strategy**: each scoring period the lowest team(s) are
  CHOPPED. Every recommendation prioritizes NOT finishing last — safe weekly FLOOR + a
  positive projected safety margin over ceiling, EXCEPT when in/near the chop zone where a
  ceiling swing can be worth the variance to survive.
- **Elimination line is real, never faked**: `getDangerTiers` (chop_zone/danger/safe +
  `pointsFromChopZone`) from `GuillotinePeriodScore`; `limited` when no scores exist.
- **FAAB discipline**: conserve when safe; spend aggressively only when survival is at risk
  (the FAAB engine scales bid aggressiveness by danger tier; qualitative when budget unknown).
- **Eliminated-team dropped pool**: `GuillotineWaiverRelease` is often the best waiver value;
  surfaced when present, `limited` otherwise. Trades default OFF (truthful disabled state).
- **Data layer**: `getGuillotineConfig` + `GuillotineRosterState`/`GuillotinePeriodScore` +
  legacy `Roster` (lineup/FAAB) + redraft ADP/projections/injuries.

## Route budget

The dynasty, keeper, best-ball, and guillotine War Rooms each cost **2** route files (`GET` +
consolidated `POST [action]`). Production-adjusted route signals: **1686** — GREEN
(`green < 1900`). No route bloat.

## Guardrails honored

Survivor route gate: after any Survivor route work, run
`node scripts/audit-route-budget.cjs` and keep new gameplay actions inside the
consolidated league-scoped Survivor route dispatcher.

No fabricated stats/projections/injuries/rankings/values/news/players. NFL and NCAAF
pools never mix (sport carried through every query). Members see only their own
private roster/pick analysis unless they are the commissioner; the `GET` route strips
other teams' players + picks for non-commissioners. Secrets are never printed/committed.
