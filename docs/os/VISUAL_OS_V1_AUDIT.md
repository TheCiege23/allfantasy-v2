# Visual OS V1 — Surface Audit (Phase V1.0, Step 1)

Audit of the customer-facing Commissioner OS and Manager OS surfaces before any redesign work, per the
phase's own "audit before coding" instruction. Findings below are all verified directly — either by
reading the real component source, or (for the 2 contrast bugs) by live browser inspection of computed
CSS on the actual dev server, not by visual impression alone.

## Surfaces inspected

`/commissioner-hub` (`CommissionerHubPageClient.tsx` + `CommissionerShowcasePanel.tsx` +
`components/decision-os/*`), `/manager-hub` (`ManagerHubPageClient.tsx` +
`ManagerCommandCenterSection.tsx`), and all 16 `components/decision-os/` card components (Multi-League
Overview, Today's Brief, Attention Queue, Notification Center, League Health Ranking, League Switcher,
Priority Modules, League Context, Mission Control, League Analytics, User OS, League Pulse, Manager DNA,
Decision Recommendations), plus the shared primitives file (`DecisionOsCardPrimitives.tsx`) and the
app's design-token layer (`app/globals.css`, `tailwind.config.js`).

## Finding 1 (real, verified) — two competing visual languages on the same page

`components/decision-os/*` already has a real, working shared primitive system:
`decisionOsCardClassName` (built on the app-wide `.card-premium` shell, which itself resolves to
theme-aware CSS variables — `var(--surface-card)`, `var(--border-subtle)`, `var(--text-primary)`), plus
`DecisionOsBadge`, `DecisionOsPanel`, `DecisionOsEmptyState`, `DecisionOsConfidenceBadge`,
`DecisionOsEvidenceGrid`, `DecisionOsTrustNote`, `DecisionOsWhyPanel`, `DecisionOsInsufficientDataCallout`,
`DecisionOsUpdatedStamp`. `CommissionerCommandCenterSection.tsx` / `ManagerCommandCenterSection.tsx` (the
Multi-League Overview) and most of the individual cards (League Analytics, User OS, Manager DNA, Decision
Recommendations) build on this consistently.

But `CommissionerHubPageClient.tsx` — the page these Decision OS cards are embedded IN — predates this
system and never migrated onto it. It defines its own one-off visual language per section: a hero with a
hardcoded amber/cyan gradient, `StatCard`/`MetricTile` components with inline `accentClass`/`borderClass`
props, a violet-gradient "Commissioner AI Prompts" grid, an emerald-gradient "Migration Center" grid, and
`CommissionerShowcasePanel` (a full dark-navy-gradient "island" — see Finding 3). None of these route
through `decisionOsCardClassName` or the app's semantic color tokens; each reinvents its own card shell
and its own ad hoc `amber-500`/`cyan-500`/`emerald-500`/`violet-500` palette. The result, confirmed live
in browser: a page that reads as roughly 6 visually distinct sub-products bolted together rather than one
coherent command center — the exact "collection of disconnected AI cards" problem this phase names.

`ManagerHubPageClient.tsx`, by contrast, is clean: built fresh in OS-C1 with zero legacy content, it is
just a minimal hero plus `ManagerCommandCenterSection`, entirely on shared primitives already.

## Finding 2 (real, verified) — duplicated tone/severity color logic across 4 components

An Explore-agent pass over all 16 `components/decision-os/` files (cross-checked directly) found the
same "map a severity/status/priority level to a border+background+text color triad" logic hand-rolled
independently in 4 places, each with its own local color table:
- `MissionControlCard.tsx` — `overallStatusClass` record (emerald/amber/rose)
- `LeaguePulseCard.tsx` — `toneClass` record + a separate `statusClasses()` function (emerald/amber/rose)
- `DecisionRecommendationsCard.tsx` — `priorityClass()` function (rose/amber/cyan)
- `CommissionerAttentionQueue.tsx` — inline severity-to-border/background mapping (rose/orange/amber/sky/emerald)

`DecisionOsCardPrimitives.tsx` already has `SEVERITY_DOT_CLASS` (a severity→dot-color map) but nothing
that produces a full badge/card-tone treatment — so each component re-derives its own version of the same
concept instead of sharing one. `CommissionerHubPageClient.tsx` has 2 more independent copies of the same
pattern (`HEALTH_STATUS_CLASSES`, `ACTION_TONE_CLASSES`, `MIGRATION_STATUS_CLASSES`).

## Finding 3 (real, verified live via browser + computed CSS) — a genuine light-mode legibility bug

`CommissionerShowcasePanel.tsx` ("Platform Readiness Snapshot") hardcodes a dark background
(`bg-gradient-to-br from-violet-500/[0.08] via-[#08101f] to-cyan-500/[0.04]`) and white/opacity text
(`text-white`, `text-white/78`, `text-white/55`, etc.) regardless of the user's theme. The app defaults to
**light mode** (`:root` in `globals.css` sets `--bg: #F7F8FB`, `--panel: #FFFFFF`), and this app has an
existing global accessibility guard for exactly this situation:
```css
html[data-mode="light"] .mode-readable [class*="text-white"] { color: var(--text) !important; }
```
This guard forces any `text-white*` class back to near-black in light mode — necessary elsewhere, but it
only touches `color`, not `background`. The panel's *background* stays dark navy while its *text* gets
force-flipped to near-black, producing near-black-on-near-black text. Verified live: navigated to
`/commissioner-hub` in light mode (the default), inspected the panel's own `<h2>` — computed
`color: rgba(2, 6, 23, 0.92)` (i.e. `var(--text)`, near-black) against a dark-navy gradient background.
Screenshot confirms card values like "Preview ready" / "17,257" / the panel headline are genuinely hard to
read. **This is a real accessibility defect on the flagship candidate page, not a style preference.**

## Finding 4 (real, verified live via browser + computed CSS) — a second, unrelated contrast bug

Independently of Finding 3: the hero's "Presentation-safe preview" callout
(`CommissionerHubPageClient.tsx`) uses `text-cyan-200/75` on a `bg-cyan-500/[0.08]` background. Verified
live: computed color is `rgba(165, 243, 252, 0.75)` — a light cyan meant for a dark background — rendered
on a near-white/light-cyan-tinted card in light mode. Not covered by the `mode-readable` guard (which only
matches `text-white*`). Confirmed via screenshot on both desktop and mobile viewports: the callout body
text is close to unreadable.

## Finding 5 (real) — redundant league-list/status renderings on one page

`CommissionerHubPageClient.tsx` renders the commissioner's own league list, each with its own status
badge, in **3 different visual treatments** on the same page: (1) `CommissionerLeagueSwitcher` inside the
Multi-League Overview, (2) per-league `<article>` cards inside `LeagueHealthDashboard`, and (3) the
"Leagues I Manage" grid (`resolveSetupStatus`/`resolveNextAction`). Each has its own status-badge color
logic and its own idea of what the "next action" is. A returning commissioner sees their own league list
rendered 3 times, styled 3 different ways, before reaching the bottom of the page.

## Finding 6 (real, previously flagged, still present) — redundant summary stats

The "League Operations Summary" stat row (`StatCard` × 4: Leagues Managed / Needs Setup / Missing Draft
Date / Active Now) duplicates counts already shown by `CommissionerCommandCenterOverview`'s stat chips
inside the Multi-League Overview directly above it (`totalLeagues`, `leaguesNeedingAttentionCount`,
`draftsApproachingCount`). This was already flagged as known-but-unfixed technical debt in OS-B6/OS-B7;
confirmed still present and unresolved.

## Finding 7 (real) — internal engineering language visible to customers

`CommissionerShowcasePanel.tsx`'s `shadowDecision` block renders "Shadow Only" and "Parity matched
legacy" / "Parity diff detected" directly as customer-facing text — pure internal QA/migration
terminology (shadow-mode composition testing, parity checks against a legacy system) with no meaning to
an actual commissioner.

## Finding 8 (real) — weak/misleading loading state

Every self-fetching Decision OS section (`CommissionerCommandCenterSection`, `ManagerCommandCenterSection`,
and the League Focus cards in `CommissionerHubPageClient`) initializes its snapshot state to `null` and
renders `snapshot?.field ?? 0` / `?? []` while the fetch is in flight. This means the *loading* state and
the *legitimately-empty* state are visually identical: "0 leagues need attention" during the first
~100–500ms is indistinguishable from a real all-clear. No skeleton or loading indicator exists anywhere
in this component family.

## Finding 9 (not a defect — confirmed working correctly)

`CommissionerShowcasePanel`'s AI Summary and recommendation logic were checked for fabrication (per this
phase's truthfulness mandate) — confirmed still honest post-OS-B7: `aiSummary.available` is `false` and
the UI shows "not yet available" when there are zero real health scores; all "Preview Insight" badges are
genuine, explicit, un-hidden placeholders. No new fabrication found.

## What's already good (do not rebuild)

- `DecisionOsCardPrimitives.tsx` is a sound foundation — extend it, don't replace it.
- `ManagerCommandCenterSection` / `CommissionerCommandCenterSection` and their sub-cards
  (Overview/Today's Brief/Attention Queue/Notification Center/League Switcher/Health Ranking) are
  internally consistent and already demonstrate the target visual language for the rest of the page.
- `ManagerHubPageClient.tsx` is already a clean, minimal reference for "no legacy debt."
- League Analytics, User OS, Manager DNA, and Decision Recommendations cards already use the full
  primitive suite (badge, confidence badge, evidence grid, why-panel, trust-note, empty/insufficient-data
  states) — these are the pattern to extend to everything else, not to redesign.

## Deferred (out of scope for this phase)

- Migrating the AI Prompt Cards / Migration Center grids onto shared primitives (cosmetic, lower value
  than the flagship consolidation).
- A full design pass on `/league/[id]` (League Focus) — untouched this phase.
- Renaming `CommissionerAttentionQueue` to a neutral name now that Manager OS reuses it (cosmetic,
  no behavior change, previously flagged as low-risk future cleanup in OS-C1).
