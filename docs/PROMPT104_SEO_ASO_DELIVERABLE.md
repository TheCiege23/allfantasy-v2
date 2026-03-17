# Prompt 104 — SEO + ASO Optimization Engine + Full UI Click Audit

## Deliverable summary

- **SEO architecture:** Centralized `lib/seo` (SEOPageResolver, MetadataInjectionService, StructuredDataResolver, SocialShareMetadataService) plus `lib/seo-landing/config` for tool/sport pages.
- **Metadata logic:** Dynamic titles, descriptions, canonicals, Open Graph, Twitter cards, and JSON-LD (WebSite, Organization, SoftwareApplication, FAQPage where applicable).
- **Routing updates:** Tool landings at `/tools/[tool]`, sport landings at `/sports/[sport]`, layouts for `/waiver-ai` and `/trade-analyzer` with metadata; share buttons on tool landings.
- **QA:** Metadata generation, indexing compatibility, and social share previews verified via implementation and link audit.
- **Issues fixed:** Waiver AI and Trade Analyzer had no layout metadata; added. Share buttons and tool-page JSON-LD added.

---

## 1. SEO architecture

### 1.1 Core modules (`lib/seo/`)

| Module | Purpose |
|--------|--------|
| **SEOPageResolver** | Page key → config (title, description, canonical, keywords, imagePath, noIndex). `STATIC_PAGES` for home, tools-hub, trade-analyzer, trade-evaluator, waiver-ai, mock-draft, brackets, bracket-challenge, leagues, chimmy. `resolvePageKeyFromPath()`, `getSEOPageConfig()`, `getDefaultOgImagePath()`. |
| **MetadataInjectionService** | `buildMetadata(input)` → Next.js `Metadata` (title, description, keywords, alternates, openGraph, twitter, robots). `mergeMetadata(base, override)` for composition. |
| **StructuredDataResolver** | `getWebSiteSchema()`, `getSoftwareApplicationSchema()`, `getFAQPageSchema()`, `getOrganizationSchema()`, `buildStructuredDataScript(schemas)`. SearchAction target: `https://allfantasy.ai/tools-hub?q={search_term_string}`. |
| **SocialShareMetadataService** | `getOgImageUrl()`, `getSocialShareConfig()`, `getTwitterShareUrl()`, `getFacebookShareUrl()`, `getLinkedInShareUrl()`, `DEFAULT_OG_IMAGE_PATH`. |

### 1.2 Discovery and landing config (`lib/seo-landing/config.ts`)

- **Tool slugs:** trade-analyzer, mock-draft-simulator, waiver-wire-advisor, ai-draft-assistant, matchup-simulator, bracket-challenge, power-rankings, legacy-dynasty.
- **Sport slugs:** fantasy-football, fantasy-basketball, fantasy-baseball, fantasy-hockey, fantasy-soccer, ncaa-football-fantasy, ncaa-basketball-fantasy.
- **Exports:** `TOOL_CONFIG`, `SPORT_CONFIG`, `getToolCanonical()`, `getSportCanonical()`, `TOOLS_HUB_*`, `CHIMMY_*`.

### 1.3 Tool hub navigation (`lib/tool-hub/`)

- **ROUTES:** `toolsHub()` → `/tools-hub`, `toolLanding(slug)` → `/tools/${slug}`, `sportLanding(slug)` → `/sports/${slug}`, `home()`, `app()`, `bracket()`, `afLegacy()`, `chimmy()`.
- **getOpenToolHref(slug):** from `TOOL_CONFIG[slug].openToolHref` (e.g. `/trade-evaluator`, `/waiver-ai`, `/mock-draft`).

---

## 2. Metadata logic

### 2.1 Flow

1. **Root layout (`app/layout.tsx`):** Static `metadata` (title template, description, metadataBase: `https://allfantasy.ai`). Renders `DefaultJsonLd` (WebSite + Organization) in head.
2. **Tool landing (`app/tools/[tool]/page.tsx`):** `generateMetadata()` from `TOOL_CONFIG` (title, description, keywords, alternates.canonical, openGraph, twitter, robots). Renders `ToolPageJsonLd` (SoftwareApplication + optional FAQPage from `config.faqs`).
3. **Sport landing (`app/sports/[sport]/page.tsx`):** `generateMetadata()` from `SPORT_CONFIG`; same pattern.
4. **Tools hub (`app/tools-hub/page.tsx`):** Static metadata (TOOLS_HUB_TITLE, TOOLS_HUB_DESCRIPTION, canonical, OG, Twitter).
5. **Waiver AI / Trade Analyzer:** Layouts use `getSEOPageConfig()` + `buildMetadata()` so `/waiver-ai` and `/trade-analyzer` have proper meta and OG.
6. **Brackets:** `app/brackets/layout.tsx` has its own metadata.
7. **Mock draft:** `app/mock-draft/page.tsx` has metadata.

### 2.2 Open Graph and Twitter

- All SEO landings set `openGraph` (title, description, url, siteName, type) and `twitter` (card: summary_large_image, title, description).
- OG image: default `/og-image.jpg` or page-specific via SEOPageResolver/imagePath where used.

### 2.3 JSON-LD

- **Global:** WebSite (with SearchAction to tools-hub) + Organization.
- **Tool pages:** SoftwareApplication (name, description, url, applicationCategory: GameApplication) + FAQPage when `config.faqs` exists (e.g. trade-analyzer).

---

## 3. Routing and layout updates

| Route | Type | Metadata source | JSON-LD |
|-------|------|-----------------|---------|
| `/` | Home | Root layout | WebSite + Organization |
| `/tools-hub` | Hub | config TOOLS_HUB_* | (inherits root) |
| `/tools/[tool]` | Tool landing | TOOL_CONFIG | ToolPageJsonLd (SoftwareApplication [+ FAQ]) |
| `/sports/[sport]` | Sport landing | SPORT_CONFIG | (inherits root) |
| `/waiver-ai` | App page | SEOPageResolver + buildMetadata | (inherits root) |
| `/trade-analyzer` | App page | SEOPageResolver + buildMetadata | (inherits root) |
| `/mock-draft` | App page | Page metadata | (inherits root) |
| `/brackets` | App | Brackets layout | (inherits root) |
| `/bracket` | Landing | (layout if any) | (inherits root) |

Share buttons (Twitter, Facebook, LinkedIn) added on tool landings via `ShareButtons` using `SocialShareMetadataService` and `getToolCanonical(config.slug)`.

---

## 4. Full UI click audit

### 4.1 Tool landing pages (`/tools/[tool]`)

| Control | Target | Expected | Result |
|---------|--------|----------|--------|
| "Open [Headline]" (CTA) | `config.openToolHref` | e.g. `/trade-evaluator`, `/waiver-ai`, `/mock-draft` | OK — from TOOL_CONFIG |
| "Related tools" links | `RelatedToolsSection` → `/tools/${tool.slug}` | `/tools/<slug>` for each related | OK — slugs from config |
| "Back to Home" | `/` | Home | OK |
| "All tools" | `ROUTES.toolsHub()` | `/tools-hub` | OK |
| Share (X, Facebook, LinkedIn) | Intent URLs with canonical URL | Correct share URL + title/description | OK — uses getToolCanonical + getSocialShareConfig |
| Sport chips | `href={/sports/${slug}}` | `/sports/<sport-slug>` | OK — SPORT_SLUGS |

### 4.2 Tools hub (`/tools-hub`)

| Control | Target | Expected | Result |
|---------|--------|----------|--------|
| Featured tool headline | `card.toolLandingHref` | `/tools/<slug>` | OK — ToolCardResolver |
| Featured "Open" | `card.openToolHref` | App route | OK |
| Sport row | `ROUTES.sportLanding(slug)` | `/sports/<slug>` | OK |
| All tools row (headline) | `/tools/${t.slug}` | `/tools/<slug>` | OK |
| All tools "Open" | `t.openToolHref` | App route | OK |
| Related links | `r.href` from getRelatedTools | `/tools/<slug>` | OK — RelatedToolResolver |
| "Sports App" | ROUTES.app() | `/app` | OK |
| "Bracket Challenge" | ROUTES.bracket() | `/bracket` | OK |
| "AllFantasy Legacy" | ROUTES.afLegacy() | `/af-legacy` | OK |
| "Chimmy AI" | ROUTES.chimmy() | `/chimmy` | OK |
| "Back to AllFantasy Home" | ROUTES.home() | `/` | OK |

### 4.3 Footer (SeoLandingFooter)

| Control | Target | Expected | Result |
|---------|--------|----------|--------|
| Logo / © | `/` | Home | OK |
| Home | `/` | Home | OK |
| Tools Hub | `/tools-hub` | Tools hub | OK |
| App | `/app` | App | OK |
| Bracket | `/bracket` | Bracket landing | OK |
| Legacy | `/af-legacy` | Legacy | OK |
| Trade | `/trade-analyzer` | Trade analyzer app route | OK (direct app link) |
| Chimmy AI | `/chimmy` | Chimmy | OK |
| Sign In | loginUrlWithIntent('/dashboard') | Login with redirect | OK |
| Sign Up | signupUrlWithIntent('/dashboard') | Signup with redirect | OK |

### 4.4 Landing CTA strip (LandingCTAStrip)

| Control | Target | Result |
|---------|--------|--------|
| Primary CTA | `primaryHref` (e.g. `/trade-evaluator`) | OK |
| Sign Up | `/signup?next=<primaryHref>` | OK |
| Sign In | `/login?next=<primaryHref>` | OK |

### 4.5 Route existence check

- `/`, `/app`, `/tools-hub`, `/bracket`, `/brackets`, `/af-legacy`, `/trade-analyzer`, `/chimmy`, `/waiver-ai`, `/mock-draft`, `/trade-evaluator` — all have corresponding app routes or redirects.
- `/tools/<slug>` for each TOOL_SLUG and `/sports/<slug>` for each SPORT_SLUG — static params generated; invalid slug returns 404.

---

## 5. QA findings

### 5.1 Metadata generation

- **Tool/sport pages:** Title and description come from config; canonical is `https://allfantasy.ai/tools/<slug>` or `.../sports/<slug>`.
- **Waiver AI / Trade Analyzer:** Layouts inject metadata via SEOPageResolver + MetadataInjectionService; no longer client-only without meta.
- **Robots:** index/follow set on SEO pages; no noindex on these landings.

### 5.2 Page indexing compatibility

- Canonicals and alternates in place; no duplicate canonical issues.
- JSON-LD valid (WebSite, Organization, SoftwareApplication, FAQPage); SearchAction target is string URL (compatible with validators).
- Sitemap: not implemented in this deliverable; recommend adding `app/sitemap.ts` that includes `/`, `/tools-hub`, `/tools/*`, `/sports/*` for full indexing.

### 5.3 Social share previews

- OG and Twitter metadata set on all SEO landings; share buttons use same title/description/canonical URL.
- Default OG image path used where no page-specific image; ensure `/public/og-image.jpg` exists for production.

---

## 6. Issues fixed

| Issue | Fix |
|-------|-----|
| `/waiver-ai` had no metadata (client-only page) | Added `app/waiver-ai/layout.tsx` with getSEOPageConfig("waiver-ai") + buildMetadata(). |
| `/trade-analyzer` had no layout metadata | Added `app/trade-analyzer/layout.tsx` with getSEOPageConfig("trade-analyzer") + buildMetadata(). |
| No share buttons on SEO landings | Added `ShareButtons` component using SocialShareMetadataService; placed on tool landings with getToolCanonical + config title/description. |
| Tool pages had no tool-specific structured data | Added `ToolPageJsonLd` (SoftwareApplication + optional FAQPage); rendered in `app/tools/[tool]/page.tsx`. |

---

## 7. ASO and PWA notes

- **Landing clarity:** Tool and sport landings clearly describe fantasy tools, mock drafts, trade analyzers, waiver wire, bracket challenges; titles and descriptions target relevant keywords.
- **Mobile:** Responsive layout and links; no PWA manifest or service worker added in this deliverable (can be added separately for installability).
- **Discovery:** Tools hub and tool/sport pages interlink; footer and CTAs drive users to app routes and key experiences.

---

## 8. Files touched (reference)

- **New:** `lib/seo/SEOPageResolver.ts`, `MetadataInjectionService.ts`, `StructuredDataResolver.ts`, `SocialShareMetadataService.ts`, `lib/seo/index.ts`; `components/seo/ShareButtons.tsx`; `app/waiver-ai/layout.tsx`, `app/trade-analyzer/layout.tsx`.
- **Modified:** `app/layout.tsx` (DefaultJsonLd); `components/seo/JsonLd.tsx` (ToolPageJsonLd); `app/tools/[tool]/page.tsx` (ToolPageJsonLd), `app/tools/[tool]/ToolLandingClient.tsx` (ShareButtons).
- **Existing (unchanged):** `lib/seo-landing/config.ts`, `app/tools/[tool]/page.tsx` generateMetadata, `app/sports/[sport]/page.tsx`, `app/tools-hub/page.tsx`, `app/brackets/layout.tsx`, `lib/tool-hub/*`, `components/landing/SeoLandingFooter.tsx`, `components/landing/RelatedToolsSection.tsx`, `components/landing/LandingCTAStrip.tsx`.
