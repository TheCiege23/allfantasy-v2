# AllFantasy SEO Landing Pages + Tool Discovery + Traffic Growth – Deliverable

## 1. Landing Page / Discovery Architecture

- **Sport SEO pages**: One page per sport at `/sports/[sport]` with static params for 7 slugs: `fantasy-football`, `fantasy-basketball`, `fantasy-baseball`, `fantasy-hockey`, `fantasy-soccer`, `ncaa-football-fantasy`, `ncaa-basketball-fantasy`. Each page is server-rendered with `generateMetadata` and a client inner component for content, CTAs, and internal links.
- **Tool discovery pages**: One page per tool at `/tools/[tool]` with static params for 8 slugs: `trade-analyzer`, `mock-draft-simulator`, `waiver-wire-advisor`, `ai-draft-assistant`, `matchup-simulator`, `bracket-challenge`, `power-rankings`, `legacy-dynasty`. Same pattern: server metadata + client content, related tools, sport links, and CTAs.
- **Chimmy AI page**: `/chimmy` – server metadata, client content explaining draft help, trade analysis, waiver advice, matchup predictions, league storytelling, AI commissioner support, and sport-specific guidance. CTAs to open chat and Legacy.
- **Fantasy Tools Hub**: `/tools-hub` – internal index listing sports (links to `/sports/[slug]`), all tools (links to `/tools/[slug]`), main experiences (Sports App, Bracket, Legacy), and Chimmy. Single server page + client component.
- **Shared pieces**: All SEO/discovery pages use `HomeTopNav` (logo, Sign In, Sign Up, Admin crest when admin, language toggle, theme toggle) and `SeoLandingFooter` (Home, Tools Hub, Chimmy, App, Bracket, Legacy, Trade, Sign In, Sign Up). `LandingCTAStrip` and `RelatedToolsSection` are reused for consistent CTAs and related links.
- **Config**: `lib/seo-landing/config.ts` holds sport/tool slugs, titles, descriptions, headlines, body copy, tool hrefs, related slugs, and keywords for metadata and content. Canonical helpers `getSportCanonical` and `getToolCanonical` use `https://allfantasy.ai`.

**Preserved**: Main landing (`/`), routing, auth, sports app (`/app`), bracket (`/bracket`, `/brackets`), Legacy (`/af-legacy`), trade analyzer (`/trade-analyzer`, `/trade-evaluator`), mock draft (`/mock-draft`), Chimmy entry (`/af-legacy?tab=chat`), theme system, localization (i18n). Sport scope (NFL, NHL, NBA, MLB, NCAAB, NCAAF, Soccer) is reflected in config and copy.

---

## 2. Routes Created or Updated

| Route | Type | Purpose |
|-------|------|---------|
| `/sports/[sport]` | New | Sport SEO landing (7 slugs) |
| `/tools/[tool]` | New | Tool discovery landing (8 slugs) |
| `/tools-hub` | New | Fantasy Tools Hub index |
| `/chimmy` | New | Chimmy AI discovery page |
| `/` | Updated | Footer: added Tools Hub, Chimmy; “See all tools and sports” link to `/tools-hub` |
| `/sitemap.xml` | Updated | Includes `/tools-hub`, `/chimmy`, all `/sports/*`, all `/tools/*`, and key product URLs |

**Static params**: `generateStaticParams` is used for `/sports/[sport]` and `/tools/[tool]` so all sport and tool URLs are pre-rendered at build time.

---

## 3. SEO and Metadata Updates

- **Per sport page**: Unique `title`, `description`, `keywords`, `canonical` (`/sports/{slug}`), Open Graph and Twitter card with same title/description. `robots: { index: true, follow: true }`.
- **Per tool page**: Same pattern; canonical `/tools/{slug}`.
- **Tools Hub**: Title “Fantasy Tools Hub – All Tools & Sports | AllFantasy”, description and OG/Twitter set, canonical `/tools-hub`.
- **Chimmy**: Title “Chimmy AI – Your Fantasy Sports Assistant | AllFantasy”, description and OG/Twitter set, canonical `/chimmy`.
- **Sitemap**: All new URLs added with appropriate `priority` and `changefreq` (e.g. sport/tool pages 0.75 weekly; tools-hub 0.85 weekly).
- **Content**: Each page has a clear H1, H2 sections (e.g. “What this tool does”, “Who it’s for”, “Related tools”), and crawlable text. No thin, button-only pages. Optional FAQ block: tool config supports `faqs: { q, a }[]`; Trade Analyzer tool page includes an FAQ section as an example.

---

## 4. Internal Linking Strategy

- **From main landing**: Footer links to Tools Hub and Chimmy; “See all tools and sports” in Popular Fantasy Tools section links to `/tools-hub`.
- **From Tools Hub**: Links to every `/sports/[slug]`, every `/tools/[slug]`, Chimmy, App, Bracket, Legacy, and Home.
- **From each sport page**: Featured tool links (Trade Analyzer, Mock Draft, Waiver, etc.), “Meet Chimmy AI” → `/chimmy`, “Open Sports App” / “Bracket Challenge” / “AllFantasy Legacy”, “Explore more tools” (RelatedToolsSection), “Back to AllFantasy Home” → `/`.
- **From each tool page**: “Open [Tool]” → `openToolHref`, Sign In/Sign Up, “Explore related tools” (RelatedToolsSection with config-driven slugs), “Supported sports” → `/sports/[slug]` for each sport, “Home” and “All tools” → `/` and `/tools-hub`.
- **From Chimmy page**: “Ask Chimmy” and “Open AllFantasy Legacy” → `/af-legacy?tab=chat` and `/af-legacy`, related tool links (Trade Analyzer, AI Draft Assistant, Waiver Advisor, All tools), “Back to AllFantasy Home” → `/`.
- **From SeoLandingFooter** (on every SEO page): Home, Tools Hub, App, Bracket, Legacy, Trade Analyzer, Chimmy AI, Sign In, Sign Up.

No orphan pages: every new page is reachable from `/`, `/tools-hub`, footer, or in-page related links.

---

## 5. UI Component Updates

- **New**: `components/landing/SeoLandingFooter.tsx` – footer with Home, Tools Hub, app/bracket/legacy/trade/Chimmy, Sign In, Sign Up. Used on all sport, tool, tools-hub, and chimmy pages.
- **New**: `components/landing/LandingCTAStrip.tsx` – primary CTA (open tool) + optional Sign Up / Sign In. Uses session to hide auth buttons when authenticated. Fires `gtagEvent` for `landing_cta_open_tool`, `landing_cta_sign_up`, `landing_cta_sign_in`.
- **New**: `components/landing/RelatedToolsSection.tsx` – list of related tools with links to `/tools/[slug]`; data from config.
- **Updated**: Main landing `app/page.tsx` – footer extended with Tools Hub and Chimmy; “See all tools and sports” link under Popular Fantasy Tools.
- **Reused**: `HomeTopNav`, `ModeToggle`, `LanguageToggle`, existing i18n keys. All new pages use the same nav and theme/localization behavior.

---

## 6. Analytics Integration Updates

- **LandingCTAStrip**: `gtagEvent('landing_cta_open_tool', { cta_label, cta_href })` on primary CTA click; `gtagEvent('landing_cta_sign_up', { next })` and `gtagEvent('landing_cta_sign_in', { next })` on Sign Up / Sign In. Uses existing `lib/gtag` and does not change layout or global gtag config.
- **Page views**: Existing root layout gtag and `send_page_view` continue to apply; new routes are tracked as normal page views.
- No changes to existing analytics elsewhere; no new global scripts.

---

## 7. Full UI Click Audit Findings

| Location | Element | Handler / Route | Verified |
|----------|---------|------------------|----------|
| **All SEO pages** | Logo (header) | `Link` to `/` | ✅ |
| | Sign In | `Link` to `/login` | ✅ |
| | Sign Up | `Link` to `/signup` | ✅ |
| | Theme toggle | `ModeToggle` cycleMode | ✅ |
| | Language toggle | `LanguageToggle` EN/ES | ✅ |
| | Admin crest (if admin) | `Link` to `/admin` | ✅ |
| **Sport pages** | Featured tool links | `Link` to config `toolHrefs[].href` | ✅ |
| | Meet Chimmy AI | `Link` to `/chimmy` | ✅ |
| | Open Sports App | `Link` to `/app` | ✅ |
| | Bracket / Legacy links | `Link` to `/bracket`, `/af-legacy` | ✅ |
| | Explore more tools | `RelatedToolsSection` → `/tools/[slug]` | ✅ |
| | Back to Home | `Link` to `/` | ✅ |
| **Tool pages** | Open [Tool] | `LandingCTAStrip` primaryHref → config `openToolHref` | ✅ |
| | Sign Up / Sign In | `LandingCTAStrip` → `/signup`, `/login` with `next` | ✅ |
| | Sport pills | `Link` to `/sports/[slug]` | ✅ |
| | Related tools | `RelatedToolsSection` → `/tools/[slug]` | ✅ |
| | FAQ (trade-analyzer) | Static FAQ block; no expand/collapse | ✅ |
| | Home / All tools | `Link` to `/`, `/tools-hub` | ✅ |
| **Tools Hub** | By sport cards | `Link` to `/sports/[slug]` | ✅ |
| | All tools cards | `Link` to `/tools/[slug]` | ✅ |
| | Sports App / Bracket / Legacy | `Link` to `/app`, `/bracket`, `/af-legacy` | ✅ |
| | Chimmy AI card | `Link` to `/chimmy` | ✅ |
| | Back to Home | `Link` to `/` | ✅ |
| **Chimmy page** | Ask Chimmy (primary) | `LandingCTAStrip` → `/af-legacy?tab=chat` | ✅ |
| | Open AllFantasy Legacy | `Link` to `/af-legacy` | ✅ |
| | Related (Trade, AI Draft, Waiver, All tools) | `Link` to `/tools/...`, `/tools-hub` | ✅ |
| | Back to Home | `Link` to `/` | ✅ |
| **SeoLandingFooter** | Home, Tools Hub, App, Bracket, Legacy, Trade, Chimmy | `Link` to correct paths | ✅ |
| | Sign In, Sign Up | `Link` to `/login`, `/signup` | ✅ |
| **Main landing** | See all tools and sports | `Link` to `/tools-hub` | ✅ |
| | Footer Tools Hub, Chimmy | `Link` to `/tools-hub`, `/chimmy` | ✅ |

All listed elements have the correct target; no dead buttons or wrong redirects found. Theme and language state are preserved via existing providers.

---

## 8. QA Findings

- **Routes**: All new routes respond: `/sports/*` (7), `/tools/*` (8), `/tools-hub`, `/chimmy`. Invalid slug returns 404 via `notFound()`.
- **Metadata**: Unique title/description per sport and tool; Open Graph and canonical present.
- **Internal links**: From home → tools-hub and chimmy; from tools-hub to all sports and tools; from sport/tool pages to related tools, sports, chimmy, app, bracket, legacy, home.
- **CTAs**: “Open [Tool]” uses config `openToolHref` (e.g. trade-analyzer → `/trade-evaluator`, mock-draft → `/mock-draft`). Sign In/Sign Up include `next` where appropriate.
- **Theme / language**: All pages use same layout and providers; ModeToggle and LanguageToggle behave as on main landing.
- **Mobile**: Layout is responsive; CTAs use min-height 44px; sections stack vertically.
- **Content**: Each page has multiple text sections (headline, body, examples, who it’s for, related tools); not thin.
- **Build**: Current repo build fails due to an existing syntax error in `lib/career-prestige/UnifiedCareerQueryService.ts` (unrelated to this deliverable). New SEO/discovery code passes lint.

---

## 9. Issues Fixed

- **Trade Analyzer open URL**: Tool config `openToolHref` for `trade-analyzer` set to `/trade-evaluator` so “Open Trade Analyzer” goes to the actual evaluator.
- **Related tools type**: `ToolLandingClient` passes `config.relatedToolSlugs` (typed as `ToolSlug[]`) into `RelatedToolsSection`; variable name corrected from `relatedToolSlugs` to `relatedSlugs` where used.
- **Chimmy imports**: Removed unused `Trophy` import from Chimmy landing client.
- **ToolsHubClient types**: Removed unused `SportConfig` / `ToolConfig` imports; props use inline types.

---

## 10. Final QA Checklist

- [x] All 7 sport landing pages load at `/sports/[slug]`.
- [x] All 8 tool landing pages load at `/tools/[slug]`.
- [x] `/tools-hub` and `/chimmy` load.
- [x] Each page has unique title and meta description.
- [x] Canonical and OG tags set for sport, tool, tools-hub, chimmy.
- [x] Sitemap includes all new URLs.
- [x] Main landing footer links to Tools Hub and Chimmy; “See all tools and sports” links to tools-hub.
- [x] Sign In / Sign Up on SEO pages link to `/login` and `/signup` with `next` when used.
- [x] Open Tool CTAs use correct `openToolHref` (e.g. trade-evaluator, mock-draft, waiver-ai, af-legacy, app/simulation-lab, bracket, app/power-rankings, af-legacy).
- [x] Related tools and sport links go to correct `/tools/*` and `/sports/*` URLs.
- [x] Chimmy page links to `/af-legacy?tab=chat` and `/chimmy` where intended.
- [x] Theme and language toggles work on all new pages.
- [x] No orphan pages; every new page linked from home, tools-hub, or footer/related sections.
- [x] CTA tracking: `landing_cta_open_tool`, `landing_cta_sign_up`, `landing_cta_sign_in` fired from `LandingCTAStrip`.

---

## 11. Explanation of the Traffic Growth Landing Page System

- **SEO and long-tail**: Sport-specific pages target queries like “fantasy football tools”, “fantasy basketball AI”, “NCAA bracket tools”. Tool pages target “trade analyzer”, “mock draft simulator”, “waiver wire advisor”, etc. Each page has unique title, description, and content so they can rank and attract long-tail traffic.
- **Discovery and conversion**: Users arriving on a sport or tool page see what AllFantasy offers, featured tools, and clear CTAs (Open Tool, Sign Up, Sign In). Related tools and “Explore more tools” move them deeper; links to Chimmy, Bracket, and Legacy spread engagement across the product.
- **Internal index**: The Tools Hub acts as an internal index for users and crawlers: one place to see all sports and tools and jump to Sport App, Bracket, Legacy, or Chimmy. It supports both discovery and internal linking.
- **ASO-ready language**: Copy uses terms like “AI fantasy sports tools”, “fantasy trade analyzer”, “bracket challenge app”, “mock draft simulator”, “fantasy sports assistant”, “dynasty fantasy tools”, “league management tools” so it can be reused for app store listings.
- **Scalability**: Adding a sport or tool is done in `lib/seo-landing/config.ts` and (if needed) by extending `SPORT_SLUGS` / `TOOL_SLUGS` and static params. Shared components and metadata helpers keep new pages consistent and quick to add.
