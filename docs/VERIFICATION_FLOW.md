# Verification Flow Documentation

## Source of Truth

### Email Verification
- **Primary source**: `AppUser.emailVerified` (DateTime | null) — set by NextAuth when user clicks the email verification link
- **Legacy field**: `UserProfile.emailVerifiedAt` (DateTime | null) — **never set anywhere in the current codebase**; retained in schema but not written to. Candidate for removal in a future cleanup PR.
- **Canonical check**: `isUserVerified(appUser.emailVerified, profile.phoneVerifiedAt)` in `lib/auth-guard.ts`

### Phone Verification
- **Source**: `UserProfile.phoneVerifiedAt` (DateTime | null)
- **Set by**: `POST /api/verify/phone/check` upon successful Twilio OTP verification

### Age Confirmation
- **Source**: `UserProfile.ageConfirmedAt` (DateTime | null)
- **Set by**: `POST /api/auth/confirm-age`

---

## Current User Journey

### Unverified User
1. User registers → account created, `AppUser.emailVerified` is `null`
2. User signs in → session created immediately (no verification gate at sign-in)
3. User navigates to `/dashboard` → **server-side redirect to `/verify?error=VERIFICATION_REQUIRED&callbackUrl=/dashboard`**
4. User verifies email → `AppUser.emailVerified` set to current timestamp
5. User automatically redirected back to `callbackUrl` (e.g., `/dashboard`)

### Verified User
1. Authenticates normally → session created
2. Navigates to `/dashboard` → page loads
3. All verification-gated API endpoints are accessible

---

## Verification Gate Enforcement

### Routes requiring authentication AND verification

| Route | Enforcement Method |
|-------|--------------------|
| `/dashboard` | `requireVerifiedSession("/dashboard")` — server-side redirect |
| `/app/bracket/[tournamentId]/entries/new` | `requireVerifiedSession()` — server-side redirect |
| `POST /api/auth/complete-profile` | `requireVerifiedUser()` — returns HTTP 403 |
| `GET /api/bracket/tournaments/[tournamentId]/leagues` | `requireVerifiedUser()` — returns HTTP 403 |

### Routes requiring authentication only (no verification gate)

| Route | Notes |
|-------|-------|
| `POST /api/auth/login` | Allows unverified users to sign in |
| `POST /api/auth/register` | Creates unverified account |
| `/login`, `/register` | Public pages |
| `/verify` | Verification page itself |

---

## Security: callbackUrl Validation

All `callbackUrl` parameters are validated through `lib/url-validation.ts` before use.

**Accepted**: Internal relative paths beginning with `/` (e.g., `/dashboard`, `/onboarding`)

**Rejected** (falls back to `/dashboard`):
- Absolute URLs: `https://attacker.com`
- Protocol-relative URLs: `//attacker.com`
- Non-path strings: `attacker.com`
- Dangerous protocols: `javascript:`, `data:`

Invalid `callbackUrl` values are logged with a `[Security]` prefix for audit purposes.

---

## Fields to Clean Up Later (Not in Scope for This PR)

- `UserProfile.emailVerifiedAt` — currently never written to. After verifying no admin panels or reports depend on it, this field can be removed via a dedicated schema migration PR.
