# PROMPT 160 — English / Spanish Language System QA Checklist

## Languages

| Code | Display   |
|------|-----------|
| en   | English   |
| es   | Spanish   |

## Language toggle location

- **Landing page header** — `HomeTopNav`: language toggle (EN / ES) is in the header. Desktop: inline with Sign In / Sign Up and theme toggle. Mobile: second row below main nav with language + theme.
- **Settings page** — `PreferencesSection` on `/settings`: Language row with "English" and "Español" (or "Spanish") buttons; Save persists `preferredLanguage` and writes `af_lang` to localStorage.

## Mandatory click audit

### Language toggle updates UI text

- [ ] **Landing** — Set language to **Spanish** (ES). Headline, subheadline, CTAs, footer, and any `t(...)` text on the landing page should switch to Spanish. Set back to **English** (EN); text should switch to English.
- [ ] **Header** — Toggle shows "Language" (or "Idioma" when in Spanish) and EN / ES buttons. Active language is visually distinct (accent background).
- [ ] **Settings** — On `/settings`, change Language to **Spanish** and Save. Reload or navigate away and back; language preference should remain Spanish. Change to **English** and Save; UI and persisted value should be English.
- [ ] **App / other pages** — Any page that uses `useLanguage()` and `t(key)` should update when the toggle is used (e.g. app landing, trade analyzer, bracket pages that use translations).

### Language persists after refresh

- [ ] Set language to **Spanish** (via header toggle or Settings). Refresh the page (F5 or full reload). Language should still be **Spanish** (no flash to English). `localStorage.af_lang` should be `"es"`.
- [ ] Set language to **English**. Refresh. Language should remain **English**; `localStorage.af_lang` should be `"es"` or `"en"` as last set.
- [ ] **No flash** — Layout script `af-init-lang` runs beforeInteractive and sets `data-lang` on `document.documentElement` from `af_lang`. `LanguageProviderClient` initializes from `dataset.lang` or localStorage so the first paint uses the saved language when possible.

### Optional: persists across login

- [ ] **Before login:** Set language to **Spanish**. Log in. If the user profile has no `preferredLanguage` or it matches, language should stay Spanish. If profile has `preferredLanguage: "en"`, `SyncProfilePreferences` will apply it after auth (language may switch to English).
- [ ] **After login:** Change language via header or Settings and Save. Refresh; language should persist (localStorage + profile if saved).

## Files (merged translation / i18n)

| File | Role |
|------|------|
| `lib/i18n/constants.ts` | LanguageCode, LANG_STORAGE_KEY, DEFAULT_LANG, SUPPORTED_LANGUAGES, getLanguageDisplayName, resolveLanguage |
| `lib/i18n/translations.ts` | Merged translations: `translations.en`, `translations.es` (all UI keys) |
| `lib/i18n/index.ts` | Re-exports for i18n system |
| `components/i18n/LanguageProviderClient.tsx` | Context; reads from dataset.lang / localStorage; uses lib/i18n translations and constants |
| `components/i18n/LanguageToggle.tsx` | EN / ES buttons; PATCH profile when logged in; theme-aware styles; uses getLanguageDisplayName |
| `lib/preferences/LanguagePreferenceService.ts` | getStoredLanguage / setStoredLanguage; uses LANG_STORAGE_KEY, resolveLanguage |
| `components/auth/SyncProfilePreferences.tsx` | On auth, GET profile and apply preferredLanguage (setLanguage + setStoredTheme) |
| `app/layout.tsx` | beforeInteractive script `af-init-lang` sets data-lang from af_lang |
| `app/settings/SettingsClient.tsx` | PreferencesSection: Language row (English / Español), Save writes preferredLanguage and af_lang |
| `components/navigation/HomeTopNav.tsx` | Renders LanguageToggle in header (desktop + mobile row) |

## Storage and API

- **localStorage key:** `af_lang` (value: `en` | `es`).
- **Profile:** `UserProfile.preferredLanguage` (same values). Read via GET `/api/user/profile`; write via PATCH with `preferredLanguage`.
- **Default:** `en` (English) when nothing is stored.
