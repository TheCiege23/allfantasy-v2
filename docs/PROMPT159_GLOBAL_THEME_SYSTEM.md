# PROMPT 159 — Global Theme System

## Scope

Implemented universal Light / Dark / AF Legacy theme behavior across:

- Landing page
- Sports app
- AI tools
- Dashboard

## Core theme context updates

- `ThemeProvider` now syncs theme to:
  - `html[data-mode]`
  - `localStorage.af_mode`
  - cookie `af_mode`
  - `document.documentElement.style.colorScheme`
- Added cross-tab synchronization with `storage` event listener.
- Added shared theme constants for cookie + storage keys.

## Server + hydration updates

- `app/layout.tsx` now reads `af_mode` cookie server-side and sets initial `html[data-mode]`.
- Before-interactive mode script now:
  - prefers `localStorage.af_mode` if valid
  - otherwise keeps server-provided `data-mode`
  - sets `color-scheme` immediately
- `body` now includes `mode-readable` to enforce global readability transforms.

## Universal visibility hardening

- Added global visibility helpers in `globals.css`:
  - `.mode-logo-safe`
  - `.mode-wordmark-safe`
- Updated global nav surfaces to use real crest image and safe classes:
  - `components/navigation/HomeTopNav.tsx`
  - `components/shared/GlobalTopNav.tsx`
  - `components/navigation/AppShellNav.tsx`
- Hero crest now uses `.mode-logo-safe`.

## Mandatory click audit checklist

- [ ] Theme toggle changes among Light, Dark, AF Legacy.
- [ ] Theme persists after full refresh (`html[data-mode]` remains selected mode).
- [ ] Theme persists after login/logout/login flow for same account.
- [ ] Landing logo/wordmark remain visible in all three themes.
- [ ] Sports app nav crest + lettering remain visible in all three themes.
- [ ] AI tools nav crest + lettering remain visible in all three themes.
- [ ] Dashboard nav crest + lettering remain visible in all three themes.

