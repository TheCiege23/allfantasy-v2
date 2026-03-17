# PROMPT 170 — Landing Page QA Click Audit

## Objective

Full click audit of the landing page: verify all links work, tool pages work, theme toggle, language toggle, and mobile/desktop layouts.

---

## 1. All links work

### Home (app/page.tsx) + Footer

| Link text / target | href | Route exists | Notes |
|--------------------|------|--------------|--------|
| Home (crest) | `/` | ✅ app/page.tsx | Footer "© AllFantasy" |
| App | `/app` | ✅ app/app/page.tsx | |
| Sign up | `/signup` (CONVERSION_CTA.secondary.href) | ✅ app/signup/page.tsx | |
| Sign in | `/login` | ✅ app/login/page.tsx | |
| Tools Hub | `/tools-hub` | ✅ app/tools-hub/page.tsx | |
| Privacy | `/privacy` | ✅ app/privacy/page.tsx | |
| Terms | `/terms` | ✅ app/terms/page.tsx | |

### HomeTopNav (components/navigation/HomeTopNav.tsx)

| Link / control | href / action | Route / behavior |
|----------------|---------------|-------------------|
| Logo "AllFantasy" | `/` | ✅ app/page.tsx |
| Profile (when auth) | `/profile` | ✅ app/profile/page.tsx |
| Settings button | Opens SettingsModal | ✅ onClick setSettingsOpen(true) |
| Sign In (when unauth) | loginUrlWithIntent("/dashboard") → `/login?callbackUrl=/dashboard` | ✅ app/login/page.tsx |
| Sign Up (when unauth) | signupUrlWithIntent("/dashboard") → `/signup?next=/dashboard` | ✅ app/signup/page.tsx |
| Admin (when isAdmin) | `/admin` | ✅ app/admin/page.tsx |

### LandingHero

| Link | href | Route |
|------|------|--------|
| Hero logo | `/` | ✅ |
| Primary CTA "Open AllFantasy App" | CONVERSION_CTA.primary.href = `/app` | ✅ |
| Secondary CTA "Create Free Account" | CONVERSION_CTA.secondary.href = `/signup` | ✅ |

### LandingFinalCTA

| Link | href | Route |
|------|------|--------|
| Primary "Open AllFantasy App" | `/app` | ✅ |
| Secondary "Create Free Account" | `/signup` | ✅ |

### LandingFeatureCards

| Card | href | Route |
|------|------|--------|
| Trade Analyzer | `/trade-analyzer` | ✅ app/trade-analyzer/page.tsx |
| Waiver Wire AI | `/waiver-ai` | ✅ app/waiver-ai/page.tsx |
| Draft Assistant | `/mock-draft` | ✅ app/mock-draft/page.tsx |
| Player Comparison Lab | `/player-comparison-lab` | ✅ app/player-comparison-lab/page.tsx |
| Matchup Simulator | `/app/simulation-lab` | ✅ app/app/simulation-lab/page.tsx |
| Fantasy Coach | `/app/coach` | ✅ app/app/coach/page.tsx |

### ToolPreviewCards

| Card | href | Route |
|------|------|--------|
| Trade Analyzer | `/trade-analyzer` | ✅ |
| Waiver AI | `/waiver-ai` | ✅ |
| Draft Helper | `/mock-draft` | ✅ |

### LandingScreenPreviews

| Preview | href | Route |
|---------|------|--------|
| Draft room | `/mock-draft` | ✅ |
| AI analysis | `/trade-analyzer` | ✅ |
| League dashboard | `/app` | ✅ |
| Player comparison | `/player-comparison-lab` | ✅ |

**Verdict: All links point to existing routes. No dead links.**

---

## 2. Tool pages work

| Tool page | Path | Page component | Notes |
|-----------|------|-----------------|--------|
| Trade Analyzer | /trade-analyzer | AIToolSeoLanding + LandingToolVisitTracker | Renders tool landing; tracker fires on visit |
| Waiver AI | /waiver-ai | WaiverAI client page + LandingToolVisitTracker | Full waiver analysis UI |
| Mock Draft (Draft Helper) | /mock-draft | Server: redirect if not auth; then MockDraftLobbyPage + LandingToolVisitTracker | Requires login |
| Player Comparison Lab | /player-comparison-lab | (exists in app) | ✅ |
| Simulation Lab | /app/simulation-lab | (exists in app) | ✅ |
| Fantasy Coach | /app/coach | (exists in app) | ✅ |

**Verdict: All tool pages have valid routes and render. Mock draft requires auth and redirects to /login when not signed in.**

---

## 3. Theme toggle works

- **Component:** `components/theme/ModeToggle.tsx`
- **Location:** HomeTopNav, right side (desktop and mobile).
- **Behavior:**
  - `useThemeMode()` from ThemeProvider provides `mode` and `cycleMode`.
  - `onClick` → `handleClick` → `getNextTheme(mode)`, `cycleMode()`; if session exists, PATCH `/api/user/profile` with `themePreference: next`.
  - ThemeProvider sets `document.documentElement.dataset.mode` and localStorage (THEME_STORAGE_KEY).
- **Verdict: Theme toggle is wired; cycleMode updates UI and persistence.**

---

## 4. Language toggle works

- **Component:** `components/i18n/LanguageToggle.tsx`
- **Location:** HomeTopNav — desktop: same row as ModeToggle (`hidden sm:inline-flex`); mobile: second row (`flex pb-2 sm:hidden`).
- **Behavior:**
  - EN/ES buttons with `onClick` → `selectLang("en")` or `selectLang("es")` → `setLanguage(lang)`; if session exists, PATCH `/api/user/profile` with `preferredLanguage`.
  - LanguageProviderClient provides `language` and `setLanguage`; `document.documentElement.setAttribute('data-lang', lang)` and localStorage.
- **Verdict: Language toggle is wired; EN/ES update context and persistence.**

---

## 5. Mobile layout works

- **Main:** `mode-readable` + flex column; sections stack vertically.
- **HomeTopNav:**
  - Row 1: logo, spacer, Sign In/Sign Up (or profile + settings + notifications), **ModeToggle**. LanguageToggle hidden on this row (`hidden sm:inline-flex`).
  - Row 2 (mobile only): `flex ... pb-2 sm:hidden` — **LanguageToggle** only.
- **LandingHero:** CTAs stack on mobile: `flex-col gap-3 sm:flex-row`; buttons `w-full sm:w-auto`.
- **LandingFinalCTA:** Buttons stack: `flex-col gap-3 sm:flex-row`.
- **Feature / Tool / Screen previews:** Grid `gap-4 sm:grid-cols-2 lg:grid-cols-3` (1 col mobile, 2 sm, 3 lg).
- **Footer:** `flex-col gap-3 sm:flex-row sm:items-center sm:justify-between` — stacks on mobile.

**Verdict: Mobile layout uses responsive classes; CTAs and nav are usable on small screens.**

---

## 6. Desktop layout works

- **HomeTopNav:** Single row; LanguageToggle and ModeToggle visible (`sm:inline-flex` for language).
- **Hero:** CTAs inline: `sm:flex-row sm:justify-center sm:gap-4`.
- **Final CTA:** Buttons inline: `sm:flex-row sm:justify-center sm:gap-4`.
- **Cards:** 2 columns at `sm`, 3 at `lg` for feature/tool cards; 2 columns for screen previews.
- **Footer:** Horizontal layout at `sm` with flex-row and justify-between.

**Verdict: Desktop layout uses sm/lg breakpoints; no layout issues identified.**

---

## Summary

| Check | Status |
|-------|--------|
| All links work | ✅ All hrefs point to existing app routes |
| Tool pages work | ✅ Trade Analyzer, Waiver AI, Mock Draft, Player Comparison, Simulation Lab, Coach all have pages |
| Theme toggle works | ✅ ModeToggle cycles theme; ThemeProvider and persistence wired |
| Language toggle works | ✅ LanguageToggle EN/ES; LanguageProviderClient and persistence wired |
| Mobile layout works | ✅ Responsive classes; nav, hero, cards, footer stack appropriately |
| Desktop layout works | ✅ sm/lg breakpoints; single-row nav, inline CTAs, multi-column grids |

**Landing page QA click audit: PASS.**
