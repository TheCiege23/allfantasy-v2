# Verification Flow

## Overview

This document describes the current email/phone verification flow, the canonical sources of truth for verification state, and the user journey through the app.

## Sources of Truth

| Field | Model | Canonical? | Notes |
|-------|-------|------------|-------|
| `emailVerified` | `AppUser` | ✅ Yes | Set by NextAuth on email link click; canonical for email verification |
| `phoneVerifiedAt` | `UserProfile` | ✅ Yes | Set by Twilio phone check; canonical for phone verification |
| `emailVerifiedAt` | `UserProfile` | ⚠️ Legacy | Duplicate/legacy field — not used for verification checks; candidate for cleanup in a future PR |

## Verification Logic

A user is considered verified (`isUserVerified`) if **either**:
- `AppUser.emailVerified` is a non-null `Date`, **OR**
- `UserProfile.phoneVerifiedAt` is a non-null `Date`

Age confirmation (`isAgeConfirmed`) requires:
- `UserProfile.ageConfirmedAt` is a non-null `Date`

Both checks are implemented in `lib/auth-guard.ts`.

## User Journey

```
Register → Sign In (no block) → /dashboard (redirects to /verify if unverified)
    → Verify email or phone → Redirected back to /dashboard (or original callbackUrl)
```

1. **Registration**: User creates account via `/signup`. No verification required to register.
2. **Sign in**: Unverified users can sign in without restriction. Login behavior is unchanged.
3. **Dashboard access**: `app/dashboard/page.tsx` calls `requireVerifiedSession("/dashboard")` which redirects unverified users to `/verify?error=VERIFICATION_REQUIRED&callbackUrl=/dashboard`.
4. **Verification**: User verifies via email link or phone SMS code on `/verify`.
5. **Post-verification redirect**: After successful verification, user is redirected to `callbackUrl` (defaults to `/dashboard` if not provided).

## Key Files

| File | Role |
|------|------|
| `lib/auth-guard.ts` | `isUserVerified()`, `isAgeConfirmed()`, `getSessionAndProfile()` |
| `lib/require-verified.ts` | `requireVerifiedSession(callbackUrl?)` — server-side guard for pages |
| `app/dashboard/page.tsx` | Calls `requireVerifiedSession("/dashboard")` to block unverified access |
| `app/verify/page.tsx` | Handles verification UI; reads `callbackUrl` from query params for post-verification redirect |

## callbackUrl Support

`requireVerifiedSession(callbackUrl?)` accepts an optional `callbackUrl` parameter:
- If provided, it is appended to redirect URLs so the verify page can send the user back to the original destination after verification.
- Example redirect: `/verify?error=VERIFICATION_REQUIRED&callbackUrl=%2Fdashboard`

`app/verify/page.tsx` reads `callbackUrl` from query params and defaults to `/dashboard` if absent.

## Cleanup Notes (Future PRs)

- `UserProfile.emailVerifiedAt`: Legacy duplicate field. Not used in verification checks. Safe to deprecate and remove once confirmed no UI or API code reads it.
