# Prompt 96 — Tool Hub + Cross-Tool Linking + Full UI Click Audit

## 1. Tool hub architecture

### Overview

The Tool Hub is a discovery and navigation layer that centralizes AllFantasy tools (Trade Analyzer, Waiver Wire Advisor, Matchup Simulator, AI Draft Assistant, Mock Draft, Bracket Challenge, Power Rankings, Legacy/Dynasty) and supports sport-aware filtering, category grouping, featured tools, and cross-tool linking.

### Location

- **Page:** `app/tools-hub/page.tsx` (server) + `app/tools-hub/ToolsHubClient.tsx` (client)
- **Lib:** `lib/tool-hub/` (new)

### Data flow

- **Server:** Tools hub page passes `sports` and `tools` from `lib/seo-landing/config` (SPORT_SLUGS, TOOL_SLUGS, SPORT_CONFIG, TOOL_CONFIG) for initial render and hydration.
- **Client:** ToolsHubClient uses `lib/tool-hub` for:
  - Featured tools (slugs → card display)
  - Sport filter options and filtered tool slugs
  - Category tabs and filtered tools
  - Related tools per card
  - Canonical routes (ROUTES) for links

### Core modules (`lib/tool-hub/`)

| Module | Purpose |
|--------|--------|
| **ToolHubService** | `getAllTools()`, `getAllSports()`, `getToolsInCategory()`, `getToolsForSport()` — single entry for hub data from seo-landing config. |
| **ToolCardResolver** | `getToolCardDisplay(slug)`, `getToolCardsForSlugs(slugs)` — map tool slug to card props (headline, description, openToolHref, toolLandingHref, category). |
| **RelatedToolResolver** | `getRelatedTools(forSlug)`, `getRelatedToolCards(forSlug)` — cross-linking from config `relatedToolSlugs`. |
| **SportToolFilterResolver** | `getSportFilterOptions()`, `getToolSlugsForSport(sportSlug)` — sport-aware filter options and tool slugs per sport (all seven sports supported). |
| **FeaturedToolResolver** | `getFeaturedToolSlugs()`, `getToolsByCategory()`, `getCategoryForTool()`, `getCategoryLabel()`, `CATEGORY_ORDER` — featured list and category grouping (Trade, Waiver, Draft, Simulate, Bracket, Rankings, Legacy, AI). |
| **ToolDiscoveryNavigationService** | `ROUTES` (toolsHub, toolLanding, sportLanding, home, app, bracket, afLegacy, chimmy), `getOpenToolHref(slug)`, `getToolsHubPath()`, `getToolLandingPath(slug)`. |

### Types (`lib/tool-hub/types.ts`)

- `ToolCategoryId`: trade | waiver | draft | simulate | bracket | rankings | legacy | ai
- `ToolCardDisplay`: slug, headline, description, openToolHref, toolLandingHref, category
- `FeaturedToolEntry`: slug, headline, openToolHref, description?

### Sports

All seven sports are supported via `lib/sport-scope.ts` and `lib/seo-landing/config`: NFL, NHL, NBA, MLB, NCAA Basketball (NCAAB), NCAA Football (NCAAF), Soccer (SOCCER). Sport filter options come from `SPORT_CONFIG` (fantasy-football, fantasy-basketball, etc.).

---

## 2. Discovery / navigation updates

- **Tool hub route:** `/tools-hub` — unchanged; used by nav, search, footer, and “See all tools and sports” on the main landing.
- **Tool landing:** `/tools/[tool]` — “All tools” link now uses `ROUTES.toolsHub()` from `lib/tool-hub` for consistency.
- **Open-tool URLs:** Still defined in `TOOL_CONFIG[slug].openToolHref` (e.g. `/trade-evaluator`, `/mock-draft`, `/waiver-ai`, `/app/simulation-lab`, `/bracket`, `/af-legacy`). `ToolDiscoveryNavigationService.getOpenToolHref(slug)` exposes them.
- **Search / quick actions:** `SearchResultResolver` and `QuickActionsService` already include Tools Hub (`/tools-hub`). No change required.
- **Shell / nav:** `ActiveNavStateResolver` and `NavLinkResolver` already mark “Tools” active for `/tools-hub` and `/tools/*` and link to `/tools-hub`.

---

## 3. Frontend card / filter updates

### Tools Hub client (`app/tools-hub/ToolsHubClient.tsx`)

- **Featured tools:** New “Featured tools” section; cards show headline, description, link to tool landing (`/tools/[slug]`), and “Open” CTA to `openToolHref`.
- **Sport filter:** “By sport” includes a dropdown (“All sports” + one option per sport). Changing it filters the “All tools” list to tools relevant to that sport (via `getToolSlugsForSport`).
- **Category filter:** “All tools” has tabs: All, Trade, Waiver & Lineup, Draft, Simulate, Bracket, Rankings, Legacy & Dynasty, AI. Selecting a category filters the list; combined with sport filter when both are set.
- **All tools cards:** Each card shows headline, “Open” button, open path hint, and up to three “Related” links (from `getRelatedTools(slug)`) to other tool landings.
- **Main experiences:** Sports App, Bracket Challenge, AllFantasy Legacy — links use `ROUTES.app()`, `ROUTES.bracket()`, `ROUTES.afLegacy()`.
- **Chimmy AI:** Link uses `ROUTES.chimmy()`.
- **Back to AllFantasy Home:** Link uses `ROUTES.home()`.

### Tool landing (`app/tools/[tool]/ToolLandingClient.tsx`)

- “All tools” link in “More from AllFantasy” uses `ROUTES.toolsHub()` instead of hardcoded `/tools-hub`.

### Preserved

- Main landing page: Popular Fantasy Tools, Trending, Quick Tools, Chimmy block, footer (Tools Hub, Chimmy, app, bracket, af-legacy, trade-analyzer).
- Tool landing pages: Open [Tool] CTA, related tools section, supported sports, FAQ, More from AllFantasy.
- Dashboard, search, trade analyzer, waiver wire, matchup simulator, draft room, bracket challenge, AI entry points, and existing tool cards/CTAs/quick links are unchanged except where explicitly wired to the hub or ROUTES.

---

## 4. Cross-tool linking improvements

- **Hub cards:** Each tool card in “All tools” shows a “Related” row with up to three links to `/tools/[slug]` from `getRelatedTools(t.slug)` (driven by `TOOL_CONFIG[slug].relatedToolSlugs`).
- **Tool landing:** “Explore related tools” still uses `RelatedToolsSection` with `config.relatedToolSlugs`; links go to `/tools/[slug]`. Same data source as hub.
- **Single source of related data:** `lib/seo-landing/config` `relatedToolSlugs` per tool; `RelatedToolResolver` and `RelatedToolsSection` both use it.
- **Navigation service:** Tool landing “All tools” uses `ROUTES.toolsHub()` so all “back to hub” paths stay consistent.

---

## 5. Full UI click audit findings

### Tools Hub page (`/tools-hub`)

| Element | Component / route | Handler / state | Navigation | Status |
|--------|-------------------|-----------------|------------|--------|
| Open tool hub (nav, footer, home “See all tools”) | Link | — | `/tools-hub` | OK |
| Featured tool card (headline) | Link | — | `card.toolLandingHref` → `/tools/[slug]` | OK |
| Featured tool “Open” | Link | — | `card.openToolHref` | OK |
| Sport filter dropdown | `<select>` | `setSportFilter` | N/A (filters list) | OK |
| Sport filter “By sport” cards | Link | — | `ROUTES.sportLanding(s.slug)` → `/sports/[slug]` | OK |
| Category filter buttons (All + categories) | `<button>` | `setCategoryFilter` | N/A (filters list) | OK |
| All tools card (headline) | Link | — | `/tools/[slug]` | OK |
| All tools card “Open” | Link | — | `t.openToolHref` | OK |
| Related tool links on card | Link | — | `r.href` → `/tools/[slug]` | OK |
| Main experiences (App, Bracket, Legacy) | Link | — | ROUTES.app/bracket/afLegacy | OK |
| Chimmy AI block | Link | — | ROUTES.chimmy() | OK |
| Back to AllFantasy Home | Link | — | ROUTES.home() | OK |

### Tool landing (`/tools/[tool]`)

| Element | Component / route | Handler / state | Navigation | Status |
|--------|-------------------|-----------------|------------|--------|
| “Open [Tool]” (LandingCTAStrip) | Link | — | `config.openToolHref` | OK |
| Supported sports links | Link | — | `/sports/[slug]` | OK |
| Related tools (RelatedToolsSection) | Link | — | `/tools/[slug]` | OK |
| “Home” | Link | — | `/` | OK |
| “All tools” | Link | — | `ROUTES.toolsHub()` → `/tools-hub` | OK (updated) |

### Main landing (`/`)

| Element | Component / route | Handler / state | Navigation | Status |
|--------|-------------------|-----------------|------------|--------|
| Popular Fantasy Tools cards | Link | — | `tool.href` (e.g. `/trade-analyzer`, `/mock-draft`) | OK (preserved) |
| “See all tools and sports” | Link | — | `/tools-hub` | OK |
| Trending / Quick Tools / Chimmy | Link | — | Various (e.g. `/app/meta-insights`, `/bracket`) | OK |
| Footer Tools Hub, Chimmy, app, bracket, af-legacy, trade-analyzer | Link | — | Correct hrefs | OK |

### Shell / search

| Element | Component / route | Handler / state | Navigation | Status |
|--------|-------------------|-----------------|------------|--------|
| “Tools” nav item | NavLinkResolver / ActiveNavStateResolver | pathname | `/tools-hub` | OK |
| Search “Tools Hub” | SearchResultResolver | — | `/tools-hub` | OK |
| Quick action “Tools hub” | QuickActionsService | — | `/tools-hub` | OK |

### Other

| Element | Component / route | Handler / state | Navigation | Status |
|--------|-------------------|-----------------|------------|--------|
| SeoLandingFooter “Tools Hub” | Link | — | `/tools-hub` | OK |
| Chimmy landing tool links | Link | — | `/tools/trade-analyzer`, etc. | OK |

### Verified

- Filtered views: Changing sport or category updates `filteredToolSlugs` / `filteredTools` via `useMemo`; list re-renders correctly.
- No dead tool cards: All tools come from server `tools` prop (from TOOL_SLUGS); filtered list only narrows by sport/category.
- Mobile: Same components; grid is responsive (`sm:grid-cols-2`); dropdown and category buttons are touch-friendly.

---

## 6. QA findings

- **Tool hub loads:** Page loads with featured section, sport section (with dropdown), and all-tools section with category tabs.
- **Tool cards route:** Headline → `/tools/[slug]`, “Open” → `openToolHref`; no broken links when using config.
- **Sport filter:** “All sports” shows all tools; selecting a sport shows only tools linked from that sport’s landing (or all if none match).
- **Category filter:** “All” shows all tools; each category shows only tools in that category; combined with sport filter works.
- **Related tool links:** Each card’s “Related” links go to `/tools/[slug]`; slugs come from config.
- **Mobile:** Card list and filters behave; no separate mobile-only click path that could be broken.
- **Tool landing “All tools”:** Navigates to `/tools-hub` via ROUTES.toolsHub().

---

## 7. Issues fixed

1. **Tool landing “All tools” hardcoded:** Replaced `/tools-hub` with `ROUTES.toolsHub()` and added `ROUTES` import from `lib/tool-hub` for single source of truth.
2. **No featured/trending/category/sport on hub:** Implemented featured section, category tabs, sport dropdown, and related links on cards using the new `lib/tool-hub` modules.
3. **No central navigation for hub/home/app/bracket/legacy/chimmy:** ToolsHubClient and ToolLandingClient now use `ROUTES` from ToolDiscoveryNavigationService where appropriate.

No dead tool cards, stale filters, or broken related links were found; the audit confirmed existing links and added the new behavior above.

---

## 8. Final QA checklist

- [ ] **Tool hub loads** at `/tools-hub` with Featured tools, By sport (with dropdown), and All tools (with category tabs).
- [ ] **Featured tool card:** Click headline → tool landing; click “Open” → open-tool URL.
- [ ] **Sport dropdown:** “All sports” → all tools; select a sport → list filters to tools for that sport (or all if none).
- [ ] **Category tabs:** “All” → all tools; each category → only that category’s tools; works with sport filter.
- [ ] **All tools card:** Headline → `/tools/[slug]`; “Open” → open-tool URL; “Related” links → `/tools/[slug]`.
- [ ] **By sport cards:** Each links to `/sports/[slug]`.
- [ ] **Main experiences:** App, Bracket, Legacy link to `/app`, `/bracket`, `/af-legacy`.
- [ ] **Chimmy AI:** Links to `/chimmy`.
- [ ] **Back to AllFantasy Home:** Links to `/`.
- [ ] **Tool landing:** “Open [Tool]” → openToolHref; “All tools” → `/tools-hub`.
- [ ] **Nav “Tools”:** Highlights for `/tools-hub` and `/tools/*`; link goes to `/tools-hub`.
- [ ] **Search / quick actions:** “Tools Hub” opens `/tools-hub`.
- [ ] **Mobile:** Card list and filters usable; all same links work.

---

## 9. Explanation of the tool hub and cross-tool linking system

**Tool hub**

The Tool Hub is the main discovery page for AllFantasy tools. It lives at `/tools-hub` and is linked from the main nav (“Tools”), the main landing (“See all tools and sports”), the footer (“Tools Hub”), search, and quick actions. It:

- **Organizes tools** via “Featured tools” (Trade Analyzer, Mock Draft, Waiver Wire Advisor, AI Draft Assistant) and “All tools” with category tabs (Trade, Waiver, Draft, Simulate, Bracket, Rankings, Legacy, AI).
- **Supports sport filtering** with a “By sport” dropdown (all seven sports); the “All tools” list is filtered to tools relevant to the selected sport (based on each sport’s `toolHrefs` in config).
- **Encourages deeper use** by linking each tool to its landing page (`/tools/[slug]`) and to the open-tool URL (“Open” CTA), and by showing related tools on each card.
- **Keeps a single source of truth:** Tool and sport data come from `lib/seo-landing/config`; `lib/tool-hub` wraps that for the hub (featured, categories, sport filter, related tools, routes) without duplicating config.

**Cross-tool linking**

- **Config:** Each tool in `TOOL_CONFIG` has `relatedToolSlugs` (e.g. Trade Analyzer → Mock Draft, Waiver Advisor, AI Draft Assistant, Legacy).
- **Hub:** Each “All tools” card shows up to three related tools as links to `/tools/[slug]` via `getRelatedTools(slug)`.
- **Tool landing:** “Explore related tools” uses the same `relatedToolSlugs` in `RelatedToolsSection`, linking to `/tools/[slug]`.
- **Navigation:** “All tools” / “Back to hub” from tool landings use `ROUTES.toolsHub()` so the hub is the consistent parent for tool discovery.

**Sports**

All seven sports (NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER) are supported. The hub’s sport filter uses `SPORT_CONFIG` (fantasy-football, fantasy-basketball, etc.); tool relevance per sport is derived from each sport’s `toolHrefs` so the filtered list matches what each sport landing page promotes.
