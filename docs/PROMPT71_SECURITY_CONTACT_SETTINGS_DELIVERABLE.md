# Prompt 71 — Phone / Email / Password / Security Settings + Full UI Click Audit (Deliverable)

## 1. Security/Contact Settings Architecture

- **Sources of truth**
  - **Email:** `AppUser.email`; verification state from `UserProfile.emailVerifiedAt` (set when user clicks email verification link).
  - **Phone:** `UserProfile.phone` and `UserProfile.phoneVerifiedAt`; updated by `/api/verify/phone/start` (set phone + send SMS) and `/api/verify/phone/check` (verify code, set `phoneVerifiedAt`).
  - **Password:** `AppUser.passwordHash`; set at signup or via forgot-password flow; **in-settings change** via `POST /api/user/password/change` (current password + new password).
- **Settings profile:** `GET /api/user/profile` returns contact and security-related fields: `email`, `phone`, `phoneVerifiedAt`, `emailVerifiedAt`, `hasPassword` (derived from presence of `passwordHash`). Used by Security tab and modal.
- **Flows**
  - **Email verification:** User clicks "Send verification" in Security tab → `POST /api/auth/verify-email/send` → email with link → user clicks → `/verify/email?token=...` → `AppUser.emailVerified` / `UserProfile.emailVerifiedAt` updated. "Verify / change" links to `/verify?method=email` for full verify page.
  - **Phone update + verification:** In Security tab, "Update phone" → enter number → "Send verification code" → `POST /api/verify/phone/start` → enter code → "Verify" → `POST /api/verify/phone/check` → profile updated and refetched. Alternative: "Verify / add" → `/verify?method=phone`.
  - **Password change (logged in):** "Change password" opens inline form (current, new, confirm, show/hide toggles) → "Save new password" → `POST /api/user/password/change` → success or error (wrong password, weak password, no password).
  - **Recovery:** "Forgot password" links to `/forgot-password` (email or SMS reset). Recovery options shown in status card (email / phone when available).

---

## 2. Verification and Password-Change Logic

- **Email verification (settings):** `EmailVerificationSettingsService.sendVerificationEmail(returnTo?)` → POST `/api/auth/verify-email/send` with `returnTo`. Returns `{ ok, alreadyVerified?, loginRequired?, rateLimited?, error? }`.
- **Phone verification (settings):** `PhoneVerificationSettingsService.startPhoneVerification(phone)` → POST `/api/verify/phone/start`; `checkPhoneCode(phone, code)` → POST `/api/verify/phone/check`. Start normalizes phone (E.164); check updates `UserProfile.phone` and `phoneVerifiedAt` on success.
- **Password change:** `PasswordChangeService.changePassword(currentPassword, newPassword)` → POST `/api/user/password/change`. Server: verify current with bcrypt, validate new with `isStrongPassword` (≥8 chars, letter + number), hash with bcrypt(12), update `AppUser.passwordHash`. Returns `WRONG_PASSWORD`, `WEAK_PASSWORD`, `NO_PASSWORD` (OAuth-only account), or success.

---

## 3. Backend Settings Updates

- **GET /api/user/profile**
  - Now includes **hasPassword:** derived from `AppUser.passwordHash` (select added in `SettingsQueryService`; value not exposed, only boolean). Used by Security tab for status and to show/hide inline password change for OAuth-only users.
- **POST /api/user/password/change** (new)
  - Body: `{ currentPassword, newPassword }`.
  - Requires session. Validates current password with bcrypt; validates new with `isStrongPassword`; updates `AppUser.passwordHash`; returns `{ ok: true }` or 400 with `error` and `message`.

No changes to existing verify or forgot-password APIs; they remain the canonical flows for verification and recovery.

---

## 4. Frontend Settings Component Updates

- **Security tab (SettingsClient SecuritySection)**
  - **Security status card:** Shows Email (Verified / Not verified), Phone (Not set / Verified / Not verified), Password (Set / Not set), Recovery (email, phone when available). Uses `getSecurityStatus(profile)` and icons (CheckCircle2 / XCircle).
  - **Email block:** Displays email; "Send verification" (when not verified) calls `sendVerificationEmail("/settings")`; "Verify / change" links to `/verify?method=email`. Inline messages: sent, already verified, rate limited, error.
  - **Phone block:** Displays phone or "Not set" and verification state. "Update phone" toggles inline form: phone input → "Send verification code" → code input → "Verify" and "Resend code". "Verify / add" links to `/verify?method=phone`. Cancel clears inline state. On verify success, `onRefetch()` so profile updates.
  - **Password block:** "Change password" toggles inline form: current password, new password, confirm new password; show/hide toggles for each; "Save new password" and "Cancel". "Forgot password" links to `/forgot-password`. Success message then form closes after 2s.
- **Services used:** `ContactSettingsService.getContactSummary`, `SecurityStatusResolver.getSecurityStatus`, `RecoveryOptionResolver.getRecoveryOptions` (via status), `PhoneVerificationSettingsService.startPhoneVerification` / `checkPhoneCode`, `EmailVerificationSettingsService.sendVerificationEmail`, `PasswordChangeService.changePassword`.
- **Settings modal (Account tab):** Unchanged: read-only email/phone, "Verify / change email or phone" → `/verify`, "Change password" → `/forgot-password`, "Log out". Full security flows live on /settings Security tab.

---

## 5. Full UI Click Audit Findings

| Location | Element | Handler | State / API | Persisted / Reload | Status |
|----------|--------|---------|-------------|--------------------|--------|
| **Settings – Security** | Security status card | — | getSecurityStatus(profile) | GET profile | OK |
| **Settings – Security** | Send verification (email) | handleSendVerificationEmail | sendVerificationEmail() → POST verify-email/send | — | OK |
| **Settings – Security** | Verify / change (email) | Link | /verify?method=email | — | OK |
| **Settings – Security** | Update phone | onClick → setPhoneEdit(true) | Local state | — | OK |
| **Settings – Security** | Cancel (phone) | cancelPhoneEdit | Reset local state | — | OK |
| **Settings – Security** | Send verification code (phone) | handleSendPhoneCode | startPhoneVerification() → POST verify/phone/start | — | OK |
| **Settings – Security** | Verify (phone code) | handleVerifyPhoneCode | checkPhoneCode() → POST verify/phone/check | onRefetch() | OK |
| **Settings – Security** | Resend code | handleSendPhoneCode | startPhoneVerification() | — | OK |
| **Settings – Security** | Verify / add (phone) | Link | /verify?method=phone | — | OK |
| **Settings – Security** | Change password | onClick → setPasswordFormOpen(true) | Local state | — | OK |
| **Settings – Security** | Cancel (password form) | onClick → setPasswordFormOpen(false), clear fields | — | — | OK |
| **Settings – Security** | Show/hide current password | setShowCurrent | Local state | — | OK |
| **Settings – Security** | Show/hide new password | setShowNew | Local state | — | OK |
| **Settings – Security** | Show/hide confirm password | setShowConfirm | Local state | — | OK |
| **Settings – Security** | Save new password | handleChangePassword | changePassword() → POST /api/user/password/change | — | OK |
| **Settings – Security** | Forgot password | Link | /forgot-password | — | OK |
| **Settings modal – Account** | Verify / change email or phone | Link | /verify, onClose | — | OK |
| **Settings modal – Account** | Change password | Link | /forgot-password | — | OK |
| **Settings modal – Account** | Log out | signOut({ callbackUrl: "/" }) | NextAuth | — | OK |
| **POST /api/user/password/change** | Change password | — | bcrypt compare + hash, update AppUser.passwordHash | — | OK |
| **GET /api/user/profile** | hasPassword | — | From AppUser.passwordHash (boolean only) | Yes | OK |

**Notes**

- All buttons have handlers; cancel buttons reset local state; save/verify actions call APIs and refetch where needed.
- Phone verification success triggers `onRefetch()` so the Security tab shows updated phone and verified state.
- Password form validates match and strength client-side; server returns WRONG_PASSWORD, WEAK_PASSWORD, NO_PASSWORD for edge cases.

---

## 6. QA Findings

- **Positive:** Security status card reflects email/phone/password and recovery options. Send verification email works and shows sent/already/rate limited/error. Phone update flow: send code → enter code → verify updates profile and refetch. Change password form: current/new/confirm with show-hide toggles; wrong current password and weak new password show errors; success closes form. Links to /verify and /forgot-password work.
- **Edge cases:** OAuth-only account (no password): API returns NO_PASSWORD; error message shown. Rate limiting on email/phone returns appropriate messages.
- **Mobile/desktop:** Same flows; file/click paths work on both.

---

## 7. Issues Fixed

1. **No in-settings password change:** Added `POST /api/user/password/change` and `PasswordChangeService.changePassword`; Security tab inline form with current/new/confirm and show-hide toggles.
2. **No security status overview:** Added status card using `SecurityStatusResolver.getSecurityStatus` and `RecoveryOptionResolver.getRecoveryOptions`; shows email/phone/password and recovery options.
3. **Email/phone only as links:** Kept "Verify / change" and "Verify / add" links; added **Send verification** (email) and **Update phone** inline flow (send code → verify → refetch) in Security tab.
4. **hasPassword not in profile:** Extended `getSettingsProfile` to select `passwordHash` and return `hasPassword: boolean`; GET profile now includes it for status and UI.

---

## 8. Final QA Checklist

- [ ] **Security status:** Open Security tab; confirm Email/Phone/Password and Recovery display correctly from current profile.
- [ ] **Email:** Click "Send verification"; confirm sent/already/rate limited/error message. Click "Verify / change"; confirm navigation to /verify.
- [ ] **Phone:** Click "Update phone"; enter number, "Send verification code"; enter code, "Verify"; confirm profile refetches and phone shows verified. "Resend code" sends again. "Cancel" clears form.
- [ ] **Password:** Click "Change password"; fill current, new, confirm; use show/hide toggles; submit. Wrong current → error. Weak new → error. Match + strong → success and form closes. "Cancel" closes form without saving.
- [ ] **Forgot password:** "Forgot password" links to /forgot-password.
- [ ] **Settings modal:** Account tab: "Verify / change email or phone" and "Change password" open correct routes; Log out works.
- [ ] **OAuth-only account:** If user has no password, change-password API returns NO_PASSWORD; error message shown.
- [ ] **Mobile:** All buttons and inputs work; keyboard and tap targets usable.

---

## 9. Explanation of the Security Settings System

The security and contact settings system lets users manage **email**, **phone**, **password**, and see **verification state** and **recovery options** in one place (Settings → Security).

- **Email:** Shown with verification status. User can send a verification email from the tab or go to the full verify page to verify/change email.
- **Phone:** Shown with verified/not set/not verified. User can either **update inline** (enter number → send code → enter code → verify; profile refetches) or use "Verify / add" for the full /verify page.
- **Password:** User can **change password** inline (current password, new password, confirm; show/hide toggles; save). Same strength rules as signup (8+ chars, letters and numbers). "Forgot password" links to the recovery flow for users who don’t know their current password. Accounts without a password (e.g. OAuth-only) get a clear error if they try to change password.
- **Status card:** Summarizes email verified, phone set/verified, password set, and recovery options (email/phone) so users see their account security at a glance.
- **Backend:** New endpoint `POST /api/user/password/change`; profile API now returns `hasPassword`. Existing verify and forgot-password APIs are unchanged; the Security tab uses them via `PhoneVerificationSettingsService`, `EmailVerificationSettingsService`, and `PasswordChangeService` so every button is wired and state updates correctly after save or verify.
