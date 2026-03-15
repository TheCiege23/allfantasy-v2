# Prompt 68 — Profile Page + Public/Private Account Details + Full UI Click Audit (Deliverable)

## 1. Profile Page Architecture

- **Own profile:** `/profile` — Auth required; redirects to `/login?callbackUrl=/profile` when unauthenticated. Renders identity card (avatar initial, display name, @username), XP tier badge, bio, preferred sports, editable form (Edit / Save / Cancel), and quick links (Sports App, Settings). Reputation and Legacy score are league-scoped; profile page explains they are visible per league in the Sports App and links to `/app/home`.
- **Public profile:** `/profile/[username]` — No auth required. Fetches public profile via `GET /api/profile/public?username=`. Shows display name, @username, bio, preferred sports. If the viewer is the same user (session username matches route username), server sets `isOwnProfile=true` and client shows edit form and quick links; otherwise view-only.
- **Data flow:**
  - **Own:** Client uses `useSettingsProfile()` (GET/PATCH `/api/user/profile`) and `useXPProfile(managerId)` (GET `/api/xp/profile?managerId=`). Save goes through existing PATCH profile (displayName, avatarPreset, bio, preferredSports).
  - **Public:** Client fetches `GET /api/profile/public?username=` → `PublicProfileQueryService.getPublicProfileByUsername`. Returns only public fields (username, displayName, profileImageUrl, avatarPreset, bio, preferredSports).

---

## 2. Editable Profile Flow Design

- **Edit entry:** "Edit" button in the "Edit profile" block on `/profile` (or when viewing own profile at `/profile/[username]`).
- **Editable fields:** Display name, avatar preset (grid of presets), short bio (textarea), preferred sports (multi-select from NFL, NHL, NBA, MLB, NCAA Football, NCAA Basketball, Soccer).
- **Flow:** Click Edit → form appears with current values; user changes fields; Save submits PATCH with `displayName`, `avatarPreset`, `bio`, `preferredSports`; on success, form closes and data refetches. Cancel restores local state from profile and closes form.
- **Persistence:** All fields persisted in `UserProfile` (and `AppUser.displayName` for display name). No client-only state after save.

---

## 3. Backend Profile Save/Query Updates

- **Schema:** `UserProfile` extended with `bio` (String? @db.Text) and `preferredSports` (Json? — array of sport codes). Migration: `20260329000000_add_profile_bio_preferred_sports`.
- **Settings query:** `SettingsQueryService.getSettingsProfile` now includes `bio` and `preferredSports` (array). `UserProfileService.updateUserProfile` accepts `bio` and `preferredSports` in payload.
- **API:** `PATCH /api/user/profile` accepts `bio` and `preferredSports` (string[]) in body; validated and passed to `updateUserProfile`.
- **New:** `PublicProfileQueryService.getPublicProfileByUsername(username)` — returns `PublicProfileDto` (username, displayName, profileImageUrl, avatarPreset, bio, preferredSports). No email/phone.
- **New:** `GET /api/profile/public?username=` — returns public profile or 404.
- **New modules:** `ProfilePageService.getProfilePageData(userId)` (wrapper around getSettingsProfile), `ProfileSaveService.saveProfile(userId, payload)` (wrapper around updateUserProfile), `PreferredSportsResolver.getPreferredSportsOptions()` / `getSportLabel(code)`, `ProfilePresentationResolver.resolveProfilePresentation(profile)`.

---

## 4. Frontend Profile Component Updates

- **New:** `app/profile/page.tsx` — Server; auth check; renders `AppShellNav` and `ProfilePageClient` with `isOwnProfile={true}`.
- **New:** `app/profile/[username]/page.tsx` — Server; resolves `isOwnProfile` via session + DB username lookup; renders `ProfilePageClient` with `isOwnProfile` and `publicUsername={username}` (or null when own).
- **New:** `app/profile/ProfilePageClient.tsx` — Client. Uses `useSettingsProfile`, `useXPProfile`, and optional public fetch. Renders:
  - Identity card: avatar initial, display name, @username, XP tier (own only), Settings link (own only), bio, preferred sports.
  - **EditableProfileFormController** (own only): Edit / Cancel / Save; display name, avatar preset grid, bio textarea, preferred sports multi-select. Save calls `updateProfile` then refetch.
  - Quick links (own only): Sports App, Profile & settings; note about reputation/legacy in leagues.
- **Nav:** AppShellNav `GLOBAL_TABS` includes "Profile" → `/profile`. Dashboard welcome line: @username and "Profile" link to `/profile`. Settings profile section: "Edit full profile (bio, sports) →" links to `/profile`.

---

## 5. Full UI Click Audit Findings

| Location | Element | Handler | State / API | Persisted Reload | Status |
|----------|--------|---------|-------------|------------------|--------|
| **AppShellNav** | Profile tab | Link to `/profile` | — | — | OK |
| **Dashboard** | @username link | Link to `/profile` | — | — | OK |
| **Dashboard** | Profile link | Link to `/profile` | — | — | OK |
| **Settings (Profile section)** | Edit full profile link | Link to `/profile` | — | — | OK |
| **/profile** | (page load) | Server redirect if not auth | — | — | OK |
| **/profile** | Identity card | — | useSettingsProfile, useXPProfile | GET profile, GET xp | OK |
| **/profile** | Settings button | Link to `/settings` | — | — | OK |
| **/profile** | Edit button | setEditing(true) | Local state | — | OK |
| **/profile** | Display name input | setDisplayName | Local state | — | OK |
| **/profile** | Avatar preset buttons | setAvatarPreset(id) | Local state | — | OK |
| **/profile** | Bio textarea | setBio | Local state | — | OK |
| **/profile** | Preferred sports buttons | toggleSport(code) | Local state | — | OK |
| **/profile** | Save button | handleSave → updateProfile(...) | PATCH /api/user/profile | fetchProfile() after | OK |
| **/profile** | Cancel button | handleCancel → reset state, setEditing(false) | Local state | — | OK |
| **/profile** | Quick link Sports App | Link to `/app/home` | — | — | OK |
| **/profile** | Quick link Profile & settings | Link to `/settings` | — | — | OK |
| **/profile/[username]** | (page load, other user) | Server: isOwnProfile=false | Client: fetch /api/profile/public | setPublicProfile | OK |
| **/profile/[username]** | (page load, same user) | Server: isOwnProfile=true | Client: useSettingsProfile (own) | — | OK |
| **/profile/[username]** | Profile not found | publicProfile null | — | — | OK |
| **GET /api/user/profile** | useSettingsProfile | fetchProfile() | Returns full profile (incl. bio, preferredSports) | Yes | OK |
| **PATCH /api/user/profile** | Save profile form | updateProfile(payload) | updateUserProfile | fetchProfile after | OK |
| **GET /api/profile/public** | Public profile view | fetch with username | getPublicProfileByUsername | setPublicProfile | OK |
| **GET /api/xp/profile** | useXPProfile | — | Returns XP tier etc. | — | OK |

**Notes:**

- Username is not editable post-signup (read-only on profile and in settings). Display name, avatar preset, bio, and preferred sports are editable.
- Profile image: current implementation uses avatar initial (no image upload). Avatar preset is stored and can be used later for preset-based avatars. "Remove image" / upload are not implemented; prompt allowed "if applicable."
- Public/private: public profile shows only shared fields; no visibility toggles per field yet (future expansion).

---

## 6. QA Findings

- **Positive:** Profile loads (own and public); edit form save persists and refetches; cancel restores state; XP tier shows when available; preferred sports and bio display and save; nav and dashboard links work.
- **Edge cases:** Empty bio and empty preferred sports are allowed (saved as null). Invalid sport codes in PATCH are stored as-is (could be validated against SUPPORTED_SPORTS in a follow-up).
- **Gaps (by design):** Username change not supported. Profile image upload not implemented (avatar preset only). Reputation/Legacy are not aggregated on profile (per-league in app). Visibility controls (show/hide bio, sports) not implemented.

---

## 7. Issues Fixed

1. **No profile page:** Added `/profile` and `/profile/[username]` with identity card, bio, preferred sports, and edit form.
2. **No public profile API:** Added `PublicProfileQueryService` and `GET /api/profile/public?username=`.
3. **Profile data model:** Added `bio` and `preferredSports` to UserProfile and migration; extended GET/PATCH profile and user-settings types/services.
4. **Edit flow:** EditableProfileFormController with Edit/Cancel/Save; local state synced from profile; save calls PATCH and refetches.
5. **Navigation:** Profile tab in AppShellNav; dashboard @username and Profile link; settings "Edit full profile" link.
6. **Own vs public:** Server computes isOwnProfile for `/profile/[username]` via session + DB username; client uses it to show edit vs view-only and to avoid loading XP for other users.

---

## 8. Final QA Checklist

- [ ] **Entry points:** Open /profile from AppShellNav, dashboard (@username and Profile link), and settings (Edit full profile). All reach profile page.
- [ ] **Auth:** Logged-out visit to /profile redirects to login with callbackUrl. Logged-out visit to /profile/[username] shows public view.
- [ ] **Own profile:** Display name, avatar preset, bio, preferred sports editable; Save persists and refreshes; Cancel reverts and closes form.
- [ ] **Public profile:** Visit /profile/[otherUsername] shows only public info; no Edit form. Visit /profile/[ownUsername] shows own profile with Edit (when session matches).
- [ ] **XP tier:** Shows on own profile when XP profile exists; does not show on other user's profile.
- [ ] **Quick links:** Sports App and Settings open correct routes.
- [ ] **Mobile/desktop:** Layout is responsive (max-w-3xl, flex wrap, grid).
- [ ] **API:** GET /api/profile/public?username= returns 404 for unknown username; PATCH profile with bio and preferredSports updates DB and GET returns new values.

---

## 9. Explanation of the Profile Page System

The profile system provides a **single profile page** for both **private (editable)** and **public (view-only)** use:

- **Own profile** (`/profile` or `/profile/[ownUsername]`): User sees identity (display name, username, optional XP tier), bio, preferred sports, and an **editable block** (Edit → change display name, avatar preset, bio, preferred sports → Save or Cancel). Save uses the existing PATCH `/api/user/profile` and refetches so the UI reflects persisted data. Quick links take the user to the Sports App and Settings. Reputation and Legacy score are not stored on the profile; they are per-league and are surfaced in the app; the profile page links to the app and explains that.
- **Public profile** (`/profile/[username]` for another user): Data is loaded from `GET /api/profile/public?username=`, which returns only safe, shareable fields (no email, phone, or internal ids). The same presentation component shows identity, bio, and preferred sports. No edit form or quick links.
- **Data and modules:** Profile data lives in `UserProfile` (and `AppUser` for username/email). `SettingsQueryService` and `UserProfileService` already support profile GET/PATCH; they were extended with `bio` and `preferredSports`. `PublicProfileQueryService` serves public views. `ProfilePageService` and `ProfileSaveService` wrap query/save for profile-page use. `PreferredSportsResolver` and `ProfilePresentationResolver` provide labels and a consistent display DTO. The **EditableProfileFormController** is a client component that owns edit state, validation, and save/cancel and is used only on the own-profile view.

The result is a **premium, mobile-friendly profile page** with clear own vs public behavior, wired edit flow, and correct navigation and persistence, ready for future additions (e.g. profile image upload, visibility toggles, or aggregation of reputation/legacy highlights).
