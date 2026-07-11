# Reports

Scheduled, shareable, printable packaging of intelligence already owned
elsewhere — never a second copy of the underlying data. A `GeneratedReport`
carries only a human-readable `summary` string and `relatedLinks` back to
whichever module actually owns the numbers (League Health, Manager
Intelligence, League Analytics, and so on); it never embeds that module's
raw data. This constraint came directly from the module's own placeholder
description and shaped every type in `decision-os-client/types.ts`.

## Ownership

Scheduled reports, executive report generation, PDF/CSV export, report
templates, report history, report status, report sharing, and report
metadata. Mission Control consumes only `adapter.reports.getSummary()` —
the same "Mission Control renders, never recomputes" pattern already
established for Automation Center and League Analytics.

## Real, working actions — not represented placeholders

Three interactions in this module are genuinely wired, not
represented-but-inert buttons:

- **Generate Report** adds a `generating` entry to history that
  transitions to `ready` after a short simulated delay — the same "Demo
  Mode should look and behave convincingly" reasoning Automation Center's
  enable/disable toggle already established.
- **Share / Unshare** toggles local state and produces/removes a
  deterministic `https://allfantasy.ai/r/{id}` link — pure client state,
  no backend required.
- **Download PDF / Download CSV** genuinely serialize the report's
  already-in-memory metadata and summary via `jspdf` (an existing project
  dependency, previously unused elsewhere) and the shared CSV primitives —
  see below.

None of these needed a real Decision OS backend: all three operate purely
on data the page already fetched.

## Shared CSV utilities, promoted

`lib/commissioner-os/utils/csv.ts` is a new top-level shared location for
`escapeCsvValue`, `csvRow`, and `downloadTextFile` — promoted out of
League Analytics' `exportCsv.ts` once Reports needed the identical CSV
serialization/download logic. Per the Repository Discovery Rules'
decision table, this was a "Create freely" case (a `platform/` location
would have been thematically wrong for a generic string-escaping utility)
rather than a duplication or a forced merge. League Analytics'
`buildAnalyticsCsv` / `downloadAnalyticsCsv` public API is unchanged — it
now imports the same primitives instead of defining its own.

`lib/commissioner-os/reports/exportUtils.ts` builds on those primitives
for `buildReportCsv` (the pure, directly-unit-tested half) and
`downloadReportCsv` / `downloadReportPdf` (the thin, impure browser-only
triggers) — the same pure/impure split League Analytics' own export
already used.

## Data

`lib/commissioner-os/reports/decision-os-client/` — stub, demo (four
templates spanning weekly/monthly/manual schedules; five history entries
spanning `ready`/`generating`/`failed` statuses, continuing the "Iron
Horse Dynasty" narrative), and an honest live placeholder for all three
methods (`getTemplates`, `getHistory`, `getSummary`). Consumed exclusively
through `adapter.reports` — neither this module's page nor Mission Control
imports `lib/commissioner-os/reports/decision-os-client` directly.

## Tests

`__tests__/commissioner-os-reports.test.tsx` — client parity, live's
honest-error contract, the demo summary's internal consistency with its
own history/templates, every status rendering correctly (ready/generating/
failed), CSV field-count and escaping correctness, the Generate Report
local-state transition (fake timers, scoped to that one test only), the
View dialog's content/export/share affordances, the Share/Unshare
round-trip, the failed-report failure-reason display, and both error
states. `__tests__/commissioner-os-adapter.test.ts` extended for the
eighth namespace and this page's import hygiene.
