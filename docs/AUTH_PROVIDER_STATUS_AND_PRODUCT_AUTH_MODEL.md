# Auth Provider Status and Product Auth Model

Follow-up to the `/signup` redesign (commit `3669762`, `docs/CREATE_ACCOUNT_APP_SIGNUP_REDESIGN.md`). That ticket flagged that `/login` "may expose provider buttons that are not actually configured." This ticket audited every provider from source, found the real bugs (which turned out to live somewhere different than the previous doc assumed), fixed `/login` and `/signup` to share one resolver-driven source of truth, and documents the product-specific auth model going forward.

## What was actually wrong (full audit)

The previous doc assumed `/login` rendered `components/auth/SocialLoginButtons.tsx` and that its Apple bypass was the live bug. Neither was true:

- **`components/auth/SocialLoginButtons.tsx` and its wrapper `components/auth/SocialLoginButtonsBlock.tsx` were dead code** — confirmed via a full-repo grep, neither was imported by `/login`, `/signup`, or anything else reachable from a real page. Both are **deleted** in this ticket.
- **The real `/login` page (`app/login/LoginContent.tsx`) has its own separate, inline OAuth implementation** (`handleSocialProvider`, its own `socialLoadingProvider` state, its own JSX) — completely independent of the dead component. It had three real issues:
  1. `if (provider === "google" || provider === "spotify") { await signIn(provider, ...); return }` — called `signIn()` **unconditionally** for Google and Spotify, bypassing `isSocialProviderEnabled()` entirely. Same shape of bug as the Apple issue described in the previous doc, just on different providers, and in a different file than assumed.
  2. Apple's button had `soonOnly: true` **hardcoded** in a JSX array literal — permanently stuck in "coming soon" regardless of actual config, would never auto-enable even with real credentials in place, and required a manual code edit to ever flip.
  3. Facebook's button also had `soonOnly: true` hardcoded, with a genuinely important reason: `// Temporarily disabled — Facebook login is under review; re-enable when resolved` (a Meta platform-review status, not a config gap). This constraint existed **only** on `/login` — `/signup`'s `OAuthButtonRow` had no knowledge of it and would have let a user attempt real Facebook OAuth if Facebook ever became technically configured in an environment, silently contradicting the platform-review hold.
- **Instagram and TikTok buttons existed on `/login`** but were never part of this product's real provider set (no such option anywhere in `SocialProviderResolver.ts`'s enablement logic beyond the type union, no mention in this ticket's target list) — removed.
- **Discord was missing entirely from `/login`** — added.
- **The `--badge-soon-*` CSS custom properties were fully defined and themed (light/dark/legacy) in `app/globals.css` but no `.badge-soon` class rule ever used them** — the "Soon" badge on `/login`'s provider grid has been rendering unstyled since it was written. Completed the missing rule (mirrors the existing `.alert-*` utility pattern in the same file).

## One shared provider-status source

`lib/auth/SocialProviderResolver.ts`'s `isSocialProviderEnabled(provider)` is now the single source of truth for both `/login` and `/signup` — for **every** provider, with no per-page bypass:

```ts
export function isSocialProviderEnabled(provider: SocialProvider): boolean {
  if (MANUALLY_SUSPENDED_PROVIDERS.has(provider)) return false
  if (provider === 'google') return NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === 'true' || (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET)
  if (provider === 'spotify') return NEXT_PUBLIC_ENABLE_SPOTIFY_AUTH === 'true' || (SPOTIFY_CLIENT_ID && SPOTIFY_CLIENT_SECRET)
  if (provider === 'apple') return NEXT_PUBLIC_ENABLE_APPLE_AUTH === 'true' || (APPLE_CLIENT_ID && APPLE_CLIENT_SECRET)
  if (provider === 'facebook') return NEXT_PUBLIC_ENABLE_FACEBOOK_AUTH === 'true' || (FACEBOOK_CLIENT_ID && FACEBOOK_CLIENT_SECRET)
  if (provider === 'x') return NEXT_PUBLIC_ENABLE_X_AUTH === 'true'
  if (provider === 'discord') return NEXT_PUBLIC_ENABLE_DISCORD_AUTH === 'true'
  return false
}
```

`MANUALLY_SUSPENDED_PROVIDERS` (currently `{'facebook'}`) is checked **first**, so a business-driven suspension applies uniformly everywhere this resolver is consulted, present and future — not as a one-off flag duplicated in a single page's JSX. Update that set directly when the Meta review resolves; nothing else needs to change.

**Why Apple is disabled**: `lib/auth.ts` only pushes `AppleProvider` into the NextAuth providers array when `APPLE_CLIENT_ID` and `APPLE_CLIENT_SECRET` are both set — neither is set anywhere today. The resolver's Apple check was fixed to test that same condition (previously it only checked a public flag, which could disagree with whether `lib/auth.ts` had actually registered the provider). Apple now follows the exact same pattern as every other provider: disabled until genuinely configured, then automatically enabled everywhere with no code change.

## Provider-by-provider status

| Provider | `isSocialProviderEnabled()` today | Why | Button behavior when disabled |
|---|---|---|---|
| Google | `false` in this sandbox (no env), would be `true` with real prod secrets | Real `GoogleProvider`, gated on `GOOGLE_CLIENT_ID`+`SECRET` | Clickable → `/auth/provider-pending` |
| Spotify | Same as Google | Real `SpotifyProvider`, same gating | Clickable → `/auth/provider-pending` |
| Facebook | Always `false` | **Manually suspended** (Meta platform review) regardless of config — see `MANUALLY_SUSPENDED_PROVIDERS` | Clickable → `/auth/provider-pending` |
| X / Twitter | `false` — no `TwitterProvider` exists in `lib/auth.ts` | Not implemented; resolver check exists for forward-compat only | Clickable → `/auth/provider-pending` |
| Discord | `false` — no `DiscordProvider` exists in `lib/auth.ts` (unrelated Discord league-integration code exists elsewhere, not auth) | Not implemented; resolver check exists for forward-compat only | Clickable → `/auth/provider-pending` |
| Apple | `false` — no real credentials anywhere | Gated on `APPLE_CLIENT_ID`+`SECRET`, same as Google/Spotify/Facebook | **Hard `disabled` HTML attribute, no click at all** — the one deliberate exception to the "clickable → pending page" pattern, per explicit product instruction |

**Unconfigured-provider UX — a real, pre-existing decision, kept**: a prior ticket (`docs/PROMPT62_SIGN_IN_RECOVERY_DELIVERABLE.md`) deliberately made unconfigured buttons stay clickable and route to an informative `/auth/provider-pending` page rather than going fully inert, explicitly to avoid "dead buttons." This ticket's own wording ("button is disabled") could be read as asking to retire that pattern for every unconfigured provider — confirmed directly with the requester to keep the existing pending-page behavior for Google/Spotify/Facebook/X/Discord, with Apple as the one explicit exception (hard-disabled, no navigation, per this ticket's unambiguous Apple-specific language). `/auth/provider-pending/page.tsx` itself was not modified.

## Files changed

- `lib/auth/SocialProviderResolver.ts` — fixed Apple's check; added the manual-suspension override.
- `app/login/LoginContent.tsx` — `handleSocialProvider` simplified to one uniform check (removed the google/spotify bypass and the now-redundant Apple double-check); Google/Spotify primary buttons and the Apple/Facebook/X/Discord grid are now resolver-driven (no hardcoded `soonOnly`); Instagram/TikTok removed; Discord added with a real icon; badges only render when a provider is actually disabled.
- `components/auth/OAuthButtonRow.tsx` (`/signup`) — Apple's `disabled` state is now `!isSocialProviderEnabled('apple')` instead of an unconditional hardcoded `disabled`, and it has a real `onClick` now (previously none), so it correctly re-enables the moment Apple is configured — same as `/login`.
- `components/auth/SocialLoginButtons.tsx`, `components/auth/SocialLoginButtonsBlock.tsx` — **deleted** (dead code).
- `app/globals.css` — added the missing `.badge-soon` rule.
- `docs/CREATE_ACCOUNT_APP_SIGNUP_REDESIGN.md` — corrected the two claims that turned out to be about the wrong file, with the original text struck through and preserved for history rather than silently rewritten.

Neither `/login`'s email/password flow nor its redirect to `/dashboard` was touched — both verified still working in the browser (config-check banner still renders when `DATABASE_URL`/`NEXTAUTH_SECRET`/`NEXTAUTH_URL` are missing, exactly as before).

## Product-specific auth model

**Fantasy App** (public user auth, `/login` + `/signup`, this ticket's scope): email/password (always available) plus the six social providers above, each gated individually by the shared resolver. Destination on success: `/dashboard`.

**League Intelligence OS** (enterprise auth, not built in this ticket): work email, invite-only, with future SSO / magic link / organization-domain verification. Destination: a future `/os-dashboard`, which does not exist yet.

**Partner Portal** (partner auth, not built in this ticket): work email, restricted partner access, with future SSO / invite / organization verification. Destination: a future `/partner-dashboard`, which does not exist yet.

Per instruction, neither `/os-dashboard` nor `/partner-dashboard` was built here — this ticket is provider-logic cleanup, not new dashboard construction. `/signup`'s `AccountBenefitsCard` (from the previous ticket) already routes anyone looking for OS/Partner access to a `mailto:support@allfantasy.ai?subject=AllFantasy%20Demo%20Request` link rather than self-service signup, which remains correct and unchanged.

## Required env vars to enable each provider for real

| Provider | Server-side (required to register the real NextAuth provider) | Client-visible flag (optional alternative signal) |
|---|---|---|
| Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | `NEXT_PUBLIC_ENABLE_GOOGLE_AUTH=true` |
| Spotify | `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` | `NEXT_PUBLIC_ENABLE_SPOTIFY_AUTH=true` |
| Apple | `APPLE_CLIENT_ID`, `APPLE_CLIENT_SECRET` | `NEXT_PUBLIC_ENABLE_APPLE_AUTH=true` |
| Facebook | `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET` **and** remove `'facebook'` from `MANUALLY_SUSPENDED_PROVIDERS` once the Meta review clears | `NEXT_PUBLIC_ENABLE_FACEBOOK_AUTH=true` (still blocked by the suspension override until removed) |
| X / Twitter | Not sufficient alone — also requires adding a real `TwitterProvider` to `lib/auth.ts`'s `providers` array (none exists) | `NEXT_PUBLIC_ENABLE_X_AUTH=true` (currently only flips the UI's disabled state; sign-in would still fail without the provider) |
| Discord | Not sufficient alone — also requires adding a real `DiscordProvider` to `lib/auth.ts`'s `providers` array (none exists; the Discord code that does exist is for unrelated league-data import, not auth) | `NEXT_PUBLIC_ENABLE_DISCORD_AUTH=true` (same caveat as X) |

## Tests run

- **Typecheck**: full `npm run typecheck`, run after all changes. Zero matches for any touched file across the ~3,300-line output (grepped `SocialProviderResolver`, `LoginContent`, `OAuthButtonRow`, `SocialLoginButtons`) — same pre-existing unrelated baseline as the previous ticket, no new errors, and no dangling-import errors from deleting the two dead files.
- **`/login`, in-browser**: email/password form, "Forgot password?" link, and the config-check warning banner all still render. All six providers show correctly as "Coming Soon" in this sandbox (no real secrets configured anywhere) with visible, properly-styled amber badges (confirmed via computed `background-color`/`color`, not just presence of text). Instagram and TikTok confirmed absent. Clicked Facebook — correctly routed to `/auth/provider-pending?provider=facebook&callbackUrl=%2Fdashboard`, which itself renders a clear, on-brand explanation and links back to sign-in/sign-up/home. Confirmed Apple's button has a real `disabled` HTML attribute (`disabled: true`, `aria-disabled: "true"`) rather than just being clickable-and-redirecting.
- **`/signup`, in-browser**: confirmed identical "Coming Soon" state for all six providers as `/login`, in the ticket-specified order (Google, Facebook, X/Twitter, Discord, Spotify, then Apple separately) — direct evidence both pages read the same resolver. Confirmed Apple is genuinely `disabled` there too.
- **Accessibility**: every OAuth button touched in this ticket has an `aria-label` reflecting its real state (`"Continue with X"` vs `"X — Coming Soon"`), and none of them use `outline-none`, so the browser's native focus outline is preserved by construction (this ticket didn't need to touch the `.focus-ring` mechanism from the previous ticket at all, since these buttons never suppressed the default outline in the first place). The pre-existing credential-form text inputs on `/login` (untouched by this ticket) use `focus:ring-4 focus:ring-{color}-500/10` — the same Tailwind ring-utility pattern that was found not to render in this project's build during the previous ticket's work on `/signup`'s form inputs. Not verified or fixed here since those inputs are outside this ticket's scope (auth *provider* cleanup, not the credentials form) — flagged below as a possible follow-up.
- **Language**: `/login` observed correctly rendering in Spanish (persisted from an earlier session) — `login.*` translation keys (`Bienvenido de nuevo`, `Iniciar sesión`, `O CONTINUAR CON`, etc.) all resolved correctly; provider labels ("Google," "Spotify," "Apple," etc.) are proper nouns and intentionally not translated, matching the existing convention. No new translation keys were needed for this ticket — no new user-facing strings were introduced beyond provider names and the existing "Coming Soon"/"Soon" language already established in each file.
- **Theme**: verified in the legacy (purple) theme via screenshot; badge and button styling all theme-aware via existing CSS custom properties, consistent with both files' pre-existing patterns.
- **Routes**: `/login`, `/signup`, `/auth/provider-pending` (with a real provider query param) all confirmed reachable and rendering correctly. `/dashboard` requires a real authenticated session, not exercised end-to-end in this sandbox (same limitation as the previous ticket — no `DATABASE_URL`/`NEXTAUTH_SECRET` in this worktree).

## Remaining gaps

- **Real Discord and X/Twitter OAuth is still not implemented**, only made structurally honest. Both need a real NextAuth provider added to `lib/auth.ts` before their `NEXT_PUBLIC_ENABLE_*_AUTH` flags mean anything — see the env var table above.
- **Facebook stays suspended until someone removes it from `MANUALLY_SUSPENDED_PROVIDERS`** once the Meta platform review referenced in the original code comment actually resolves — this ticket didn't have visibility into that review's status, only preserved the existing hold and made it apply consistently across both pages instead of only `/login`.
- **OAuth signups/logins still bypass any consent-checkbox equivalent** on the credentials path — unchanged from the previous ticket's documented gap; `signIn(provider, ...)` for an enabled provider redirects immediately.
- **The pre-existing `focus:ring-*` rendering issue on `/login`'s credential-form text inputs was not investigated or fixed** — flagged as a possible follow-up, not in scope here (see [[create-account-signup-redesign]] memory for the root-cause findings from the previous ticket, which likely apply here too but weren't re-verified against this specific file).
- **Full end-to-end OAuth sign-in (a real redirect to Google/Spotify and back) could not be exercised** — this sandboxed worktree has no real OAuth credentials configured anywhere, so every provider correctly shows as unconfigured today regardless of the code fix. The fix was verified structurally (same resolver, correct enablement logic, correct click routing) and will take effect automatically the moment real credentials are added to a real environment.
