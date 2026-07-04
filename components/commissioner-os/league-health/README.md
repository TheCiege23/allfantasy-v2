# League Health

Owns all League Health intelligence — score, deduction breakdown, sub-
scores, risks, evidence, health-scoped recommendations. Mission Control's
League Health summary card links here; it never computes any of this
itself.

## Scope

Built as the Overview tab from the full League Health Blueprint (score,
deduction breakdown, sub-scores, risk table, evidence, recommendations).
The blueprint's other four tabs (Risk Analysis as its own destination,
Trends & Comparisons, the full Recommendations queue, Evidence & History)
are deferred — this is one complete, working vertical slice, not five
shallow ones. Trend charting specifically was already scoped out of the
Component Library for the same reason full charting was deferred there
— that gap is now filled by
[League Analytics'](../analytics/README.md) `TrendLineChart`/
`DistributionBarChart`, built there since League Analytics owns
historical trends while this module owns the current-condition score.

## A real bug found here, fixed at its actual source

Building this module's `demo.ts` surfaced a typecheck failure:
`CommissionerPlatformResponse.source` was typed `'live' | 'stub'` —
Demo Mode's `'demo'` value didn't exist yet when Platform Contracts was
first written. Fixed in `lib/commissioner-os/contracts/response.ts`
(now `'live' | 'demo' | 'stub'`, `CONTRACT_VERSION` bumped to `1.2.0`),
not worked around locally — the bug was in the shared contract, so the
fix belongs there.

## Data

`lib/commissioner-os/league-health/decision-os-client/` — stub, demo
("Iron Horse Dynasty," consistent with Mission Control's demo scenario),
and an honest live placeholder, mode-selected exactly like Mission
Control's client. `app/commissioner-os/league-health/page.tsx` no longer
calls `getLeagueHealthClient()` directly — it consumes `adapter.leagueHealth`
from the [Decision OS Adapter Layer](../../../lib/commissioner-os/adapter/README.md),
which also normalizes `tier`/risk `severity` against the real enum and
trims evidence points before this module's view sees them.
