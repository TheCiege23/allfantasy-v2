# Prompt 69 — Language + Theme + Timezone Preferences + Full UI Click Audit (Deliverable)

## 1. Preference System Architecture

- **Scope:** Language (EN/ES), theme (Light/Dark/AF Legacy), and timezone (U.S., Canada, Mexico IANA) are universal preferences used across Sports App, Bracket Challenge, Legacy, settings, dashboards, and auth surfaces.
- **Storage:**
  - **Server:** `UserProfile.preferredLanguage`, `UserProfile.themePreference`, `UserProfile.timezone`. Read via `GET /api/user/profile`; write via `PATCH /api/user/profile`.
  - **Client (before auth or for immediate UI):** Language and theme are mirrored in `localStorage` (`af_lang`, `af_mode`) so the UI can apply them before or without a session. Timezone is not stored in localStorage; it is only on the server and is used when the user is authenticated (e.g. settings form, time formatting).
- **Sync on load:** When the user is authenticated, `SyncProfilePreferences` runs once: it calls `GET /api/user/profile`, then applies `preferredLanguage` and `themePreference` to the LanguageProvider and ThemeProvider and writes them to `localStorage`. This keeps post-login and post-refresh UI in sync with the server.
- **Persistence from toggles:** Header/nav language and theme toggles (ModeToggle, LanguageToggle) update local state and, when the user is authenticated, also call `PATCH /api/user/profile` with the new value so preferences persist across devices and sessions.
- **Modules:** `lib/preferences/` provides LanguagePreferenceService, ThemePreferenceService, TimezonePreferenceService (validation/defaults), UniversalPreferenceSyncService (parse API response for sync), ThemeResolver, LocalizedRouteShellResolver, and TimezoneFormattingResolver. `hooks/useUserTimezone` exposes timezone and formatters for components.

---

## 2. Language / Theme / Timezone Persistence Logic

- **Language**
  - **Read:** On load, `LanguageProviderClient` reads `af_lang` from localStorage (and optionally browser language). When authenticated, `SyncProfilePreferences` overwrites with `preferredLanguage` from API and calls `setLanguage` + `setStoredLanguage`.
  - **Write:** User changes language via LanguageToggle or Settings Preferences → `setLanguage` (and `setStoredLanguage`). If authenticated, LanguageToggle also PATCHes `preferredLanguage`. Settings Save PATCHes profile and then sets localStorage.
- **Theme**
  - **Read:** Layout script (beforeInteractive) sets `document.documentElement.dataset.mode` from `af_mode` to avoid flash. ThemeProvider initializes from that or localStorage, then syncs to `dataset.mode` and localStorage. When authenticated, `SyncProfilePreferences` applies `themePreference` from API via `setMode` + `setStoredTheme`.
  - **Write:** User changes theme via ModeToggle or Settings Preferences → ThemeProvider `setMode`/`cycleMode` (and ThemePreferenceService writes localStorage). If authenticated, ModeToggle also PATCHes `themePreference`. Settings Save PATCHes and sets localStorage.
- **Timezone**
  - **Read:** Only from server. Settings and any component that needs it use `GET /api/user/profile` (e.g. via `useSettingsProfile` or `useUserTimezone`).
  - **Write:** User sets timezone in Settings Preferences → Save PATCHes `timezone`. Signup/register also persists timezone (and preferredLanguage) to UserProfile.

---

## 3. Backend Preference Sync Updates

- **Existing:** `GET /api/user/profile` already returns `preferredLanguage`, `timezone`, `themePreference`. `PATCH /api/user/profile` already accepts and persists them. No backend API changes were required.
- **Sync usage:** `SyncProfilePreferences` uses `parseProfileForSync` from `UniversalPreferenceSyncService` to normalize the API response and then applies language and theme to providers and localStorage. Timezone is available on the same response for components that consume profile (e.g. settings form, `useUserTimezone`).

---

## 4. Frontend Selector / Toggle Updates

- **SyncProfilePreferences:** Now syncs both language and theme from API when authenticated: calls `parseProfileForSync(data)`, then `resolveLanguage`/`resolveTheme`, then `setLanguage`/`setStoredLanguage` and `setMode`/`setStoredTheme`. Theme was previously not synced from server; now it is.
- **ModeToggle:** On click, cycles theme (unchanged) and, when `session?.user` exists, PATCHes `/api/user/profile` with `themePreference: next` so the choice persists across devices.
- **LanguageToggle:** On EN/ES click, sets language (unchanged) and, when `session?.user` exists, PATCHes `/api/user/profile` with `preferredLanguage: "en"` or `"es"`.
- **Settings Preferences:** Unchanged behavior: language, timezone, theme selectors; Save PATCHes all three and updates localStorage for language and theme. Added a “Your local time: …” line under the timezone selector when a timezone is selected, using `formatInTimezone(new Date(), timezone)`.
- **Signup:** Language and timezone selectors and register API already persist to UserProfile; no change.
- **New:** `hooks/useUserTimezone` returns `timezone` and `formatInTimezone`/`formatTimeInTimezone`/`formatDateInTimezone` for use anywhere (game times, deadlines, schedules).

---

## 5. Full UI Click Audit Findings

| Location | Element | Handler | State / API | Persisted Reload | Status |
|----------|--------|---------|-------------|------------------|--------|
| **Layout (beforeInteractive)** | — | Script reads `af_mode` | Sets `document.documentElement.dataset.mode` | Prevents theme flash | OK |
| **ThemeProvider** | — | Init from dataset/localStorage | mode state; writes dataset + af_mode | Yes | OK |
| **ThemeProvider** | setMode / cycleMode | setModeState | Local state + localStorage | Yes | OK |
| **SyncProfilePreferences** | (on auth) | useEffect fetch profile | parseProfileForSync → setLanguage, setMode, setStored* | API → UI + localStorage | OK |
| **ModeToggle (header/nav)** | Click | handleClick → cycleMode + PATCH | ThemeProvider + PATCH when session | Yes (localStorage + API) | OK |
| **LanguageToggle (header/nav)** | EN button | selectEn → setLanguage("en") + PATCH | LanguageProvider + PATCH when session | Yes | OK |
| **LanguageToggle** | ES button | selectEs → setLanguage("es") + PATCH | Same | Yes | OK |
| **Settings Preferences** | Language buttons | setLang(l) | Local state | — | OK |
| **Settings Preferences** | Timezone select | setTimezone(e.target.value) | Local state | — | OK |
| **Settings Preferences** | Theme buttons | setTheme(t) | Local state | — | OK |
| **Settings Preferences** | Save preferences | handleSubmit → setMode/setLanguage + onSave + localStorage | PATCH profile; af_lang, af_mode | fetchProfile after | OK |
| **Settings Preferences** | “Your local time” | — | formatInTimezone(new Date(), timezone) | — | OK |
| **Signup page** | Timezone select | setTimezone | Sent to register API | UserProfile.timezone | OK |
| **Signup page** | Language select | setPreferredLanguage | Sent to register API | UserProfile.preferredLanguage | OK |
| **GET /api/user/profile** | Sync + Settings + Profile | fetch | Returns preferredLanguage, timezone, themePreference | Yes | OK |
| **PATCH /api/user/profile** | ModeToggle, LanguageToggle, Settings Save | PATCH body | Updates UserProfile | Yes | OK |

**Notes:**

- Theme and language both persist after refresh and re-login: layout script and ThemeProvider read from localStorage; after auth, SyncProfilePreferences overwrites from API so server wins.
- Timezone is applied in settings (“Your local time”) and is available via `useUserTimezone()` for game times, deadlines, and schedules elsewhere.
- No reset button exists for preferences; user can change and save again. Mobile and desktop use the same ModeToggle and LanguageToggle where they are rendered (e.g. HomeTopNav).

---

## 6. QA Findings

- **Positive:** Language and theme sync from server on login/refresh; header toggles persist to API when authenticated; settings Save persists all three and updates localStorage for language/theme; timezone is shown in settings and formatters are available.
- **Edge cases:** If API fails during sync, localStorage/current provider state is unchanged. If PATCH fails from a toggle, local state and localStorage are already updated; next sync will reapply server value.
- **Gaps (by design):** Timezone is not synced to a global client store for unauthenticated users (no timezone until signup/settings). Language/theme for guests are localStorage-only until they sign in.

---

## 7. Issues Fixed

1. **Theme not synced from server:** SyncProfilePreferences previously only applied `preferredLanguage`. It now also applies `themePreference` via `setMode` and `setStoredTheme` so theme persists after refresh and re-login and matches the server.
2. **Header toggles not persisting to server:** ModeToggle and LanguageToggle only updated local state and localStorage. They now PATCH `/api/user/profile` when the user is authenticated so language and theme are stored on the server and stay in sync across devices.
3. **No single place for preference helpers:** Added `lib/preferences/` with LanguagePreferenceService, ThemePreferenceService, TimezonePreferenceService, UniversalPreferenceSyncService, ThemeResolver, LocalizedRouteShellResolver, and TimezoneFormattingResolver so all preference logic and formatting are consistent and reusable.
4. **Timezone not visibly applied:** Settings Preferences now shows “Your local time: …” when a timezone is selected, and `useUserTimezone` + `formatInTimezone` are available for use in game times, deadlines, and schedules across the app.

---

## 8. Final QA Checklist

- [ ] **Language:** Change language via header LanguageToggle; refresh → language unchanged. Change via Settings Preferences and Save; refresh → language unchanged. Log out, log in → language matches last saved.
- [ ] **Theme:** Change theme via header ModeToggle (or floating GlobalModeToggle); refresh → theme unchanged. Change via Settings Preferences and Save; refresh → theme unchanged. Log out, log in → theme matches last saved.
- [ ] **Timezone:** Set timezone in Settings Preferences and Save; refresh → timezone still selected. “Your local time” updates when timezone is selected and shows correct local time.
- [ ] **Signup:** Complete signup with timezone and language selected; confirm they appear in profile/settings after login.
- [ ] **Mobile/desktop:** Use language and theme toggles on mobile and desktop; confirm both update UI and, when authenticated, persist after refresh.
- [ ] **Redirect after auth:** Log in from a callback URL; confirm theme and language are applied (sync runs after session is established).

---

## 9. Explanation of the Universal Preferences System

The system treats **language**, **theme**, and **timezone** as universal preferences:

- **Language (EN/ES):** Stored in `UserProfile.preferredLanguage` and in `localStorage` (`af_lang`). The LanguageProvider drives all `t()` translations. On load, if the user is authenticated, server values overwrite localStorage so cross-device and post-login behavior is consistent. Header and settings changes update both the provider and, when logged in, the API.
- **Theme (Light/Dark/AF Legacy):** Stored in `UserProfile.themePreference` and in `localStorage` (`af_mode`). A layout script runs before paint to set `data-mode` from localStorage and avoid flash. ThemeProvider keeps the DOM and localStorage in sync. When authenticated, sync from API runs once and applies server theme. Header and settings changes update the provider and, when logged in, the API.
- **Timezone (U.S./Canada/Mexico):** Stored only in `UserProfile.timezone`. It is used for “Your local time” in settings and, via `useUserTimezone()` and `formatInTimezone`, for any component that displays times (game times, league deadlines, schedules). No localStorage; timezone is always sourced from the profile when available.

**Core modules:** `LanguagePreferenceService` and `ThemePreferenceService` handle localStorage read/write. `TimezonePreferenceService` defines the default and validation. `UniversalPreferenceSyncService` defines the sync contract and `parseProfileForSync`. `ThemeResolver` and `LocalizedRouteShellResolver` provide validation and defaults for theme and language. `TimezoneFormattingResolver` provides `formatInTimezone`, `formatTimeInTimezone`, and `formatDateInTimezone` for consistent display. Together they give a single, consistent way to read, write, sync, and apply language, theme, and timezone across the platform.
