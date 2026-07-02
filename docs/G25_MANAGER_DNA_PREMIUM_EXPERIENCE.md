# G25 Manager DNA Premium Experience

Readiness remains unchanged:

- NFL Engine: 93%
- Overall Platform: 90%

## Implementation Summary

G25 adds a customer-facing Manager DNA presentation slice using the premium card pattern established by G24 League Pulse.

This phase does not change Manager DNA algorithms, classifiers, provider logic, Stage 1 soak behavior, or backend routes. The new adapter only consumes existing Phase 6.2 Manager DNA outputs and converts them into customer-safe presentation data.

## Reused Modules

- Phase 6.2 Manager DNA profile output:
  - `lib/decision-os/phase6/dna/types.ts`
- Existing presentation card output:
  - `lib/decision-os/presentation/types.ts`
- G24 visual pattern:
  - `components/decision-os/LeaguePulseCard.tsx`

## Files Added Or Updated

- `lib/decision-os/manager-dna.ts`
- `components/decision-os/ManagerDnaCard.tsx`
- `app/dashboard/DashboardContent.tsx`
- `app/league/[leagueId]/tabs/LeagueTab.tsx`
- `app/commissioner-hub/CommissionerHubPageClient.tsx`
- `__tests__/manager-dna-decision-os.test.tsx`

## UI Surfaces

| Surface | Status | Notes |
| --- | --- | --- |
| Dashboard | Integrated | Reads Manager DNA from existing dashboard payload when available; otherwise shows insufficient-data state. |
| League Home | Integrated | Shows a graceful insufficient-data state until the league shell receives a Manager DNA payload. |
| Commissioner Hub | Integrated | Shows the shared card without adding commissioner-only classification logic. |
| Team Page | Deferred | Team tab does not currently receive a Manager DNA output. Adding an empty card there would add noise to the roster workflow. |

## Customer Copy Boundary

The card intentionally avoids:

- internal manager IDs
- internal league IDs
- backend terminology
- classifier jargon
- Decision OS terminology

It displays:

- Primary Manager Identity
- Decision Style
- Transaction Style
- Risk Tendency
- Engagement Reliability
- Confidence
- Supporting Evidence
- Top Traits
- Recommended Coaching Focus

## Screenshots Checklist

Browser screenshot proof is still dependent on the local Playwright server becoming healthy.

- Dashboard Manager DNA card
- League Home Manager DNA card
- Commissioner Hub Manager DNA card
- Mobile stacked layout
- Light mode and dark mode readability

## Test Coverage

Passed:

- `npx vitest run __tests__/manager-dna-decision-os.test.tsx __tests__/decision-recommendations-premium.test.tsx`
  - 2 files passed
  - 6 tests passed
  - 1 Manager DNA snapshot written
- Targeted parse checks for the G25/G26 adapters, cards, tests, and touched surfaces.

Browser proof:

- Dashboard smoke was extended to assert `manager-dna-card-dashboard`.
- Playwright was not rerun because `http://127.0.0.1:3101/api/auth/csrf` was not reachable, matching the prior local server-readiness blocker.

## Known Blockers

The local Playwright web server remains unavailable on port 3101 in this shell. This is unrelated to Manager DNA unless a future healthy browser run reaches the dashboard and the card assertion fails.
