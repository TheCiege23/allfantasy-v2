# AF War Room — Format Readiness

_Which league formats have a native, data-grounded War Room (context → deterministic
engines → consolidated routes → global-Chimmy grounding → frontend panel → DB-backed
runtime), versus what still routes through generic/strategy surfaces. Updated
2026-06-13._

## Legend

- **Native War Room** — dedicated `lib/<format>-war-room` context + pure engines +
  consolidated `GET` + `POST [action]` routes + Chimmy grounding adapter + in-league
  panel + `@db` runtime E2E.
- **Grounded (shared)** — uses a shared/connected decision context (e.g. Sleeper +
  FantasyCalc) rather than a native War Room.
- **Strategy/meta only** — generic War Room hub links (meta, mock draft, trade tools);
  no league-data-grounded panel yet.

## Status by format

| Format | Status | Notes |
| --- | --- | --- |
| **Redraft** | ✅ Native War Room | `lib/redraft-war-room` — context, needs/lineup/waiver/trade engines, routes, Chimmy grounding, panel, runtime E2E. Season horizon. |
| **Dynasty** | ✅ Native War Room | `lib/dynasty-war-room` — context (legacy `Roster` + dynasty ADP + ages + **real future picks**), team-direction/needs/buy-sell-hold/trade/waiver/lineup/pick-value engines, routes, Chimmy grounding, panel, runtime E2E. Multi-year horizon; **pick capital real** (`future_draft_picks`/`rookie_draft_windows` migrated 2026-06-14). |
| Dynasty (connected/Sleeper) | ☑ Grounded (shared) | `lib/league-decision-context` + `app/api/trade-evaluator` (FantasyCalc). The native War Room does not replace this for connected leagues. |
| **Keeper** | ✅ Native War Room | `lib/keeper-war-room` — context (redraft-season rosters + `KeeperEligibility`/`KeeperRecord` costs + redraft ADP), value/recommendation/cut-list/roster-needs/draft-plan/trade/trade-finder/waiver/lineup engines, routes, Chimmy grounding, panel, runtime E2E. Single-season horizon; keeper COST vs VALUE surplus drives recommendations. NO future picks. |
| Best Ball | ⛔ Strategy/meta only | Not started. |
| Guillotine | ⛔ Strategy/meta only | Has its own Chimmy settings context; no War Room panel. |
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

## Route budget

The dynasty + keeper War Rooms each cost **2** route files (`GET` + consolidated
`POST [action]`). Production-adjusted route signals: **1682** — GREEN (`green < 1900`).
No route bloat.

## Guardrails honored

No fabricated stats/projections/injuries/rankings/values/news/players. NFL and NCAAF
pools never mix (sport carried through every query). Members see only their own
private roster/pick analysis unless they are the commissioner; the `GET` route strips
other teams' players + picks for non-commissioners. Secrets are never printed/committed.
