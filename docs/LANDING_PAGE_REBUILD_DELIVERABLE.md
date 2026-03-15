# AllFantasy Main Landing Page Rebuild – Deliverable

## 1. Landing Page Architecture

- **Root**: Single landing at `/` (`app/page.tsx`), client-rendered with `Suspense`, using existing `ThemeProvider`, `LanguageProviderClient`, and `SessionAppProvider` from root layout.
- **Header**: Dedicated landing header in `components/navigation/HomeTopNav.tsx`: logo (AllFantasy Crest), Sign In / Sign Up when unauthenticated; when authenticated: username, Settings, NotificationBell; Admin Crest (only when `isAdmin` from `GET /api/user/me`); Language toggle (EN/ES); Theme toggle (Light / Dark / AF Legacy).
- **Sections (top to bottom)**:
  - Hero: crest, headline “AI-Powered Fantasy Sports Tools”, subtext, three **stacked vertical** CTAs (Open Sports App → `/app`, NCAA Bracket Challenge → `/bracket`, Open AllFantasy Legacy → `/af-legacy`), plus Trade Analyzer teaser link.
  - Vertical product section: three feature cards (Sports App, Bracket Challenge, AllFantasy Legacy), each with icon, description, supported sports where applicable, and primary CTA.
  - Popular Fantasy Tools: five tool cards (Trade Analyzer, Mock Draft Simulator, Waiver Wire Advisor, AI Draft Assistant, Matchup Simulator) with icon, title, short description, and “Open” CTA.
  - Engagement: Trending Features (Trending Players, Draft Strategies, Bracket Leaderboards), Quick Tools (Trade Analyzer, Mock Draft, Power Rankings), and Chimmy AI section with “Ask Chimmy” CTA.
  - Trust: three bullet trust signals.
  - Footer: crest, year, links to Sports App, Bracket, Legacy, Trade Analyzer, Sign In, Sign Up.

**Preserved**: Routing (`/`, `/app`, `/bracket`, `/brackets`, `/af-legacy`, `/legacy`, `/trade-analyzer`, `/login`, `/signup`, `/admin`, etc.), authentication (NextAuth, session), theme system (ThemeProvider, `data-mode`, CSS variables), localization (LanguageProviderClient, EN/ES), and sport scope (NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer via `lib/sport-scope.ts` and i18n).

---

## 2. Updated Page Layout

- **Hero**: Centered; crest image; tagline pill; H1 from `home.title`; subtitle from `home.subtitle`; three full-width stacked buttons (max-width 20rem) for Sports App, Bracket, Legacy; small Trade Analyzer link below.
- **Product section**: Single column (max-width 48rem), three cards stacked vertically with motion on scroll; each card: icon + title, body copy, optional sports line (Sports App only), primary button.
- **Tools**: Grid (1 col mobile, 2–3 cols larger); each tool: icon, title, description, CTA button linking to the correct route.
- **Engagement**: Three subsections in one block: Trending (pill links), Quick Tools (pill links), Chimmy (card with icon, title, body, “Ask Chimmy” button).
- **Trust & footer**: Same structure as before; footer links and auth links preserved.
- **Mobile**: All sections stack vertically; CTAs and buttons use min-height (44–48px) for thumb reach; no horizontal overflow; text scales with viewport.

---

## 3. Theme Toggle Implementation

- **Component**: `components/theme/ModeToggle.tsx` — uses `useThemeMode()` from `ThemeProvider`; cycles `light` → `dark` → `legacy` on click; label: “Light” | “Dark” | “AF Legacy”; `title`/`aria-label`: “Light Mode” | “Dark Mode” | “AF Legacy Mode”.
- **Provider**: `components/theme/ThemeProvider.tsx` — state `AppMode`: `"dark" | "light" | "legacy"`; persisted in `localStorage` key `af_mode`; applied to `document.documentElement.dataset.mode`; default is `legacy`.
- **Root layout**: Inline script before body runs before hydration and sets `data-mode` from `localStorage` to avoid flash.
- **CSS**: `app/globals.css` — `html[data-mode="light"]`, `html[data-mode="dark"]`, `html[data-mode="legacy"]` define `--bg`, `--text`, `--panel`, `--border`, accents, etc. Legacy mode uses purple/emerald accents (retro); light uses light backgrounds; dark uses dark backgrounds. No new theme modes added; labels and accessibility improved.

---

## 4. Language Toggle Implementation

- **Component**: `components/i18n/LanguageToggle.tsx` — two buttons “EN” and “ES”; uses `useLanguage()` from `LanguageProviderClient`; `setLanguage("en")` / `setLanguage("es")` on click; active language styled (e.g. filled background).
- **Provider**: `components/i18n/LanguageProviderClient.tsx` — context holds `language` and `t(key)`; translations for `en` and `es` include all new landing keys (`home.tools.*`, `home.trending.*`, `home.quick.*`, `home.chimmy.*`, `home.products.app.sports`).
- **Placement**: Language toggle is in `HomeTopNav` (desktop and mobile), so it appears on the main landing header for every user.

---

## 5. SEO Updates

- **Layout** (`app/layout.tsx`):
  - **Title**: `AllFantasy – AI Powered Fantasy Sports Tools`
  - **Description**: `AllFantasy combines fantasy sports leagues, bracket challenges, and AI-powered tools to help players draft smarter, analyze trades, and dominate their leagues.`
  - **Keywords**: `fantasy sports`, `fantasy football tools`, `fantasy trade analyzer`, `AI fantasy sports`, `fantasy bracket challenge`
  - **Open Graph**: Same title and description; URL `https://allfantasy.ai/`, siteName AllFantasy, type website.
  - **Twitter**: Same title and description; card `summary_large_image`.
- **Page**: `app/page.tsx` still outputs JSON-LD `SoftwareApplication` schema with name, applicationCategory, description, url, offers (free). Canonical and robots remain in layout.

---

## 6. Routing Verification

| Route | Purpose | Status |
|-------|---------|--------|
| `/` | Main landing | ✅ `app/page.tsx` |
| `/app` | Sports App entry | ✅ `app/app/page.tsx` |
| `/bracket` | Bracket Challenge landing | ✅ `app/bracket/page.tsx` |
| `/brackets` | Bracket hub (leagues, join) | ✅ `app/brackets/page.tsx` |
| `/af-legacy` | AllFantasy Legacy app | ✅ `app/af-legacy/page.tsx` |
| `/legacy` | Legacy overview/alt entry | ✅ `app/legacy/page.tsx` |
| `/trade-analyzer` | Trade Analyzer | ✅ `app/trade-analyzer/page.tsx` |
| `/mock-draft` | Mock draft (auth required) | ✅ `app/mock-draft/page.tsx` (redirects to login if not signed in) |
| `/waiver-ai` | Waiver Wire Advisor | ✅ `app/waiver-ai/page.tsx` |
| `/app/simulation-lab` | Matchup/simulation | ✅ `app/app/simulation-lab/page.tsx` |
| `/app/power-rankings` | Power Rankings | ✅ `app/app/power-rankings/page.tsx` |
| `/app/meta-insights` | Meta insights / trends | ✅ `app/app/meta-insights/page.tsx` |
| `/login` | Sign in | ✅ `app/login/page.tsx` |
| `/signup` | Sign up | ✅ `app/signup/page.tsx` |
| `/admin` | Admin panel (protected) | ✅ `app/admin/page.tsx` |
| `/af-legacy?tab=chat` | Chimmy AI chat | ✅ Same app, tab=chat |
| `/af-legacy?tab=mock-draft` | Draft tools in Legacy | ✅ Same app, tab=mock-draft |

All links on the landing page point to these routes; no dead links.

---

## 7. UI Click Audit Findings

| Element | Component / Location | Handler / Route | Verified |
|--------|----------------------|-----------------|----------|
| Sign In | HomeTopNav | `Link` to `/login` | ✅ |
| Sign Up | HomeTopNav | `Link` to `/signup` | ✅ |
| Admin Crest | HomeTopNav | `Link` to `/admin`, rendered only when `isAdmin` (from `/api/user/me`) | ✅ |
| Sports App (hero) | page.tsx Hero | `Link` to `/app` | ✅ |
| NCAA Bracket Challenge (hero) | page.tsx Hero | `Link` to `/bracket` | ✅ |
| Open AllFantasy Legacy (hero) | page.tsx Hero | `Link` to `/af-legacy` | ✅ |
| Trade Analyzer teaser | page.tsx Hero | `Link` to `/trade-analyzer` | ✅ |
| Sports App card CTA | Product section | `Link` to `/app` | ✅ |
| Bracket card CTA | Product section | `Link` to `/bracket` | ✅ |
| Legacy card CTA | Product section | `Link` to `/af-legacy` | ✅ |
| Trade Analyzer tool | Popular Tools | `Link` to `/trade-analyzer` | ✅ |
| Mock Draft tool | Popular Tools | `Link` to `/mock-draft` | ✅ |
| Waiver Advisor tool | Popular Tools | `Link` to `/waiver-ai` | ✅ |
| AI Draft Assistant tool | Popular Tools | `Link` to `/af-legacy?tab=mock-draft` | ✅ |
| Matchup Simulator tool | Popular Tools | `Link` to `/app/simulation-lab` | ✅ |
| Trending Players | Engagement | `Link` to `/app/meta-insights` | ✅ |
| Draft Strategies | Engagement | `Link` to `/af-legacy?tab=mock-draft` | ✅ |
| Bracket Leaderboards | Engagement | `Link` to `/brackets` | ✅ |
| Jump to Trade Analyzer | Quick Tools | `Link` to `/trade-analyzer` | ✅ |
| Start a Mock Draft | Quick Tools | `Link` to `/mock-draft` | ✅ |
| View Power Rankings | Quick Tools | `Link` to `/app/power-rankings` | ✅ |
| Ask Chimmy | Chimmy section | `Link` to `/af-legacy?tab=chat` | ✅ |
| Language toggle (EN/ES) | HomeTopNav, LanguageToggle | `setLanguage("en")` / `setLanguage("es")` | ✅ |
| Theme toggle | HomeTopNav, ModeToggle | `cycleMode()` (light → dark → legacy) | ✅ |
| Settings (authenticated) | HomeTopNav | `onClick` opens SettingsModal | ✅ |
| Footer: Sports App, Bracket, Legacy, Trade | Footer | `Link` to `/app`, `/bracket`, `/af-legacy`, `/trade-analyzer` | ✅ |
| Footer: Sign In, Sign Up | Footer | `Link` to `/login`, `/signup` | ✅ |

**Backend**: Sign In/Sign Up use NextAuth; Admin visibility uses `GET /api/user/me` (session + `resolveAdminEmail`). No dead buttons or incorrect redirects found.

---

## 8. QA Findings

- **Header**: Sign In/Sign Up show when logged out; when logged in, username, Settings, NotificationBell, Language, Theme, and (if admin) Admin Crest display correctly.
- **Hero CTAs**: Three buttons stack vertically and are centered; all navigate to the correct destinations.
- **Product cards**: All three cards have working primary CTAs; Sports App card shows supported sports line (NFL, NBA, MLB, NHL, Soccer, NCAA).
- **Tool cards**: All five tools link to the correct pages; `/mock-draft` may redirect to login when not authenticated (intended).
- **Chimmy**: “Ask Chimmy” goes to `/af-legacy?tab=chat` where Chimmy chat is available.
- **Language**: EN/ES toggle updates `language` and all `t()` strings on the page (including new keys).
- **Theme**: Cycle Light → Dark → AF Legacy updates `data-mode` and CSS variables; no flash when reload (script in layout).
- **Mobile**: Layout stacks; buttons remain thumb-friendly; no overflow observed in the described layout.

---

## 9. Issues Fixed

- **Admin on landing**: Landing is client-only; admin status was not available. **Fix**: Added `GET /api/user/me` returning `{ user, isAdmin }` and `HomeTopNav` fetches it when authenticated to show Admin Crest.
- **Header for landing**: Header previously had mock league dropdown and search, and did not show Sign In/Sign Up explicitly. **Fix**: Rebuilt `HomeTopNav` for landing: Logo, Sign In, Sign Up (or user + Settings + NotificationBell when authed), Language toggle, Theme toggle, Admin Crest (when isAdmin).
- **Legacy CTA target**: Prompt asked for “Open AllFantasy Legacy” to go to the full Legacy experience. **Fix**: Hero and product Legacy CTA link to `/af-legacy` (full app) instead of `/legacy`.
- **Bracket CTA**: “NCAA Bracket Challenge” links to `/bracket` (landing); Bracket Hub and leaderboards link to `/brackets` where applicable.
- **Unused import**: Removed unused `lazy` import from `app/page.tsx`.
- **Theme toggle a11y**: ModeToggle now has `title` and `aria-label` (“Light Mode”, “Dark Mode”, “AF Legacy Mode”).

---

## 10. Final QA Checklist

- [x] Hero shows AllFantasy Crest, headline, subtext, and three stacked vertical CTAs (Sports App, Bracket, Legacy).
- [x] Header shows Logo, Sign In, Sign Up (when not authenticated).
- [x] Header shows Admin Crest only for admin users (after loading `/api/user/me`).
- [x] Language toggle (EN/ES) present and switches copy.
- [x] Theme toggle (Light / Dark / AF Legacy) present and cycles mode.
- [x] All product card CTAs navigate to `/app`, `/bracket`, `/af-legacy`.
- [x] All Popular Fantasy Tools cards link to correct routes (trade-analyzer, mock-draft, waiver-ai, af-legacy?tab=mock-draft, app/simulation-lab).
- [x] Trending and Quick Tools links work (meta-insights, af-legacy?tab=mock-draft, brackets, trade-analyzer, mock-draft, app/power-rankings).
- [x] “Ask Chimmy” links to `/af-legacy?tab=chat`.
- [x] SEO: title, description, keywords, Open Graph, Twitter set in layout.
- [x] Mobile: sections stack; buttons min-height 44–48px; no overflow.
- [x] Routing and auth flows preserved; sport scope (NFL, NHL, NBA, MLB, NCAA, Soccer) respected in platform and i18n.

---

## 11. Explanation of the Landing Page Design

- **Simple and high-conversion**: One clear hero with a single value proposition (“AI-Powered Fantasy Sports Tools”) and three primary actions (Sports App, Bracket, Legacy) stacked so the user chooses one path without distraction. No competing hero CTAs or dense nav.
- **Modern and clean**: Framer Motion for subtle scroll-in on product and tool cards; consistent spacing and max-widths; pill and card styling aligned with existing mode variables (emerald/sky/amber accents). Trust strip and footer stay minimal.
- **Mobile-first**: Single column, full-width stacked CTAs (max-width 20rem in hero), touch-friendly button heights, and header that collapses to logo + auth + toggles (with language on mobile row). No horizontal scroll.
- **SEO and ASO**: Title and description target “AI powered fantasy sports tools,” “trade analyzer,” “bracket challenge,” “league management,” “mock drafts” for both search and future app store reuse. Keywords and JSON-LD support discoverability.
- **Preserved entry points**: Sports App (`/app`), Bracket Challenge (`/bracket` → `/brackets`), Legacy (`/af-legacy`), Trade Analyzer (`/trade-analyzer`), admin (`/admin`), and theme/localization behavior are unchanged; only the landing content and header were rebuilt to match the prompt and audit.
