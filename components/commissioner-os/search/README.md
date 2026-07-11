# Global Search & Command Palette

A platform service, not a business module — per its own placeholder
description, it owns the search experience, command execution, and
navigation shortcuts, but it never owns recommendations, managers, tasks,
reports, or automations. It only provides fast access to them. There is
no `CommissionerModuleId` for search (it has no sidebar entry, per
`lib/commissioner-os/navigation/moduleNav.ts`'s own comment), and Mission
Control gets no summary-card retrofit here, unlike Reports/Analytics/
Automation Center — the task's own wording ("Mission Control consumes
search entry points only") is deliberately different from those modules'
("consumes summaries only"). Mission Control consumes the entry point the
same way every Commissioner OS page does: the header's search button and
the ⌘K/Ctrl+K shortcut are shell-level, not Mission-Control-specific.

## A repository discovery finding this phase had to resolve, not just note

`lib/search/` already exists — a mature, shipped, whole-app command
palette (`UniversalSearchService`, `SearchOverlayController`,
`SearchOverlay`) for the existing app's dashboard/webapp/tools/leagues/
players, reached via a header icon and ⌘K. `lib/commissioner-os/platform/README.md`
(written back in Phase 0.3) anticipated this collision and said
Commissioner OS's search work "should extend this mechanism with new
result categories... not duplicate its overlay and keyboard-shortcut
plumbing."

That guidance was written before this phase confirmed a load-bearing
fact: **Commissioner OS's own layout never mounts `lib/search`'s overlay
system at all.** `ResponsiveNavSystem` / `GlobalTopNav` — the components
that own `lib/search`'s overlay and its ⌘K listener — are not present
anywhere under `app/commissioner-os/`. Commissioner OS is a fully
self-contained shell (its own nav model, its own feature flags, per
`components/commissioner-os/README.md`'s own "what this is not" section)
that never renders the app's main shell chrome. There is no existing ⌘K
listener or overlay already running on Commissioner OS routes to extend —
extending `lib/search` for real would mean modifying shared, whole-app
files (`SearchResultResolver.ts`, `SearchOverlay.tsx`, `ResponsiveNavSystem.tsx`)
to inject Commissioner-OS-only, Demo-Mode-aware categories into a system
those files serve for the entire rest of the app. That is a materially
bigger change than "implement Commissioner OS's Global Search," and it
conflicts with "do not redesign architecture."

**Resolution:** this phase built Commissioner OS's own, self-contained
command palette, and reused what Phase 0.4 had already set aside for
exactly this purpose instead — `components/ui/command.tsx`, the `cmdk`
wrapper flagged back then as "directly relevant to the future Search
integration" but left unused until now. `lib/search/` is untouched; the
two systems remain deliberately separate. A genuine future unification is
still possible (Search's own `CommissionerSearchResultContract`, in
Platform Contracts, was already shaped for exactly that
compatibility — see `lib/commissioner-os/contracts/searchResults.ts`'s
comment), but it is out of scope here and would need its own ADR given
the shared-file footprint it implies.

## Ownership

Unified search experience, indexed navigation, cross-module discovery,
command palette, recent searches, search categories, keyboard shortcuts,
and search result presentation. Search results reference existing module
entities via `CommissionerSearchResultContract` (`id`, `category`,
`title`, `href`, `sourceModuleId`) — never a second copy of a
recommendation's rationale, a task's description, or any other module's
underlying data.

## How the index is built

`adapter.search.getIndex()` is one method, not `search(query)` — the
full cross-module index is small, in-memory, and safe to fetch once;
matching a typed query against it is `cmdk`'s own job (`shouldFilter`),
not logic this program should duplicate. The demo implementation
(`lib/commissioner-os/search/decision-os-client/demo.ts`) builds the
index by **awaiting each other module's own demo client** — recommendations,
managers, tasks, automations, report templates, and (added in Phase 1.11)
help articles — and projecting only `{id, title}` out of each real entity
into a search result. This file holds no second copy of any of that data;
it only ever reads a title back out of the module that already owns it.
`page` results come from the existing `COMMISSIONER_ALL_NAV_ITEMS` (indexed
navigation, literally). `setting` results are the five sub-areas Settings'
own placeholder text already names (league identity, constitution, rules,
integrations, roles) — not fabricated, since Settings itself isn't built
yet and has no real entities to reference beyond that.

**Phase 1.11 note:** Help & Knowledge Center's articles are the first
addition to this index since the original seven categories — a small,
additive `'help'` member on `CommissionerSearchResultCategory`
(`lib/commissioner-os/contracts/searchResults.ts`), following the exact
pattern every prior category addition used. The direction stays the same
as every other source: Search reaches into
[Help Center's](../help/README.md) own demo client, never the reverse —
Help Center has no dependency on Search at all. Every help result's `href`
points at `/commissioner-os/help` (not a per-article deep link) — this
program has no dynamic routes anywhere, and Help Center's own "in-place
detail" design (see its README) means a search result can only ever land
a commissioner on the Help Center page itself, not scrolled to a specific
article.

## Where the UI lives

- `CommissionerSearchPalette.tsx` — `Dialog` (from `components/ui/dialog.tsx`)
  wrapping `Command`/`CommandInput`/`CommandList`/`CommandGroup`/`CommandItem`
  (from `components/ui/command.tsx`). Open/closed state is
  `useCommissionerPlatform()`'s existing `openServiceId === 'search'` —
  the exact mechanism Phase 0.3 built for this ("holds the UI-open/closed
  state for whichever platform service overlay is active") and which
  nothing had used until now. Registers its own ⌘K/Ctrl+K `keydown`
  listener; mounted once in `app/commissioner-os/layout.tsx`, which is
  now `async` and fetches `adapter.search.getIndex()` the same way every
  module page fetches its own data — the layout stays mounted across
  navigations between sibling module pages, so this is genuinely a
  once-per-session fetch, not once per page.
- `useRecentSearches.ts` — localStorage-backed, mirroring
  `CommissionerLayoutProvider`'s exact persistence pattern (same
  key-prefix convention, same window-guard, same silent try/catch).
  Recent searches are recently-*selected results*, not recently-typed
  query strings — clicking one jumps straight back to that item.
- `components/commissioner-os/shell/CommissionerHeader.tsx`'s "Search"
  affordance is now a real button calling `openService('search')`
  (previously a dead `Link` to the placeholder route).
- `app/commissioner-os/search/page.tsx` still resolves as a
  direct-linkable route (its own placeholder's requirement) — it opens
  the same palette on mount and shows a minimal fallback with a manual
  "Open Search" button if dismissed without navigating away. It fetches
  nothing itself; the layout already did.

## A small, additive contract change this phase required

`CommissionerErrorContract.moduleId` was typed `CommissionerModuleId` —
a closed union Search deliberately isn't a member of. Routing Search's
errors through the adapter's existing `wrapMethod`/`normalizeErrorContract`/
logging pipeline without lying to the type system meant widening that one
field to a new `CommissionerErrorAttributableId = CommissionerModuleId | 'search'`
(`lib/commissioner-os/contracts/errors.ts`). This is additive only — every
other module's calls are unaffected, and Platform Contracts' own
versioning policy explicitly treats "a new union member" as a non-breaking
change. `normalizeErrorContract`, `errorFromException`, and
`CommissionerAdapterLogEvent` were widened to match; `wrapMethod` itself
is unchanged beyond its parameter's type.

## A gap closed in the Phase 2 production-hardening audit

`CommissionerSearchPalette` didn't distinguish a genuinely empty query
result from `adapter.search.getIndex()` itself failing (e.g. live mode) —
both silently rendered the same `cmdk` "No results found." empty state,
the one inconsistency with every other module's honest `ErrorState` in
that situation. Fixed additively: an `errorMessage?: string | null` prop,
threaded from `app/commissioner-os/layout.tsx` the same way every module
page already threads its own error message, rendering `ErrorState` in
place of the whole `Command`/results list when present.

## Tests

`__tests__/commissioner-os-search.test.tsx` — client parity, live's
honest-error contract, index category coverage (all eight categories
present, page count matches nav items exactly, help results always link
to `/commissioner-os/help`), the "never more than the five contract
fields" structural check, palette open/closed gating,
category-grouped rendering, `cmdk`'s own filtering, the empty-results
state, select-to-navigate-and-close, Recent populating after a selection,
Escape, the ⌘K shortcut, and (added in the Phase 2 audit) `ErrorState`
rendering instead of the command list when the fetch itself failed.
`__tests__/commissioner-os-adapter.test.ts` extended for the ninth
namespace and this phase's import hygiene
(including a dedicated check that the direct-link search page itself
never reaches into a per-module client).

Two jsdom gaps surfaced while writing these tests — `ResizeObserver` and
`Element.prototype.scrollIntoView`, both used internally by `cmdk` and
neither implemented by jsdom. Both are stubbed once in the shared
`vitest.setup.ts`, since any future command-palette-style test in this
repo would hit the identical gap, not something specific to this test
file.
