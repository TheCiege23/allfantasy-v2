# PROMPT 160 — English / Spanish Language System

## Implemented

- Universal language persistence path:
  - `localStorage.af_lang`
  - cookie `af_lang`
  - `html[data-lang]` + `html[lang]` hydration-safe initialization
- Language toggle locations:
  - Landing header (`HomeTopNav` -> `LanguageToggle`)
  - Settings preferences (`SettingsClient` language segmented toggle)
- Translation API now supports DeepL fallback for missing Spanish keys:
  - `GET /api/i18n/translations` merges EN + ES dictionaries
  - Missing ES keys are translated server-side via DeepL when `DEEPL_API_KEY` is configured
  - Secrets stay server-side (no key leak to client)

## Added environment variables

- `DEEPL_API_KEY`
- `DEEPL_API_BASE_URL` (defaults to `https://api-free.deepl.com`)

## Click audit checklist

- [ ] Landing header language toggle switches EN/ES and updates visible translated copy.
- [ ] Settings language toggle switches EN/ES.
- [ ] Selected language persists after refresh (`html[data-lang]`, `localStorage.af_lang`, cookie `af_lang`).
- [ ] Missing Spanish keys are filled via DeepL fallback when key exists in EN and `DEEPL_API_KEY` is set.

