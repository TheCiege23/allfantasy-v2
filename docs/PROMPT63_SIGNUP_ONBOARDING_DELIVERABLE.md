# Prompt 63 — Sign Up Flow + Profile Setup + Legacy Import + Full UI Click Audit

## 1. Signup Architecture

- **Single signup, shared access**: One registration creates one `AppUser` and one `UserProfile`. The same account is used for AllFantasy Sports App, Bracket Challenge, and Legacy. Routing is unchanged: `/signup`, `/login`, `/forgot-password`, `/reset-password`, `/verify`; intent is preserved via `next` and `lib/auth/auth-intent-resolver.ts`.
- **Flow**: Single scrollable form (smart single-flow) with progress indicator. Steps are logical sections: account (username, email, password), profile (timezone, language, avatar, phone), verification method, legacy import, age + disclaimer + terms, social link, submit.
- **Core modules (as requested)**:
  - **SignupFlowController**: Logic in `app/signup/page.tsx` — form state, validation, `handleSubmit`, progress calculation.
  - **UsernameAvailabilityService**: `GET /api/auth/check-username?username=` — returns `available`, `reason` (taken, profanity, length, charset). Debounced in signup page.
  - **UsernameProfanityGuard**: `lib/profanity.ts` — `containsProfanity()`; used in check-username and register API.
  - **Username suggestion**: `GET /api/auth/suggest-username?base=` — returns an available variant (e.g. `base_42`); used when username is taken.
  - **PasswordStrengthResolver**: `lib/signup/password-strength.ts` — `getPasswordStrength(password)` → level 0–4, label, valid.
  - **TimezoneSelectorService**: `lib/signup/timezones.ts` — `SIGNUP_TIMEZONES` (US, Canada, Mexico), `DEFAULT_SIGNUP_TIMEZONE`.
  - **LanguagePreferenceResolver**: Stored in `UserProfile.preferredLanguage` (en/es); used app-wide; architecture supports future translation.
  - **AvatarPickerService**: `lib/signup/avatar-presets.ts` — 20 presets; UI in signup (grid + upload).
  - **ProfileImageUploadService**: Signup form file input → `avatarPreview` (data URL); optional `avatarDataUrl` sent to register (backend persists `avatarPreset`; avatarUrl upload can be added later).
  - **PhoneVerificationService**: Phone collected at signup; verification happens **after sign-in** via `/verify` and `/api/verify/phone/start` + `/api/verify/phone/check` (session required). Pre-signup SMS verify can be added later with a dedicated token flow.
  - **LegacyImportOnboardingService**: UI section on signup with Sleeper (live lookup + link) and Yahoo, ESPN, MFL, Fleaflicker, Fantrax as “Coming soon”; explanation text and skip option.
  - **AgreementAcceptanceService**: `disclaimerAgreed` and `termsAgreed` checkboxes; validated in register API.
  - **SharedAccountBootstrapService**: NextAuth `signIn` event creates/upserts `UserProfile`; register creates `AppUser` + `UserProfile` with timezone, language, avatarPreset, phone, Sleeper data.

---

## 2. Onboarding Flow Design

- **Progress indicator**: Bar and percentage at top; derived from required fields (username ok, email, password valid, confirm match, timezone, language, age, terms, disclaimer).
- **Sections in order**:
  1. **Account**: Username (with availability + profanity + suggestion when taken), display name, email, password (with strength meter), confirm password.
  2. **Profile**: Timezone (US/Canada/Mexico dropdown), language (English/Spanish), profile image (20 presets + upload or none).
  3. **Phone**: Optional unless verification method is Phone; then required.
  4. **Verification method**: Email or Phone (determines whether we send email link or prompt for phone verify after sign-in).
  5. **Legacy import**: Sleeper (username + lookup); Yahoo, ESPN, MFL, Fleaflicker, Fantrax as “soon”; copy explains import helps ranking/level and skip = level 1.
  6. **Age**: Required 18+ checkbox; optional “Verify with driver’s license” entry point (placeholder for future).
  7. **Disclaimer**: Required — fantasy sports only, no gambling/DFS.
  8. **Terms**: Required — Terms and Conditions and Privacy Policy.
  9. **Social**: SocialLoginButtons (Google, Apple, Facebook, Instagram, X, TikTok) to link account or sign in instead.
  10. **Submit**: Create account; then sign-in and redirect or success screen with “Go to Sign In”.
- **Success state**: Polished success message; link to sign in with intent preserved; copy for email vs phone verification.
- **“Already have an account?”**: Link to login with `loginUrlWithIntent(redirectAfterSignup)`.

---

## 3. Backend Signup / Profile / Bootstrap Updates

- **Register API** (`/api/auth/register`):
  - Accepts `disclaimerAgreed` and `termsAgreed`; returns 400 if either is false.
  - Accepts `timezone`, `preferredLanguage`, `avatarPreset`, `phone`, `sleeperUsername`, `ageConfirmed`, `verificationMethod`, `avatarDataUrl` (optional; preset stored; avatarUrl from upload can be wired later).
  - Creates `AppUser` and `UserProfile`; sends email verification (email flow) or returns with PHONE (phone verify after sign-in).
- **Check-username** (`/api/auth/check-username`): Unchanged; returns availability and reason (taken, profanity, length, charset).
- **Suggest-username** (`/api/auth/suggest-username`): New. `GET ?base=xxx` returns an available suggestion (e.g. `xxx_42`); used when username is taken.
- **Profile bootstrap**: NextAuth `signIn` event still upserts `UserProfile` so session always has a profile; register creates full profile with timezone, language, avatarPreset, phone.

---

## 4. Frontend Signup Page Updates

- **Progress**: Bar and percentage at top; recalcs from required fields.
- **Username**: Debounced check; “Suggest a similar username” when taken (calls suggest-username and sets username).
- **Password**: Strength meter (getPasswordStrength + 4-segment bar); focus ring; aria-label on show/hide.
- **Timezone**: Full `SIGNUP_TIMEZONES` list (US, Canada, Mexico).
- **Language**: English, Español; stored in profile for app-wide use.
- **Avatar**: 20 presets from `AVATAR_PRESETS` / `AVATAR_PRESET_LABELS` in 5-column grid; upload image (2MB, preview); “custom” when uploaded.
- **Legacy import**: Section with Sleeper (input + lookup); Yahoo, ESPN, MFL, Fleaflicker, Fantrax as “(soon)” buttons; explanation and skip.
- **Age**: Required checkbox; optional “Verify with driver’s license” link (placeholder).
- **Disclaimer**: Required checkbox (fantasy only, no gambling/DFS).
- **Terms**: Required checkbox (Terms and Privacy).
- **Social**: `SocialLoginButtons` with `callbackUrl={redirectAfterSignup}`.
- **Submit**: Disabled until username ok, password valid, confirm match, age, terms, disclaimer (and phone if method is PHONE).
- **Success**: Existing success screen; “Go to Sign In” with intent.

---

## 5. Legacy Import Onboarding Design

- **Sleeper**: User enters Sleeper username; “Lookup” calls `/api/auth/sleeper-lookup`; on found, we send `sleeperUsername` (and backend stores sleeperUserId, sleeperLinkedAt) on register. Import of historical data can be done post-signup in app/settings.
- **Yahoo, ESPN, MFL, Fleaflicker, Fantrax**: Shown as “(soon)” buttons; no dead click — they are visible and explain “coming soon.” Entry points for future OAuth or CSV import.
- **Copy**: “Import your fantasy history to get placed into rankings and level systems. Skip and you’ll start at level 1—you can import later in settings.”
- **Skip**: User can leave legacy import empty and submit; they start at level 1; import later from settings.

---

## 6. Full UI Click Audit Findings

| Element | Component / Route | Handler / Behavior | Verified |
|--------|-------------------|--------------------|----------|
| Create username field | SignupPage | `username`, `setUsername`; normalized to lowercase, alphanumeric + underscore | ✅ |
| Username availability checker | SignupPage | Debounced useEffect → GET check-username; `usernameStatus`, `usernameMessage` | ✅ |
| Profanity validation state | check-username API + register | `containsProfanity`; UI shows invalid/taken messages | ✅ |
| Suggest username (when taken) | SignupPage | `applyUsernameSuggestion` → GET suggest-username → setUsername | ✅ |
| Password field | SignupPage | `password`, `setPassword`; show/hide toggle | ✅ |
| Password strength indicator | SignupPage | `getPasswordStrength(password)`; 4-segment bar + label | ✅ |
| Confirm password field | SignupPage | `confirmPassword`; submit checks match | ✅ |
| Timezone selector | SignupPage | `timezone`, `setTimezone`; SIGNUP_TIMEZONES (US/Canada/Mexico) | ✅ |
| Language selector | SignupPage | `preferredLanguage`, `setPreferredLanguage`; en/es | ✅ |
| Avatar preset buttons | SignupPage | 20 presets; `setAvatarPreset`, `setAvatarPreview(null)` | ✅ |
| Upload image | SignupPage | File input; reader → `setAvatarPreview`, `setAvatarPreset("custom")`; 2MB limit | ✅ |
| Remove image | SignupPage | Choosing a preset clears `avatarPreview` | ✅ |
| Phone number field | SignupPage | `phone`, `setPhone`; required if verificationMethod === PHONE | ✅ |
| Verification method (Email/Phone) | SignupPage | `verificationMethod`; buttons toggle | ✅ |
| Age verification checkbox | SignupPage | `ageConfirmed`; required for submit | ✅ |
| Optional license verification | SignupPage | Placeholder button “Verify with driver’s license” | ✅ |
| Legacy import entry (Sleeper) | SignupPage | `lookupSleeper` → sleeper-lookup; `sleeperResult`; register gets sleeperUsername | ✅ |
| Legacy import (Yahoo, etc.) | SignupPage | “(soon)” buttons; no submit effect | ✅ |
| Disclaimer checkbox | SignupPage | `disclaimerAgreed`; required; sent to register | ✅ |
| Terms checkbox | SignupPage | `termsAgreed`; required; sent to register | ✅ |
| Submit / Create account | SignupPage | `handleSubmit` → register → signIn credentials → redirect or success | ✅ |
| Back link | SignupPage | Link to `/` | ✅ |
| Sign in link | SignupPage | `loginUrlWithIntent(redirectAfterSignup)` | ✅ |
| Success continue | SignupPage | “Go to Sign In” → login with intent | ✅ |
| Social auth buttons | SocialLoginButtons | Google/Apple when enabled; others show “planned” message | ✅ |
| Progress indicator | SignupPage | Derived from required fields; bar + percentage | ✅ |

All listed elements are wired; no dead buttons. Submit is gated on username ok, password strength, confirm match, age, terms, disclaimer.

---

## 7. QA Findings

- **Username**: Uniqueness and profanity enforced by check-username and register; suggestion works when taken.
- **Password**: Strength meter and confirm validation; backend `isStrongPassword` and length.
- **Timezone**: All US, Canada, Mexico options in dropdown; value saved to profile.
- **Language**: en/es saved to `UserProfile.preferredLanguage`; ready for app-wide use.
- **Avatar**: 20 presets selectable; upload sets preview and “custom”; preset stored on profile.
- **Phone**: Collected; verification is after sign-in via /verify when method is PHONE.
- **Age, disclaimer, terms**: Required; backend rejects if not agreed.
- **Legacy import**: Sleeper path works; other providers are “soon” and skip is allowed.
- **Social**: Buttons wired; unconfigured show message.
- **Signup**: Creates single account; access to Sports App, Bracket, Legacy via same session.
- **Mobile**: Single column form; touch-friendly; progress bar and sections readable.

---

## 8. Issues Fixed

- **Terms and disclaimer**: Added required checkboxes and backend validation so account creation requires agreement.
- **Timezone**: Replaced 4 options with full US/Canada/Mexico list (`lib/signup/timezones.ts`).
- **Avatar presets**: Expanded from 3 to 20 (`lib/signup/avatar-presets.ts`) with labels.
- **Password strength**: Added `getPasswordStrength` and 4-segment meter + label on signup form.
- **Username suggestion**: When username is taken, “Suggest a similar username” calls new suggest-username API and applies suggestion.
- **Progress indicator**: Added bar and percentage based on required fields.
- **Legacy import**: Section with Sleeper (live) and Yahoo/ESPN/MFL/Fleaflicker/Fantrax (soon); explanation and skip.
- **Social on signup**: Added SocialLoginButtons so users can link accounts or switch to sign-in.
- **Optional license entry**: Placeholder “Verify with driver’s license” for future flow.
- **Submit gate**: Submit disabled until usernameStatus === ok, passwordStrength.valid, confirm match, age, terms, disclaimer.

---

## 9. Final QA Checklist

- [x] Username uniqueness and profanity filter work.
- [x] Password confirmation and strength meter work.
- [x] Timezone selector has U.S./Canada/Mexico options.
- [x] English/Spanish preference saved to profile.
- [x] Avatar selection (20 presets) and image upload work.
- [x] Phone field and verification method (email/phone) work; phone verify after sign-in.
- [x] Age checkbox required.
- [x] Disclaimer and terms checkboxes required.
- [x] Legacy import entry (Sleeper) works; others “soon”; skip allowed.
- [x] Social auth buttons wired; fallback message when not configured.
- [x] Signup creates shared access for Sports App and Bracket (and Legacy).
- [x] “Already have an account?” and success “Go to Sign In” preserve intent.
- [x] All sign-up-related click paths work; no dead buttons.

---

## 10. Explanation of the Signup and Onboarding System

- **Signup**: User fills one form (account, profile, verification method, legacy import, age, disclaimer, terms). Username is checked for availability and profanity; password has strength feedback and confirm match. Timezone and language are stored on `UserProfile` for app-wide use. Avatar is one of 20 presets or an uploaded image (preset stored; optional future avatarUrl upload). Phone is optional unless verification is by phone; verification then happens after sign-in on `/verify`. Legacy import is optional: Sleeper can be linked now; other providers are coming soon; skipping leaves the user at level 1 with option to import later.

- **Agreements**: User must confirm 18+, agree to the fantasy-sports disclaimer (no gambling/DFS), and agree to Terms and Privacy. Backend rejects register if any of these are missing.

- **Account creation**: Register creates `AppUser` and `UserProfile` with timezone, preferredLanguage, avatarPreset, phone, Sleeper data when provided. NextAuth signIn event ensures a profile exists for the session. One account then works across Sports App, Bracket, and Legacy; redirect after signup uses `next` so the user returns to the intended product.

- **Social**: Buttons on signup let users link a provider or sign in with it; unconfigured providers show a clear “planned” or “not configured” message so the UI stays intentional and testable.
