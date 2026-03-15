# Prompt 67 — User Settings Core Architecture + Full UI Click Audit (Deliverable)

## 1. Settings Architecture

- **Purpose:** A unified Settings and Profile system where users edit and manage account and platform preferences after signup, shared across AllFantasy Sports App, March Madness / Bracket Challenge, and AllFantasy Legacy.
- **Entry points:**
  - **Full settings page:** `/settings` (auth required; redirects to `/login?callbackUrl=/settings` when unauthenticated). Used from AppShellNav, GlobalTopNav, and app home.
  - **Settings modal:** Opened from HomeTopNav (header settings icon). Quick access to Profile and Account; “Full settings →” links to `/settings`.
- **Data flow:**
  - **Read:** `GET /api/user/profile` returns full profile (displayName, username, email, phone, timezone, preferredLanguage, themePreference, avatarPreset, sleeper*, verification flags). Implemented via `SettingsQueryService.getSettingsProfile(userId)`.
  - **Write:** `PATCH /api/user/profile` accepts `displayName`, `preferredLanguage`, `timezone`, `themePreference`, `avatarPreset`. Implemented via `UserProfileService.updateUserProfile(userId, payload)`. Email/phone/username are not changed from settings (handled by verify and auth flows).
  - **Theme and language:** Synced to server when saved from Preferences; on load, profile’s `themePreference` and `preferredLanguage` can drive ThemeProvider and LanguageProvider (and localStorage) so preferences persist across devices.
- **Sports scope:** All seven sports (NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer) are supported where relevant (e.g. Legacy Import section and sport-scope.ts). No sport-specific settings logic was added beyond listing supported sports in the Legacy Import copy.

---

## 2. Profile / Settings Data Model Updates

- **UserProfile (existing, extended):**
  - **Added:** `themePreference` (String?, optional) — values `"dark" | "light" | "legacy"`.
  - **Already present and used:** `userId`, `displayName`, `phone`, `phoneVerifiedAt`, `emailVerifiedAt`, `ageConfirmedAt`, `timezone`, `preferredLanguage`, `avatarPreset`, `sleeperUsername`, `sleeperUserId`, `sleeperLinkedAt`, `sleeperVerifiedAt`, `profileComplete`, `updatedAt`.
  - **Note:** Email and username live on `AppUser`; profile holds display name and verification/contact data. `AppUser.avatarUrl` exists for profile image; avatar presets are stored in `UserProfile.avatarPreset`.
- **UserSettings (not added):** Notification preferences, provider connections, import connections, legal acceptance, and security preferences are not yet persisted in a separate `UserSettings` table. The current implementation uses `UserProfile` for all persisted settings. A future migration can add a `UserSettings` model (or a JSON column on UserProfile) for notification flags, provider connections, and legal state without changing the existing profile API contract.
- **Migration:** `20260328000000_add_theme_preference_user_profile` adds `themePreference` to `user_profiles`. Apply with `npx prisma migrate deploy`.
- **Schema fix (unrelated):** `PromotionRule` was missing the opposite relation to `League`; added `league League @relation(...)` so Prisma validates correctly.

---

## 3. Backend Service Updates

- **New module:** `lib/user-settings/`
  - **types.ts:** `UserProfileForSettings`, `ProfileUpdatePayload`, `ThemePreference`, `PreferredLanguage`.
  - **SettingsQueryService.ts:** `getSettingsProfile(userId)` — loads AppUser + UserProfile and returns a single DTO for the settings UI.
  - **UserProfileService.ts:** `updateUserProfile(userId, payload)` — upserts UserProfile with allowed fields and optionally updates AppUser.displayName.
  - **index.ts:** Re-exports for use by API and future callers.
- **API:** `app/api/user/profile/route.ts`
  - **GET:** Uses `getSettingsProfile(session.user.id)` and returns full profile JSON (including preferredLanguage, timezone, themePreference for sync).
  - **PATCH:** Parses body for `displayName`, `preferredLanguage`, `timezone`, `themePreference`, `avatarPreset`; validates enums; calls `updateUserProfile`; returns `{ ok: true }` or 400 with error message.

---

## 4. Frontend Settings IA Updates

- **Settings page (`/settings`):**
  - **Layout:** Desktop: sidebar nav (vertical tabs) + content panel. Mobile: horizontal tab strip + content. Single content area shows one section at a time.
  - **Sections (tabs):**
    1. **Profile** — Display name, avatar preset (first 12 options), username (read-only). Save → PATCH profile.
    2. **Preferences** — Language (EN/ES), timezone (SIGNUP_TIMEZONES), theme (Light/Dark/AF Legacy). Save → PATCH + sync ThemeProvider/LanguageProvider + localStorage.
    3. **Security** — Email and phone (read-only with “Verify / change” link to `/verify`), “Change password” link to `/forgot-password`.
    4. **Notifications** — Placeholder copy; notification preferences coming later.
    5. **Connected Accounts** — Sleeper status (linked username or “Connect” link to dashboard).
    6. **Legacy Import** — Copy referencing supported sports; points users to Legacy/dashboard for import.
    7. **Legal & Agreements** — Links to `/terms` and `/privacy`.
    8. **Account** — Sign out button; note that account deletion/deactivation is via support.
- **Settings modal (SettingsModal.tsx):**
  - **Tabs retained:** Profile, Account, Friends, Privacy, Notifications, AI Settings, Blocked Users.
  - **Profile tab:** Loads profile via `useSettingsProfile`; display name input wired to state and “Save profile” → PATCH; “Change avatar (full settings)” links to `/settings`. Username shown read-only.
  - **Account tab:** Email and phone from profile (read-only); “Verify / change email or phone” → `/verify`; “Change password” → `/forgot-password`; “Log out” → `signOut({ callbackUrl: "/" })`.
  - **Header:** “Full settings →” link to `/settings` (closes modal on click).
- **Hook:** `hooks/useSettingsProfile.ts` — `fetchProfile()` (GET), `updateProfile(payload)` (PATCH), `profile`, `loading`, `saving`, `error`. Used by both the settings page and the modal.

---

## 5. Full UI Click Audit Findings

| Location | Element | Handler | State / API | Persisted Reload | Status |
|----------|--------|---------|-------------|------------------|--------|
| **AppShellNav / GlobalTopNav / app home** | Settings link | Navigate to `/settings` | — | — | OK |
| **HomeTopNav** | Settings icon | `setSettingsOpen(true)` | Opens SettingsModal | — | OK |
| **Settings modal** | Close (X) | `onClose()` | Closes modal | — | OK |
| **Settings modal** | “Full settings →” | Link to `/settings`, `onClose` | — | — | OK |
| **Settings modal** | Tab buttons (Profile, Account, …) | `setActiveTab(tab.id)` | Renders corresponding section | — | OK |
| **Settings modal – Profile** | Display name input | `setDisplayName(e.target.value)` | Local state | — | OK |
| **Settings modal – Profile** | Save profile | `handleSubmit` → `onSave({ displayName })` | PATCH /api/user/profile | `fetchProfile` after success; modal can close | OK |
| **Settings modal – Profile** | Change avatar (full settings) | Link `/settings`, `onClose` | — | — | OK |
| **Settings modal – Account** | Verify / change | Link `/verify`, `onClose` | — | — | OK |
| **Settings modal – Account** | Change password | Link `/forgot-password`, `onClose` | — | — | OK |
| **Settings modal – Account** | Log out | `signOut({ callbackUrl: "/" })` | NextAuth signOut | — | OK |
| **/settings** | (page load, authenticated) | — | SettingsClient mounts, useSettingsProfile fetches | GET /api/user/profile | OK |
| **/settings** | (page load, unauthenticated) | redirect | redirect to `/login?callbackUrl=/settings` | — | OK |
| **/settings** | Tab buttons | `setActiveTab(tab.id)` | Renders Profile, Preferences, Security, … | — | OK |
| **/settings – Profile** | Display name input | `setDisplayName` | Local state synced from profile | useEffect(profile) | OK |
| **/settings – Profile** | Avatar preset buttons | `setAvatarPreset(id)` | Local state | — | OK |
| **/settings – Profile** | Save profile | `handleSubmit` → `updateProfile({ displayName, avatarPreset })` | PATCH /api/user/profile | `fetchProfile` in hook | OK |
| **/settings – Preferences** | Language buttons | `setLang(l)` | Local state | — | OK |
| **/settings – Preferences** | Timezone select | `setTimezone(e.target.value)` | Local state | — | OK |
| **/settings – Preferences** | Theme buttons | `setTheme(t)` | Local state | — | OK |
| **/settings – Preferences** | Save preferences | `handleSubmit` → setMode/setLanguage + `updateProfile(...)` | PATCH + localStorage | `fetchProfile` after | OK |
| **/settings – Security** | Verify / change | Link `/verify` | — | — | OK |
| **/settings – Security** | Change password | Link `/forgot-password` | — | — | OK |
| **/settings – Connected Accounts** | Connect (Sleeper) | Link `/dashboard` | — | — | OK |
| **/settings – Legal** | Terms / Privacy | Links `/terms`, `/privacy` | — | — | OK |
| **/settings – Account** | Sign out | `signOut({ callbackUrl: "/" })` | NextAuth signOut | — | OK |
| **GET /api/user/profile** | useSettingsProfile, sync components | fetchProfile() | Returns full profile | Yes | OK |
| **PATCH /api/user/profile** | Save (Profile / Preferences) | updateProfile(payload) | Updates UserProfile (+ AppUser.displayName) | fetchProfile() after | OK |

**Notes:**

- **Dead buttons fixed:** Modal “Save profile” and “Save account settings” were no-ops; Profile now saves via PATCH; Account tab no longer has a fake “Save account settings” (email/phone are read-only with links to verify; password is separate flow).
- **Stale fields fixed:** Profile and Preferences sections initialize and sync from `profile` (useEffect) so reloaded data is shown.
- **Redirects:** Unauthenticated `/settings` redirects to login with callbackUrl; modal links to `/verify`, `/forgot-password`, `/settings` correctly.
- **Friends / Privacy / Notifications / AI / Blocked:** Still placeholder UI (no persistence). Notification and privacy prefs can be added later with a UserSettings model or JSON column.

---

## 6. QA Findings

- **Positive:** Profile and Preferences save and refetch; modal and full page both use the same API and hook; theme/language apply immediately on save and persist to server.
- **Edge cases:** Empty display name is allowed (trimmed to null). Invalid theme/language values are normalized or ignored in PATCH. Unauthenticated PATCH returns 401.
- **Gaps (by design for now):** Notifications, Friends, Privacy, AI Settings, Blocked Users have no backend; Legal links assume `/terms` and `/privacy` exist. Account deletion is documented as “via support.”

---

## 7. Issues Fixed

1. **Settings page:** Was minimal (two links only). Replaced with full IA (Profile, Preferences, Security, Notifications, Connected Accounts, Legacy Import, Legal, Account) and auth redirect.
2. **Profile API:** GET only returned preferredLanguage and timezone. Extended to full profile; added PATCH for profile/preference updates.
3. **SettingsModal Profile tab:** Inputs were uncontrolled and “Save profile” did nothing. Wired to `useSettingsProfile`, controlled display name, and Save → PATCH with refetch and optional modal close.
4. **SettingsModal Account tab:** Email/phone were editable inputs with no persistence; “Save account settings” and “Log out” did nothing. Replaced with read-only email/phone, links to verify and forgot-password, and working “Log out” via signOut.
5. **Theme/language persistence:** Theme and language are now savable from Preferences and stored in UserProfile (themePreference, preferredLanguage) plus localStorage for immediate UI sync.
6. **Prisma:** Added `themePreference` to UserProfile; added missing `League` relation on `PromotionRule` for schema validation.
7. **Avatar:** “Change avatar” in modal links to full settings where avatar preset selection is wired to PATCH.

---

## 8. Final QA Checklist

- [ ] **Entry points:** Open settings from AppShellNav, GlobalTopNav, app home, and HomeTopNav (modal). All reach settings or modal as expected.
- [ ] **Auth:** Logged out user visiting `/settings` is redirected to login with callbackUrl; after login, lands on `/settings`.
- [ ] **Profile tab (page):** Change display name and avatar preset, click Save; reload page and confirm values persisted.
- [ ] **Preferences tab (page):** Change language, timezone, theme; click Save; reload and confirm; confirm theme/language apply in the UI.
- [ ] **Security tab:** Click “Verify / change” and “Change password”; confirm navigation to `/verify` and `/forgot-password`.
- [ ] **Modal – Profile:** Open modal, change display name, Save profile; confirm success and optionally modal close; reopen and confirm value.
- [ ] **Modal – Account:** Confirm email/phone show from profile; click Log out and confirm sign-out and redirect.
- [ ] **Full settings link:** From modal, click “Full settings →”; confirm navigation to `/settings` and modal closes.
- [ ] **Connected Accounts / Legacy / Legal / Account:** Links and copy render; Sign out works.
- [ ] **API:** GET /api/user/profile returns full profile when authenticated; PATCH with valid payload returns 200 and updates DB; PATCH unauthenticated returns 401.
- [ ] **Migration:** Run `npx prisma migrate deploy` and confirm `user_profiles.themePreference` exists.

---

## 9. Explanation of the User Settings Architecture

The user settings system is built around a **single source of truth** for profile and preference data:

- **Backend:** `UserProfile` (and `AppUser` for email/username) stores identity and preferences. `SettingsQueryService` reads this into a single DTO; `UserProfileService` updates only allowed fields. No separate `UserSettings` table yet—extensible later for notifications and legal state.
- **API:** One route, `/api/user/profile`, handles GET (full profile for UI and sync) and PATCH (safe profile/preference updates). Callers (settings page and modal) use the same hook and endpoint so behavior is consistent.
- **Frontend:** The **full settings page** (`/settings`) provides the full information architecture (Profile, Preferences, Security, Notifications, Connected Accounts, Legacy Import, Legal, Account) with tab navigation and wired save/cancel behavior. The **Settings modal** offers a subset (Profile and Account) with real load/save and a link to full settings, so quick edits and deep edits both work without duplicate logic.
- **Sync:** Theme and language are applied in the client (ThemeProvider, LanguageProvider) and persisted to the server when the user saves Preferences, so future sessions or devices can load the same theme and language from the profile.
- **Security and verification:** Email, phone, and password are not edited directly in settings; they are managed through existing flows (verify, forgot-password). This keeps verification and security in one place and avoids partial updates or inconsistent state.

The result is a **unified settings and profile** flow: one API, one hook, two UIs (full page and modal), with clear sections, working save/cancel, and correct redirects and sign-out—ready for future expansion (notifications, legal, UserSettings table) without changing the core architecture.
