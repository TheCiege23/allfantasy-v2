# PROMPT 159 — Global Theme System QA Checklist

## Themes

| Theme      | Value   | Display name |
|-----------|---------|--------------|
| Light     | `light` | Light        |
| Dark      | `dark`  | Dark         |
| AF Legacy | `legacy`| AF Legacy    |

Themes apply across: **Landing page**, **Sports app**, **AI tools**, **Dashboard** (ThemeProvider wraps root layout).

---

## Mandatory click audit

### Theme toggle works

- [ ] **Global toggle (bottom-right)** — On any non-admin page, the floating theme button is visible. Click cycles: **Light → Dark → AF Legacy → Light**. Label updates immediately (Light / Dark / AF Legacy).
- [ ] **Landing** — Toggle present; cycle works; hero and sections re-render with correct theme (light/dark/legacy palette).
- [ ] **Sports app** (`/app`, `/app/home`, league pages) — Toggle present; cycle works; UI uses `var(--bg)`, `var(--text)`, etc. correctly.
- [ ] **AI tools** (e.g. `/trade-analyzer`, `/waiver-ai`, `/chimmy`) — Toggle present; cycle works.
- [ ] **Dashboard** (e.g. `/app/home`, tools hub) — Toggle present; cycle works.
- [ ] **Admin** (`/admin`) — Toggle is hidden (by design). Theme still applies if set before navigating to admin.

### Theme persists across refresh

- [ ] Set theme to **Light** → Refresh page → Theme remains Light (no flash of wrong theme).
- [ ] Set theme to **Dark** → Refresh → Theme remains Dark.
- [ ] Set theme to **AF Legacy** → Refresh → Theme remains AF Legacy.
- [ ] **No flash** — Layout script runs before paint and sets `data-mode` from `localStorage.af_mode`; ThemeProvider then syncs. No visible flicker to a different theme on load.

### Theme persists across login

- [ ] **Before login:** Set theme to **Dark** (or Light / AF Legacy). Log in. Theme should remain **Dark** (or the one you set). If the user’s profile has a saved `themePreference`, that value is applied once after auth (SyncProfilePreferences).
- [ ] **After login:** Change theme via toggle. Refresh. Theme should still be the chosen one (saved to both localStorage and, when logged in, PATCHed to profile).
- [ ] **Cross-device (optional):** On device A, set theme and ensure you’re logged in (so profile is PATCHed). On device B, log in with same user. After SyncProfilePreferences runs, theme on B should match profile (device A’s last choice) or localStorage on B if profile hasn’t been set yet.

---

## Files (merged theme context)

| File | Role |
|------|------|
| `lib/theme/constants.ts` | Theme ids, display names, storage key, default, resolveTheme, getNextTheme |
| `lib/theme/index.ts` | Re-exports for theme system |
| `components/theme/ThemeProvider.tsx` | Global context; reads/writes `data-mode` and localStorage; uses lib/theme |
| `components/theme/ModeToggle.tsx` | Cycle theme; PATCH profile when logged in; uses getThemeDisplayName, getNextTheme |
| `components/theme/GlobalModeToggle.tsx` | Renders ModeToggle fixed bottom-right; hidden on /admin |
| `lib/preferences/ThemePreferenceService.ts` | getStoredTheme / setStoredTheme; uses THEME_STORAGE_KEY, resolveTheme |
| `lib/preferences/ThemeResolver.ts` | Re-exports resolveTheme, isValidTheme, THEME_MODES for backward compatibility |
| `components/auth/SyncProfilePreferences.tsx` | On auth, GET profile and set theme (setMode + setStoredTheme) so theme persists across login |
| `app/layout.tsx` | ThemeProvider wraps app; beforeInteractive script sets data-mode from af_mode |

---

## Storage and API

- **localStorage key:** `af_mode` (value: `light` | `dark` | `legacy`).
- **Profile:** `UserProfile.themePreference` (same values). Read via GET `/api/user/profile`; write via PATCH with `themePreference`.
- **Default:** `legacy` (AF Legacy) when nothing is stored.
