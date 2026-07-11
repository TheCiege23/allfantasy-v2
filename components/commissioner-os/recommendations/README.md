# Recommendations Center

Owns the full recommendation lifecycle — priority, evidence, confidence,
status, actions — for every recommendation in the product, regardless of
which module generated it. Mission Control previews a filtered, top-3
subset of this same data; League Health previews its own health-scoped
subset. Neither computes recommendations itself, and neither defines its
own recommendation shape — both consume `CommissionerRecommendationContract`
from Platform Contracts, the same type this module's client returns.

## A retrofit, not just a new module

Mission Control originally had its own ad hoc `RecommendationSummary` type
and `getRecommendationsPreview()` method on its Decision OS client — built
in Phase 1.0, before Recommendations Center existed. Building this module
meant deleting that duplicate entirely (not deprecating it, not routing
around it) from `lib/commissioner-os/decision-os-client/{types,stub,demo,live}.ts`,
and rewiring `app/commissioner-os/page.tsx` and `MissionControlView.tsx` to
fetch from `getRecommendationsClient()` instead, filtered to non-terminal
statuses and sliced to 3. This is the Decision Ownership Matrix rule
("Do not duplicate recommendation logic") enforced as an actual code
change, not just a principle — see `lib/commissioner-os/decision-os-client/README`
history and the Mission Control test suite's explicit regression check
(`Mission Control's own client no longer has a recommendations method`).

## Scope

One flat queue, two views selected by a tablist: **Queue** (non-terminal
statuses — `new`, `viewed`, `in_progress`, `deferred`, `automated`) and
**History** (terminal statuses — `completed`, `dismissed`, `expired`,
`resolved`). Sorted by severity rank (critical → elevated → standard →
advisory → positive), never grouped by category — urgency outranks
categorical organization, per Recommendations Center Blueprint §20.

Lifecycle status is rendered as a workflow-neutral badge (`STATUS_LABELS`
in `RecommendationCard.tsx`), deliberately never severity-colored — status
answers "where is this in its workflow," severity answers "how urgent is
this," and conflating the two into one color channel was an explicit
anti-pattern called out in the Design Language's Status Language section.

Deferred out of this slice: bulk actions, per-recommendation evidence
drill-in (the card's `onViewEvidence` hook exists but is unwired here —
League Health's Overview tab is the only current consumer that wires it),
filtering/search within the queue, and automation hand-off UI (Automation
Center's own future module).

## Data

`lib/commissioner-os/recommendations/decision-os-client/` — stub (single
fixture), demo (four recommendations spanning `new`/`in_progress`/
`automated`/`deferred`, deliberately mixed rather than all-`new`, so
lifecycle handling is genuinely exercised), and an honest live placeholder
returning a typed `upstream_unavailable` error. Mode-selected exactly like
every other Commissioner OS client, via `getRecommendationsClient()` and
`resolveServerDataMode()`.

## Tests

`__tests__/commissioner-os-recommendations.test.tsx` — client parity
across stub/demo/live, live's honest-error contract, Queue/History
filtering and severity sort order, tab `aria-selected` state, status-badge
rendering, both empty states, and `PreviewDataBanner` mode-gating
(hidden in `live`).

## Adapter migration

`app/commissioner-os/recommendations/page.tsx` and Mission Control's page
no longer call `getRecommendationsClient()` directly — both consume
`adapter.recommendations` from the [Decision OS Adapter Layer](../../../lib/commissioner-os/adapter/README.md),
which normalizes every recommendation's `severity`/`confidence` against
the real enums before either view sees them. This client's own stub/demo/
live implementations are unchanged and still the source of truth for
this module's fixtures — the adapter composes them, it doesn't replace
them.
