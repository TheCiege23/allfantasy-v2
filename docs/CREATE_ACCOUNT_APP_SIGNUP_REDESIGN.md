# Create Account (App Signup) Redesign

Redesign of the AllFantasy Fantasy Sports App create-account page at `/signup` (`app/signup/SignupContent.tsx`) to match the new landing-page visual language, add a benefits/trust sidebar, and honestly reflect which OAuth providers are actually wired up. Same route, same backend contract — presentation layer only.

## Product decision

`/signup` is the Fantasy Sports App account-creation flow for players, commissioners, and league members. It is explicitly **not** an enterprise lead form, League Intelligence OS signup, or Partner Portal signup — those get a `mailto:support@allfantasy.ai?subject=AllFantasy%20Demo%20Request` link from the benefits card until a dedicated Schedule Demo / Contact Sales page exists (none does today).

Copy avoids AI-forward and gambling-adjacent language throughout, per the ticket ("insights," "tools," "smarter decisions" instead of "AI-powered," no "gambling/betting/sportsbook/odds").

Two real conflicts surfaced between the ticket's literal spec and what the live codebase requires; both were resolved with the requester directly before implementation:

1. **Legal consent.** `POST /api/auth/register` hard-requires three booleans (`ageConfirmed`, `disclaimerAgreed`, `termsAgreed`) or it rejects the signup — the ticket's plain "By creating an account, you agree to..." text alone cannot satisfy that contract. Resolved: one visible checkbox with the exact approved copy (age confirmation + Terms/Privacy + no-gambling statement), which sets all three booleans in lockstep on change. The backend and `lib/legal/AgreementAcceptanceService.ts` were **not** modified.
2. **Field scope.** The ticket's 5-field list (Full Name, Email, Username, Password, Confirm) is narrower than the live form (which also has phone/SMS verification, an avatar picker, a timezone selector, and Sleeper import). Resolved: nothing was removed — all of it lives behind a collapsed "Advanced options" disclosure, off by default.

## Page structure

- **Header** (main form view only — the geo-blocked and post-submit success screens keep their existing simpler headers, out of scope): crest + "AllFantasy" wordmark, `<LanguageToggle variant="compact" />`, `<ModeToggle />`, "Already have an account? Sign in."
- **Centered headline**: "Create Your AllFantasy Account" / subheadline, then a 3-node `SignupProgressIndicator` (Account Details → Verify Email → Get Started). This is a cosmetic status indicator, not a form wizard — step 2 is the existing inline "check your email" success screen (unchanged logic, just now also shows the indicator at step 2); step 3 is only ever visually reached later, after the user clicks the emailed verification link and lands on the pre-existing `/verify/email` → `/choose-username` → `/dashboard` chain, which this ticket does not touch.
- **Two-column grid** (`grid-cols-1 lg:grid-cols-[1fr_360px]`, so mobile naturally stacks form-first): left = the account-creation form card; right = `AccountBenefitsCard`. Full-width `TrustBar` below both. No sticky mobile CTA — checked the codebase for a precedent (`StickyActionBar`, `SaveBar`, etc. all live in unrelated feature areas, none in any auth page) and skipped it per the ticket's own "if not, skip this" instruction.
- **Form card**: "Step 1 of 3 — Account Details" eyebrow, Full Name → Email → Username → Password → Confirm Password (reordered from the old Username-first layout), collapsible Advanced options, the combined consent checkbox, the Create Account submit button, an "OR CONTINUE WITH" divider, `OAuthButtonRow`, a passive legal line ("By creating an account, you agree to our Terms of Service and Privacy Policy" — this is distinct from the checkbox: OAuth buttons redirect immediately and never touch the checkbox, so this line is the only consent notice an OAuth signup ever sees), and the sign-in link.
- **New files**: `components/auth/OAuthButtonRow.tsx`, `AccountBenefitsCard.tsx`, `TrustBar.tsx`, `SignupProgressIndicator.tsx`, `AdvancedOptionsSection.tsx`. `app/signup/SignupContent.tsx` stays the orchestrator and owns all state.
- During extraction, two duplicate phone-number inputs in the original file (one in "Profile," one in "Verify & Agree," both bound to the same state) were consolidated into one, shown in Advanced options with send/verify controls appearing only when Phone verification is selected.

## Auth provider status

Verified directly against `lib/auth.ts` and `lib/auth/SocialProviderResolver.ts`, not assumed:

| Provider | Real NextAuth provider registered? | Button behavior |
|---|---|---|
| Google | Yes, when `GOOGLE_CLIENT_ID`+`SECRET` set | Real `signIn('google')` |
| Spotify | Yes, when `SPOTIFY_CLIENT_ID`+`SECRET` set | Real `signIn('spotify')` |
| Facebook | Yes, when `FACEBOOK_CLIENT_ID`+`SECRET` set | Real `signIn('facebook')` when configured, else routes to `/auth/provider-pending` |
| X / Twitter | **No** — no `TwitterProvider` in `lib/auth.ts` | Always routes to pending flow today; `SocialProviderResolver.ts` extended with a real (currently-false) `NEXT_PUBLIC_ENABLE_X_AUTH` check so it activates automatically once a real provider is added |
| Discord | **No** — no `DiscordProvider` in `lib/auth.ts` (Discord elsewhere in the app is an unrelated league-integration feature, not auth) | Same as X — resolver extended with `NEXT_PUBLIC_ENABLE_DISCORD_AUTH`, added `'discord'` to the `SocialProvider` type union (it didn't exist before this ticket) |
| Apple | Provider code exists but is gated behind `APPLE_CLIENT_ID`+`SECRET`, which are not set anywhere | **Always rendered disabled** with a "Coming Soon" badge, per explicit product instruction — never calls `signIn('apple')` |

**Correction (2026-07-02, follow-up auth-provider-cleanup ticket)**: the paragraph below, as originally written here, was wrong about *which* file the bug lived in. `components/auth/SocialLoginButtons.tsx` turned out to be dead code — never imported or rendered by `/login` (or anywhere else) — an assumption this doc never actually verified at the time. The real `/login` page (`app/login/LoginContent.tsx`) has its own separate, inline OAuth implementation with a similar-shaped bug (Google/Spotify called unconditionally, not Apple specifically). Both `SocialLoginButtons.tsx` and its wrapper `SocialLoginButtonsBlock.tsx` were deleted, and the real bug was fixed, in that follow-up ticket — see `docs/AUTH_PROVIDER_STATUS_AND_PRODUCT_AUTH_MODEL.md` for the accurate account. Original (inaccurate) text preserved below for history:

**Pre-existing bug found, not fixed here** (out of scope, flagged for awareness): ~~`components/auth/SocialLoginButtons.tsx`, used by `/login`, calls `signIn('apple', ...)` unconditionally based on a comment claiming "Google and Apple always have real credentials." That's true for Google but not Apple — since no `AppleProvider` is registered without real secrets, clicking Apple on the *existing* login page likely errors today.~~ The new `OAuthButtonRow` does not copy this pattern.

Real Discord/X OAuth still requires adding `DiscordProvider`/`TwitterProvider` to `lib/auth.ts` — that's a separate, future ticket; this one only makes the enablement check honest and forward-compatible.

## Mode (theme) support

No new theme system. Uses the app's existing `ThemeProvider` (mounted app-wide via `AppProviders` in `app/layout.tsx`) and the existing `<ModeToggle />` component. All new markup uses the established CSS custom properties (`var(--bg)`, `var(--panel)`, `var(--panel2)`, `var(--border)`, `var(--text)`, `var(--muted)`, `var(--muted2)`, `var(--accent-cyan)`, etc.) exactly like `components/ui/input.tsx`/`button.tsx` already do. Verified via browser: light, dark, and legacy themes all render with correct contrast at both desktop (1280×900, two-column) and mobile (375×812, stacked) viewports. `OAuthButtonRow` uses theme-aware styling throughout, which is the actual point of this redesign for that section (the dead `SocialLoginButtons.tsx`, since deleted, was the hardcoded-dark component this replaced conceptually — see the correction note above).

`themePreference` sent in the register API payload now reflects the user's real, live-selected theme (via `useThemeMode()`) instead of a hardcoded `DEFAULT_THEME` constant — the old page had no theme control at all, so the constant was reasonable then; leaving it hardcoded after adding a working `ModeToggle` would have silently ignored the user's own selection.

## Language support

Uses the existing `useOptionalLanguage()` / `<LanguageToggle />` system — no new i18n mechanism. New `signup.*` translation keys were added **in English only** to `lib/i18n/translations.ts`, following the exact precedent already established by the landing-page redesign: the app's `/api/i18n/translations?lang=X` route auto-fills any key missing from the static per-language dictionaries via the Google Translate API (`translateMissingEnglishKeysWithGoogle`, cached 24h), fetched automatically by `LanguageProviderClient` on every language change.

Supported languages (verified from `lib/i18n/constants.ts`, not assumed): `en, es, zh, fil, vi, fr, ar` — 7, not 5 (an early research pass mistakenly reported 5 after reading a different git worktree; corrected by reading this worktree's actual source directly).

**Verified behavior in this sandbox** (which has no `GOOGLE_TRANSLATE_API_KEY` configured, so the live-translate step never fires): switching to Spanish correctly translated every *pre-existing* key from the static bundle (`Idioma`, `Crear cuenta`, `Tema actual: AF Legacy`, `¿Ya tienes cuenta?`, etc.) while the *new* `signup.*` keys (headline, step labels, consent copy, OAuth labels, benefits/trust copy) fell back to English — confirmed via the actual `GET /api/i18n/translations?lang=es` response body, which returned `"ok": true` with no error, just the untranslated English strings for keys with no static entry. This is the correct, designed degradation path, not a bug. **In a deployed environment with `GOOGLE_TRANSLATE_API_KEY` set, these new keys will be machine-translated and cached automatically on first request** — no further code change needed.

No hydration mismatches or layout breaks observed switching languages at either viewport size.

## Validation behavior

All validation logic is reused, not duplicated:
- Username: `lib/auth/username-validation.ts` rules (3–30 chars, `/^[A-Za-z0-9_]+$/`, rejects phone-number-like strings) plus a 400ms-debounced live availability check via `checkUsernameAvailability()` → `GET /api/auth/check-username`.
- Password: `getPasswordStrength()` from `lib/signup/password-strength.ts` (8+ chars, 1 letter, 1 digit minimum; strength meter shows 4 levels).
- Confirm password: live match indicator.
- Full Name: required in the UI (asterisk, `required` attribute); the register API itself falls back to username if blank, so the frontend requirement is a UX choice, not a hard backend dependency.
- Consent checkbox: required; gates the submit button directly (`!consentChecked` in the `disabled` expression) rather than the old two-variable `agreementGateOpen` indirection, since one checkbox now drives all three backend booleans.
- Geo-blocking: unchanged — `useGeoRestriction()` still renders the fully-blocked state inline and shows a paid-restricted banner for paid-blocked states.

**Verified in-browser** (this sandbox has no database, so `/api/auth/check-username` returns 500 — confirmed the debounced check still fires the correct request and the UI degrades gracefully to an "unable to verify" message rather than crashing, exactly matching the existing `catch` handling).

## Enterprise / Partner note

`AccountBenefitsCard` explains the wider product surface (Fantasy Sports App, League Intelligence OS, Partner Portal, Secure & Private) without implying self-service enterprise access: "OS and Partner access may require approval" is placed directly under those two specific sections, and "Looking for League Intelligence OS or Partner access? Request a demo." links to the support mailto. No Schedule Demo page was built in this ticket, per instruction.

## Tests run

- **Typecheck**: full `npm run typecheck` run twice (before and after the accessibility fix below). Zero new errors in any of the 9 touched/new files, confirmed by grepping the ~3,300-line output for each file path — all matches were pre-existing errors in unrelated files (matchup/playoff/standings engines, legacy waiver routes), consistent with this branch's documented pre-existing baseline.
- **Visual**: desktop (1280×900) light, dark, and legacy themes; mobile (375×812) dark. Two-column grid confirmed via computed `grid-template-columns` (640px/360px at desktop, single column below `lg:`).
- **Mobile bug found and fixed**: extending the original 2-label progress indicator ("Account"/"Verify") to 3 longer labels ("Account Details"/"Verify Email"/"Get Started") caused the first two labels to overlap by ~8px at 375px width. Fixed by letting labels wrap within a fixed-width box instead of forcing `whitespace-nowrap`; re-verified via measured bounding boxes (16px gap, no overlap).
- **Language**: English (default) and Spanish, including the documented new-key fallback behavior above.
- **Form interactions**: Advanced options expand/collapse, username field triggering the debounced availability check (verified via network tab), password field, consent checkbox toggling and correctly setting all three backend booleans.
- **OAuth routing**: clicking Google in this sandbox (no real secrets) correctly navigated to `/auth/provider-pending?provider=google&callbackUrl=%2Fdashboard` rather than attempting a doomed `signIn()` call — confirms `isSocialProviderEnabled()` and `buildProviderPendingHref()` wiring is correct. Could not verify a *successful* OAuth redirect for Google/Spotify since this sandboxed worktree has no `.env.local` with real credentials.
- **Accessibility**: found and fixed a real regression — the primary form inputs used `outline-none` (copied verbatim from the original file) with no working focus replacement, meaning keyboard-focused fields had zero visual indication. Root-caused as a pre-existing Tailwind build quirk (`focus:ring-*` and even a manually-constructed `focus:outline-[...]` arbitrary-value utility both compiled to CSS rules with no effect or an empty declaration body in this project's specific build) — not something introduced by this change, but newly *exposed* by removing `outline-none` in a redesign that's supposed to be accessible. Fixed by switching to the codebase's own pre-existing `.focus-ring:focus-visible` utility class (`app/globals.css`, using the already-themed `--focus-ring`/`--focus-ring-offset` custom properties), which is the same accessible-focus mechanism already used elsewhere in the app. Structurally verified the generated CSS rule is well-formed and correctly scoped; could not produce a *trusted* synthetic keyboard event through browser automation to visually confirm the `:focus-visible` match (a known limitation of programmatic testing, not of the fix), but the underlying mechanism is proven and reused, not new.
- **Routes**: `/signup`, `/login`, `/terms`, `/privacy`, `/no-gambling-policy` (new — added `getNoGamblingPolicyUrl()` to `lib/legal/legal-route-resolver.ts` mirroring the existing `getTermsUrl`/`getPrivacyUrl`/`getDataDeletionUrl` pattern) all confirmed reachable. `/dashboard` requires a real authenticated session and could not be exercised end-to-end in this sandbox.

## Remaining gaps

- **OAuth signups bypass the consent checkbox entirely.** `signIn('google'|'spotify'|'facebook', ...)` redirects immediately and never touches `/api/auth/register` or the checkbox — so today (unchanged by this ticket) there is no affirmative age/disclaimer/terms capture on the OAuth path, only the passive legal line near the OAuth buttons. This is pre-existing behavior, not introduced here.
- ~~Apple OAuth bug on `/login`~~ — **resolved** in the follow-up auth-provider-cleanup ticket; see the correction note under "Auth provider status" above and `docs/AUTH_PROVIDER_STATUS_AND_PRODUCT_AUTH_MODEL.md`.
- **Real Discord/X OAuth is not implemented**, only made structurally ready. Adding real sign-in requires provisioning OAuth apps with those platforms and adding `DiscordProvider`/`TwitterProvider` to `lib/auth.ts` — separate future work.
- **New translation keys are English-only**; real (not machine-translated-at-request-time) Spanish/Chinese/Filipino/Vietnamese/French/Arabic copy for the new sections has not been hand-written, matching the explicitly approved approach of relying on the existing Google Translate API fallback.
- **Full end-to-end signup (real user creation, real email verification) could not be exercised** — this sandboxed git worktree has no `.env.local` (no `DATABASE_URL`, no `NEXTAUTH_SECRET`, no OAuth secrets), so `/api/auth/register`, `/api/auth/check-username`, `/api/auth/session`, and `/api/meta/events` all 500 in this environment. This is a pre-existing environment limitation (confirmed present on this same worktree before this ticket, affecting unrelated pages too), not something this change introduced or could resolve.
- **`:focus-visible` on the redesigned inputs was structurally verified but not visually confirmed** via a trusted keyboard event in automated testing, per the note above.
