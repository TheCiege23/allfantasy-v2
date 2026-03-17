# PROMPT 157 — Landing Page QA Checklist

## Routes reference

| Destination | URL | Used by |
|-------------|-----|--------|
| Homepage | `/` | Logo (nav + hero), footer logo |
| Open AllFantasy App | `/app` | Primary CTA (hero), Final CTA primary, footer App |
| Sign Up | `/signup` | Secondary CTA (hero), Final CTA secondary, footer Sign up |
| Sign In | `/login` | Footer Sign in |
| Trade Analyzer | `/trade-analyzer` | Feature card, Screen preview (AI analysis) |
| Waiver Wire AI | `/waiver-ai` | Feature card |
| Draft Assistant | `/mock-draft` | Feature card |
| Player Comparison Lab | `/player-comparison-lab` | Feature card, Screen preview |
| Matchup Simulator | `/app/simulation-lab` | Feature card |
| Fantasy Coach | `/app/coach` | Feature card |
| Draft room preview | `/mock-draft` | Screen preview card |
| League dashboard preview | `/app` | Screen preview card |
| Tools Hub | `/tools-hub` | Footer |

## Mandatory click audit (PROMPT 157 + 158)

**Hero (PROMPT 158):**
- [ ] **Logo (HeroLogo)** — Links to `/` (home). Most visually dominant element.
- [ ] **Primary CTA (HeroCTAGroup)** — “Open AllFantasy App” → `/app`.
- [ ] **Secondary CTA (HeroCTAGroup)** — “Sign Up” → `/signup`.
- [ ] **Hero layout on mobile** — Logo on top, text block, then stacked CTAs; no overflow; tap targets ≥ 48px.

**Landing:**
- [ ] **Open App (hero)** — Primary CTA links to `/app`; opens AllFantasy Sports App entry.
- [ ] **Sign Up (hero)** — Secondary CTA links to `/signup`; no dead button.
- [ ] **Open App (final section)** — Final CTA primary links to `/app`.
- [ ] **Create Free Account (final section)** — Final CTA secondary links to `/signup`.
- [ ] **Tool cards (What you can do)** — Each card links to correct tool page:
  - [ ] Trade Analyzer → `/trade-analyzer`
  - [ ] Waiver Wire AI → `/waiver-ai`
  - [ ] Draft Assistant → `/mock-draft`
  - [ ] Player Comparison Lab → `/player-comparison-lab`
  - [ ] Matchup Simulator → `/app/simulation-lab`
  - [ ] Fantasy Coach → `/app/coach`
- [ ] **Example screen preview cards** — Each card links to the correct page:
  - [ ] Draft room → `/mock-draft`
  - [ ] AI analysis → `/trade-analyzer`
  - [ ] League dashboard → `/app`
  - [ ] Player comparison → `/player-comparison-lab`
- [ ] **Logo (hero)** — AFLogoLarge links to `/` (homepage).
- [ ] **Logo (nav)** — HomeTopNav logo links to `/`.
- [ ] **Footer links** — App, Sign up, Sign in, Tools Hub, Privacy, Terms all resolve; footer logo → `/`.

## Layout

- [ ] **Mobile** — Hero CTAs stack vertically; feature cards and previews readable; no horizontal overflow; tap targets ≥ 44px.
- [ ] **Desktop** — Hero CTAs inline; feature grid 2–3 columns; preview grid 2 columns; footer row layout.

## Content

- [ ] Hero headline: “Fantasy Sports With AI Superpowers”.
- [ ] Hero subheadline: “Run leagues, dominate drafts, analyze trades, and win your season with AI-powered fantasy tools.”
- [ ] Primary CTA label: “Open AllFantasy App”.
- [ ] Secondary CTA label: “Sign Up”.
- [ ] Final section heading: “Start Winning Your League”.
- [ ] Final section buttons: “Open AllFantasy App”, “Create Free Account”.
- [ ] Supported sports (footer or copy): NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer.

## No dead buttons

- Every button and card that looks clickable must have an `href` or `onClick` that navigates or submits. No `#` or `javascript:void(0)` as primary action.

## Files touched

- `app/page.tsx` — Root landing page (replaced).
- `components/landing/LandingHero.tsx` — AFLogoLarge, HeroHeadline, HeroSubheadline, PrimaryCTA, SecondaryCTA.
- `components/landing/LandingFeatureCards.tsx` — Six tool cards.
- `components/landing/LandingScreenPreviews.tsx` — Four example screens.
- `components/landing/LandingSocialProof.tsx` — Users, AI analyses, leagues stats.
- `components/landing/LandingFinalCTA.tsx` — Final CTA section.
