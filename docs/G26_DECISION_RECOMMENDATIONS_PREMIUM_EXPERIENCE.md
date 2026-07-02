# G26 Decision Recommendations Premium Experience

Readiness remains unchanged:

- NFL Engine: 93%
- Overall Platform: 90%

## Implementation Summary

G26 adds a customer-facing Recommended Moves card using the premium Decision OS card architecture established by G24 League Pulse and reused by G25 Manager DNA.

This phase does not change recommendation algorithms, ranking logic, provider logic, Stage 1 soak behavior, backend routes, or league behavior. The new adapter only consumes existing Phase 6.4 recommendation outputs and existing presentation recommendation outputs.

## Reused Modules

- Phase 6.4 recommendation output:
  - `lib/decision-os/phase6/recommendations/types.ts`
- Existing recommendation presentation builder:
  - `lib/decision-os/presentation/recommendations.ts`
- Existing presentation contracts:
  - `lib/decision-os/presentation/types.ts`
- G24/G25 premium card pattern:
  - `components/decision-os/LeaguePulseCard.tsx`
  - `components/decision-os/ManagerDnaCard.tsx`

## Files Added Or Updated

- `lib/decision-os/recommendations.ts`
- `components/decision-os/DecisionRecommendationsCard.tsx`
- `app/dashboard/DashboardContent.tsx`
- `app/league/[leagueId]/tabs/LeagueTab.tsx`
- `app/commissioner-hub/CommissionerHubPageClient.tsx`
- `__tests__/decision-recommendations-premium.test.tsx`

## UI Surfaces

| Surface | Status | Notes |
| --- | --- | --- |
| Dashboard | Integrated | Reads recommendation output from existing dashboard payload when available; otherwise shows insufficient-data state. |
| League Home | Integrated | Shows a graceful insufficient-data state until the league shell receives recommendation output. |
| Commissioner Hub | Integrated | Uses the shared card without converting commissioner health strings into fake Phase 6.4 recommendations. |
| Team Page | Deferred | Team tab does not currently receive a Phase 6.4 recommendation set. |

## Customer Copy Boundary

The card intentionally avoids:

- internal recommendation IDs
- internal manager IDs
- internal league IDs
- backend terminology
- derivation jargon
- Decision OS terminology

It displays:

- Top three recommendations
- Priority
- Expected impact
- Difficulty
- Evidence
- Suggested action
- Confidence
- Completion status when available

## Screenshots Checklist

Browser screenshot proof is still dependent on local Playwright server readiness.

- Dashboard Recommended Moves card
- League Home Recommended Moves card
- Commissioner Hub Recommended Moves card
- Mobile stacked layout
- Light mode and dark mode readability

## Test Coverage

Passed:

- `npx vitest run __tests__/manager-dna-decision-os.test.tsx __tests__/decision-recommendations-premium.test.tsx`
  - 2 files passed
  - 6 tests passed
- Targeted parse checks for the G25/G26 adapters, cards, tests, and touched surfaces.

Browser proof:

- Dashboard smoke was extended to assert `decision-recommendations-card-dashboard`.
- Playwright was not rerun because `http://127.0.0.1:3101/api/auth/csrf` was not reachable, matching the prior local server-readiness blocker.

## Known Blockers

The local Playwright web server remains unavailable on port 3101 in this shell. This should not be treated as a recommendation-card regression unless a future healthy browser run reaches the dashboard and the card assertion fails.
