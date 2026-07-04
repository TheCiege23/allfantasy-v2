# Help & Knowledge Center

Implemented from the approved blueprint at
[`lib/commissioner-os/help/BLUEPRINT.md`](../../../lib/commissioner-os/help/BLUEPRINT.md) —
authored in response to a Phase 1.11 Discovery Report finding that, unlike
every other module built in this program, Help Center had **no**
blueprint, Architecture Index entry, Decision Ownership Matrix row,
implementation placeholder, platform contract, scaffolding, or anything
beyond a service-registry stub self-annotated as "not a designed feature."
This README documents what was actually built; the blueprint document
records the architecture decisions that unblocked building it.

## Ownership

Documentation hub, contextual help, operational guides, glossary,
onboarding resources, support articles, feature documentation, and
cross-module help links — never business intelligence, never another
module's data. A glossary entry for "League Health Score" explains the
concept in prose; it never renders a live score. Content only ever
references other modules via `relatedModuleIds`/`relatedLinks` — an id, a
label, an href back to the real thing — the identical
`CommissionerRelatedLink` shape every other cross-module reference in
this program already uses.

## Reachability — a real module, not a header overlay

Unlike Search and Notification Center (header-triggered overlays with no
`CommissionerModuleId`), Help & Knowledge Center is a real module:
`'help'` was added to `CommissionerModuleId`, with its own sidebar entry
in `COMMISSIONER_SECONDARY_NAV_ITEMS` (alongside Activity Stream) and its
own route. The blueprint's reasoning: a glossary and a catalog of guides
is a browsing job, not the quick in-and-out job a command-palette overlay
is built for.

The header's `HelpCircle` icon (`CommissionerHeader.tsx`) is a **plain
`next/link`** to `/commissioner-os/help` — deliberately not an
`openService('help')` call. Help Center never joins
`CommissionerPlatformProvider`'s `openServiceId` overlay state machine;
there is no overlay to open. `wrapMethod`'s first argument in the adapter
is a plain `CommissionerModuleId`, the same as Activity Stream and for the
identical reason — no `CommissionerErrorAttributableId` widening needed.

## Content model

Two distinct contract shapes
(`lib/commissioner-os/contracts/help.ts`), not one:

- **`CommissionerHelpArticleContract`** — `id, slug, title, category,
  summary, body, relatedModuleIds?, relatedLinks?, updatedAt`. Five
  categories: `getting-started | workflows | glossary | troubleshooting |
  module-guide`.
- **`CommissionerGlossaryTermContract`** — `id, term, definition,
  relatedModuleIds?`. Its own flat list, not an article category — a
  term/definition pair answers a different shaped question ("what does X
  mean") than an article ("how does X work").

`HelpClient` (`lib/commissioner-os/help/decision-os-client/types.ts`) is
two flat list-getters, `getArticles()`/`getGlossary()` — no
`getSummary()`, matching Activity Stream's "just the real list" shape,
not the aggregate modules' summary-card shape.

## Data

The demo catalog (`lib/commissioner-os/help/decision-os-client/demo.ts`)
is 15 real, authored articles and 10 glossary terms covering every one of
the ten modules that existed going into this phase (Mission Control,
League Health, Recommendations, Manager Intelligence, Workspace,
Automation Center, League Analytics, Reports, Search, Notification
Center) plus Activity Stream. This is **not** composed by awaiting other
modules' own demo clients the way Activity Stream's demo composes real
events — Help content is standalone authored prose *about* those modules,
never derived *from* their live data, so there is nothing to await. Each
article links out via `relatedLinks` where a single owning module applies;
Search and Notifications (platform services, not real `CommissionerModuleId`s)
have no formal `relatedLinks` entry for the same structural reason their
own adapter methods route through `CommissionerErrorAttributableId`
instead of `CommissionerModuleId` — their routes are still named in the
article's prose, just not a typed link.

`live.ts` is deliberately still an honest `upstream_unavailable`
placeholder rather than "serve the demo catalog unconditionally" — see the
blueprint §5 for why keeping `source: 'live'` meaning one consistent thing
across every namespace mattered more than the fact that Help content
happens to be static enough that it technically could always succeed.

## UI

`HelpCenterView.tsx` — a single local text filter (title/summary for
articles, term/definition for glossary terms, both narrowed together) plus
a category tablist (reusing the exact `role="tablist"`/`role="tab"`
pattern Activity Stream/Workspace/Recommendations already established,
only showing tabs for categories actually present in the data). Each
article renders via `HelpArticleCard.tsx`: summary always visible, full
body and related links revealed in place via a `Read more`/`Show less`
toggle — **not** a `/commissioner-os/help/[slug]` dynamic route. This
program has zero dynamic routes across all twelve implemented modules;
introducing one for Help Center alone would be a bigger structural change
than the content justifies. The `slug` field exists on the card's root
element as a DOM anchor (`id={article.slug}`), ready for future deep-link
wiring, but no hash-reading/auto-scroll behavior was built — that would be
scope beyond what this phase's acceptance criteria required.

Reused as-is: `EmptyState`, `LoadingState`, `ErrorState`, `PreviewDataBanner`,
`Card`/`CardHeader`/`CardTitle`/`CardContent` (`components/ui/card.tsx`),
`Badge` (`components/ui/badge.tsx`), `Input` (`components/ui/input.tsx`).
No new primitive was built for this module.

## Mission Control consumption rule

**Entry point only** — the shared header's `HelpCircle` link, present on
every Commissioner OS page including Mission Control. No
`adapter.help.getSummary()` method exists, no `SummaryCard` was added to
`MissionControlView.tsx`, and Mission Control's own client has no
help-related method (see the regression-guard test in
`__tests__/commissioner-os-help.test.tsx`). This mirrors Search's "consumes
entry points only" pattern, not Notifications'/Reports'/Analytics'/
Automation's `getSummary()` pattern — there is no daily-decision count
intrinsic to help content the way "2 critical risks" is meaningful for
League Health.

## Relationship to Search, Notifications, and Activity Stream

- **Search** indexes Help articles as one more source — see
  [Search's README](../search/README.md#a-small-additive-contract-change-this-phase-required)
  for the reverse-direction detail. Help Center has no dependency on
  Search.
- **Notifications**: no relationship, verified by a regression test —
  `demoNotificationsClient.getNotifications()` never returns a
  notification with `sourceModuleId: 'help'`. Publishing or editing help
  content never generates a notification.
- **Activity Stream**: no relationship, verified by a regression test —
  `demoActivityClient.getEvents()` never returns an event with
  `sourceModuleId: 'help'`. Documentation authorship isn't an operational
  event about a league; it's reference material about the product.

## Relationship to Settings

Settings owns configuration (toggles, thresholds, preferences — "how do I
configure X"); Help Center owns explanation ("what does X mean"). Neither
embeds the other's content; a future Settings screen may link out to a
Help article, never the reverse.

## Tests

`__tests__/commissioner-os-help.test.tsx` — client parity, live's
honest-error contract, demo content richness (multiple categories, more
than 5 articles, more than 3 distinct glossary terms), a structural check
that no article or term carries anything beyond its contract's own
fields, three dedicated ownership-boundary regression tests (Mission
Control has no help method; Activity Stream and Notifications never carry
a help-sourced item), and `HelpCenterView` behavior (banner, category
tablist filtering, the combined local text filter, expand/collapse with
related-link rendering, both empty states, both error/live-mode states).
`__tests__/commissioner-os-search.test.tsx` extended for the eighth
category. `__tests__/commissioner-os-adapter.test.ts`,
`__tests__/commissioner-os-shell.test.ts`, and
`__tests__/commissioner-os-contracts.test.ts` updated for the twelfth
namespace, the eleventh module id, and the eleventh feature-flag key
respectively.
