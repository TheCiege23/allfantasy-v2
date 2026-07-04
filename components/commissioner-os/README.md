# Commissioner OS — Shell and Component Library

This directory holds two things: the application shell (Phase 0.2) and
the reusable component library (Phase 0.4). Neither contains business
logic or module pages.

## Application Shell

Phase 0.2 foundation — the shared framework every Commissioner OS module
runs inside.

### What this is not

- **No new theme provider.** `components/providers/AppProviders.tsx`
  already mounts a full-featured `ThemeProvider`
  (`components/theme/ThemeProvider.tsx`) globally — light/dark/legacy/
  system, localStorage sync, cross-tab sync. Commissioner OS consumes it
  via `useThemeMode()` and the `data-mode`-driven CSS custom properties;
  it does not wrap a second one.
- **No hook into `lib/shell`'s product switcher.** `lib/shell`'s
  `ProductId` (`"home" | "webapp" | "bracket" | "legacy"`) and
  `SHELL_NAV_ITEMS`/`PRODUCT_SWITCHER_ITEMS` are the existing, live
  product-switching system, backed by `lib/navigation/NavLinkResolver`.
  Commissioner OS has its own, self-contained navigation model instead
  (`lib/commissioner-os/navigation/`), mirroring the `NavItem` shape
  convention without importing its content.
- **No edits to `lib/feature-toggle`.** That system's `FEATURE_KEYS` is a
  closed set tied to existing, live product features. Commissioner OS
  module flags live in `lib/commissioner-os/featureFlags.ts` instead.

See the Repository Discovery Rules appendix (Developer Playbook) for the
decision procedure behind these three.

### Shell structure

```
lib/commissioner-os/
  tokens/                  — Phase 0.1: design token references
  navigation/               — module nav items, active-state and breadcrumb resolvers
  featureFlags.ts            — module-scoped enablement map
  platform/                  — Phase 0.3: event bus, service registry
  contracts/                 — Platform Contracts: versioned cross-module type contracts

components/commissioner-os/
  providers/
    CommissionerFeatureFlagProvider.tsx
    CommissionerLayoutProvider.tsx     — sidebar collapsed + mobile drawer state
    CommissionerNavigationProvider.tsx  — active module + breadcrumb trail
    CommissionerPlatformProvider.tsx    — shared event bus + platform service open/closed state
    CommissionerOSProviders.tsx         — composition root (infrastructure only)
  shell/
    CommissionerSidebar.tsx, CommissionerHeader.tsx, CommissionerBreadcrumbs.tsx,
    CommissionerPageContainer.tsx, ModulePlaceholder.tsx
```

Sidebar is persistent on Desktop (collapsible to icon-only, state
persisted in `localStorage`), a backdrop-covered drawer on Tablet/Mobile.
Icons: `lucide-react`, already a dependency, one per module, reused
consistently (Design Language §13).

## Component Library

Phase 0.4 — reusable UI primitives every business module composes
instead of building its own. Every component here is built on top of the
existing `components/ui/` primitives plus the Phase 0.1 design tokens,
never a rebuild of them.

### Repository discovery findings

`components/ui/` already provides a mature, shadcn-style library:
`card.tsx`, `button.tsx`, `badge.tsx`, `input.tsx`, `select.tsx`,
`table.tsx`, `dialog.tsx` (modal), `skeleton.tsx`, `switch.tsx`,
`textarea.tsx`, `label.tsx`, `popover.tsx`, `calendar.tsx`, and
`command.tsx` (the underlying primitive for command palettes — directly
relevant to the future Search integration). This drastically narrowed
this phase's actual scope: buttons, inputs, selects, tables, badges,
modals, and skeletons already exist and are reused as-is, not rebuilt.

One real gap found and worked around: `Card` already uses theme
variables (`var(--panel)`, `var(--border)`) — fully compatible — but
`Badge` and `Button` use fixed Tailwind gradient/color classes rather
than CSS custom properties. Retrofitting those shared, already-used-
everywhere primitives to be token-driven is out of scope for Commissioner
OS. Severity-specific coloring is applied via `style` overrides layered
on top of the reused base components instead.

### Scope decision

The task listed roughly 29 component categories. Rather than building all
of them speculatively, this phase built the Card System subset and state
components Mission Control (the very next phase) actually consumes, per
Developer Playbook §1 ("don't build for hypothetical future
requirements"). Full charting (Line/Radar/Heatmap/etc.), a Data Grid
beyond the existing `table.tsx`, Tabs, Filters, and a dedicated Search
Field are deferred to the modules that actually need that specific
chart type or interaction.

### What's here

- `cards/` — `KpiCard`, `RecommendationCard`, `AlertCard`, `SummaryCard`,
  `StatusCard`, `TimelineCard`, `InfoCard`, plus `severityStyles.ts`
  (reuses Phase 0.1's `severityTokens` directly — never a second color
  mapping).
- `states/` — `EmptyState`, `LoadingState` (wraps `components/ui/skeleton.tsx`),
  `ErrorState`.
- `primitives/` — `TrendIndicator`.

### Severity vocabulary note

Cards use the five-tier `SeverityTier` (critical/elevated/standard/
advisory/positive) from `lib/commissioner-os/tokens/colors.ts` — the
*condition* severity language, matching League Health's own vocabulary.
This is deliberately distinct from `CommissionerNotificationSeverity`
(informational/success/warning/critical) in Platform Contracts, which is
the *event* severity language for notifications and activity entries. The
two are related but answer different questions and are never conflated.
