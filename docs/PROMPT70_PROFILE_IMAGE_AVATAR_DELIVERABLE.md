# Prompt 70 — Profile Image Upload + 20 Avatar Picker + Full UI Click Audit (Deliverable)

## 1. Image/Avatar System Architecture

- **Two sources of identity image:**
  - **Uploaded image:** Stored in `AppUser.avatarUrl` (URL path e.g. `/uploads/avatars/<uuid>.<ext>`). File is written to `public/uploads/avatars/` via `POST /api/user/profile/avatar`. User can remove it via PATCH `avatarUrl: null`.
  - **App-provided avatar:** One of 20 preset keys stored in `UserProfile.avatarPreset`. Each preset is mapped to an emoji in `AvatarCatalogResolver` for consistent display. User can choose a preset in profile/settings; choosing a preset and saving clears `avatarUrl` so the preset shows.
- **Display order:** If `avatarUrl` is set, show it; else if `avatarPreset` is set, show the preset emoji; else show the user’s initial. Implemented in `IdentityImageRenderer`.
- **Where used:** Profile page (own and public), Settings profile section, Settings modal profile tab, **nav/header** (HomeTopNav). Upload and 20-avatar picker are on Profile and Settings; modal links to full settings for avatar changes. Nav shows user avatar + username (desktop) or avatar only (mobile), linking to /profile.

---

## 2. Avatar Catalog Implementation

- **Catalog:** The existing 20 presets in `lib/signup/avatar-presets.ts` (crest, bolt, crown, trophy, star, flame, shield, diamond, medal, target, zap, comet, moon, sun, football, basketball, baseball, hockey, soccer, champion) are used as the single source of truth.
- **Visual mapping:** `lib/avatar/AvatarCatalogResolver.ts` maps each preset id to an emoji (`AVATAR_PRESET_EMOJI`) for playful, sports-app-appropriate display. E.g. trophy → 🏆, football → 🏈.
- **Picker UI:** Profile edit form and Settings profile section render all 20 presets as buttons with emoji; the selected preset is highlighted (border/background). `AvatarPickerService.getAvatarCatalog()` returns `{ id, label, emoji }[]` for use in UIs that want a list.
- **Selection:** User clicks a preset → local state updates; on Save we PATCH `avatarPreset` and, when a preset is selected, `avatarUrl: null` so the preset is what’s shown. Immediate preview: the identity block uses current profile + local edit state where applicable (e.g. after refetch following save or upload).

---

## 3. Upload and Persistence Logic

- **Upload:** Client calls `uploadProfileImage(file)` (ProfileImageUploadService) which POSTs the file to `POST /api/user/profile/avatar`. Server validates type (JPEG, PNG, GIF, WebP) and size (max 3MB), writes to `public/uploads/avatars/<uuid>.<ext>`, updates `AppUser.avatarUrl` to the new path, and returns `{ url }`. Client then refetches profile so the new image appears.
- **Remove image:** Client calls `setProfileAvatarUrl(null)` (UserImagePersistenceService) which PATCHes `/api/user/profile` with `avatarUrl: null`. Server updates `AppUser.avatarUrl` to null. Client refetches profile.
- **Persistence:** `UserProfileService.updateUserProfile` accepts `avatarUrl` in the payload and updates `AppUser.avatarUrl`. PATCH `/api/user/profile` accepts `avatarUrl` and passes it through. GET profile returns `profileImageUrl` (from `AppUser.avatarUrl`) so all consumers see the same value after refetch.

---

## 4. Frontend Component Updates

- **IdentityImageRenderer** (`components/identity/IdentityImageRenderer.tsx`): Renders in order: `<img>` if `avatarUrl`; else preset emoji in a circle if `avatarPreset`; else initial letter. Used on profile (identity card), profile edit (via controller), Settings profile section (via controller), Settings modal profile tab, and **HomeTopNav** (authenticated user).
- **ProfileImagePreviewController** (`components/identity/ProfileImagePreviewController.tsx`): Wraps IdentityImageRenderer; accepts optional `previewObjectUrl` for **immediate file preview** before upload completes. When `previewObjectUrl` is set it overrides `profileImageUrl` so the user sees the selected file instantly. Used in profile edit form and Settings profile section; object URL is created on file select and revoked after upload completes or on cancel/unmount.
- **Profile page:** Identity card uses `IdentityImageRenderer`. Edit form uses **ProfileImagePreviewController** with `previewObjectUrl` so selecting a file shows the image immediately; after upload or cancel the object URL is revoked. Upload/Remove/20-preset grid and Save behave as before; Cancel also revokes any preview URL.
- **Settings profile section:** Uses **ProfileImagePreviewController** with `previewObjectUrl` for immediate preview on file select; same upload/remove/20-preset/Save behavior and `onRefetch`.
- **Settings modal (Profile tab):** `IdentityImageRenderer` with `profile?.profileImageUrl` and `profile?.avatarPreset`; “Change avatar (full settings)” links to /settings.
- **Nav/header (HomeTopNav):** When authenticated, shows `IdentityImageRenderer` (size sm) plus username (desktop) or avatar only (mobile), linking to /profile; profile data from `useSettingsProfile()`.

---

## 5. Full UI Click Audit Findings

| Location | Element | Handler | State / API | Persisted Reload | Status |
|----------|--------|---------|-------------|------------------|--------|
| **Profile page** | Identity card avatar | — | IdentityImageRenderer(profileImageUrl, avatarPreset, …) | GET profile | OK |
| **Profile edit** | Upload image button | onClick → fileInputRef.current.click() | — | — | OK |
| **Profile edit** | File input | onChange → handleFileChange | uploadProfileImage(file) → POST /api/user/profile/avatar | onRefetch() | OK |
| **Profile edit** | Remove image button | onClick → handleRemoveImage | setProfileAvatarUrl(null) → PATCH profile | onRefetch() | OK |
| **Profile edit** | Avatar preset button (x20) | onClick → setAvatarPreset(id) | Local state | — | OK |
| **Profile edit** | Save | handleSave | PATCH avatarPreset (+ avatarUrl: null when preset set) | onRefetch() | OK |
| **Profile edit** | Cancel | handleCancel | Reset local state, setEditing(false) | — | OK |
| **Settings profile** | Avatar display | — | IdentityImageRenderer | GET profile | OK |
| **Settings profile** | Upload image | Same as profile | uploadProfileImage → onRefetch | OK | OK |
| **Settings profile** | Remove | Same as profile | setProfileAvatarUrl(null) → onRefetch | OK | OK |
| **Settings profile** | 20 avatar preset buttons | setAvatarPreset(id) | Local state | — | OK |
| **Settings profile** | Save profile | onSave with avatarPreset, avatarUrl | PATCH profile | fetchProfile | OK |
| **Settings modal** | Avatar in Profile tab | — | IdentityImageRenderer(profile) | useSettingsProfile | OK |
| **Settings modal** | Change avatar link | Link to /settings | — | — | OK |
| **Nav (HomeTopNav)** | Avatar + username link | Link to /profile | IdentityImageRenderer(profile) | useSettingsProfile | OK |
| **Profile edit** | File select (preview) | handleFileChange sets previewObjectUrl | ProfileImagePreviewController | Revoked after upload/cancel | OK |
| **Settings profile** | File select (preview) | Same | ProfileImagePreviewController | Revoked after upload | OK |
| **POST /api/user/profile/avatar** | Upload | Multipart file | Writes file, updates AppUser.avatarUrl | Returns url | OK |
| **PATCH /api/user/profile** | avatarUrl | payload.avatarUrl | UserProfileService → AppUser.avatarUrl | GET profile | OK |
| **GET /api/user/profile** | profileImageUrl | — | From AppUser.avatarUrl | Yes | OK |

**Notes:**

- Current avatar highlight: the selected preset in the grid uses border/background (accent-cyan) so it’s clearly the current choice.
- **Immediate preview:** Profile and Settings use `ProfileImagePreviewController` with `previewObjectUrl`. On file input change we create an object URL and pass it to the controller so the avatar updates **before** upload completes; the URL is revoked after upload or on cancel.
- Signup: existing signup flow keeps avatar preset selection and labels; register API persists `avatarPreset` to UserProfile. Custom image at signup (avatarDataUrl) is not yet persisted to AppUser.avatarUrl in register; upload after login on profile/settings is the supported path for custom images.

---

## 6. QA Findings

- **Positive:** Upload (JPEG/PNG/GIF/WebP, max 3MB) succeeds and updates the displayed avatar after refetch; remove clears image and fallback to preset or initial; 20-preset picker shows all options with correct highlight; IdentityImageRenderer shows image, preset emoji, or initial in profile, settings, and modal.
- **Edge cases:** Invalid file type/size returns error message; upload/remove errors are shown inline; choosing a preset and saving clears custom image so the preset is visible.
- **Gaps (by design):** Signup custom image (data URL) is not stored in DB; that would require register to write a file and set avatarUrl. Mobile: same file input works on mobile (device upload).

---

## 7. Issues Fixed

1. **No profile image upload:** Added `POST /api/user/profile/avatar`, `ProfileImageUploadService.uploadProfileImage`, and upload button + file input on profile and settings; upload writes to `public/uploads/avatars` and updates `AppUser.avatarUrl`.
2. **No way to remove image:** Added “Remove image” button and `setProfileAvatarUrl(null)`; PATCH and UserProfileService support `avatarUrl: null`.
3. **Avatar display was initial-only:** Introduced `IdentityImageRenderer` and used it on profile (identity + edit preview), settings profile section, and settings modal so uploaded image or preset emoji is shown.
4. **Only 12–14 presets in UI:** Profile and settings now show all 20 presets with emoji from `AVATAR_PRESET_EMOJI`; current selection is highlighted.
5. **avatarUrl not in profile API:** Extended `ProfileUpdatePayload` and `UserProfileService` to accept and persist `avatarUrl` on AppUser; PATCH and GET profile include it as `profileImageUrl`.
6. **No immediate preview before save:** Wired `ProfileImagePreviewController` in profile edit and Settings profile section; on file select we set `previewObjectUrl` (createObjectURL), show it in the controller, then revoke after upload or on cancel.
7. **Nav/header avatar:** HomeTopNav now shows user avatar (IdentityImageRenderer) when authenticated, with username on desktop and avatar-only on mobile, linking to /profile; uses `useSettingsProfile()` for profile data.

---

## 8. Final QA Checklist

- [ ] **Upload:** On profile (edit mode) and settings, click “Upload image”, choose a JPEG/PNG/GIF/WebP (≤3MB); confirm upload completes and avatar updates after reload.
- [ ] **Remove:** With an uploaded image, click “Remove image”; confirm image is cleared and preset or initial shows; confirm after reload.
- [ ] **20 avatars:** On profile and settings, confirm all 20 preset buttons show with correct emoji and the current preset is highlighted; change preset and Save; confirm displayed avatar updates and persists after reload.
- [ ] **No image:** Remove image and ensure no preset (or leave preset); confirm initial letter shows where expected.
- [ ] **Profile page:** Identity card and edit preview show uploaded image or preset emoji or initial; upload/remove/preset selection and Save work.
- [ ] **Settings:** Profile section shows same avatar; upload, remove, 20-preset grid, and Save work; refetch updates the displayed avatar.
- [ ] **Settings modal:** Profile tab shows IdentityImageRenderer with current image/preset/initial; “Change avatar” link goes to settings.
- [ ] **Nav/header:** When logged in, avatar (and username on desktop) appears in top nav and links to /profile; avatar matches profile/settings after update.
- [ ] **Immediate preview:** On profile or settings, click “Upload image” and select a file; confirm the avatar preview updates **before** upload finishes; after upload or cancel, confirm no stale object URL.
- [ ] **Mobile:** Use “Upload image” on a mobile device; confirm file picker and upload succeed.

---

## 9. Explanation of the Profile Image and Avatar System

The system gives users two ways to set how they look: **upload a photo** or **pick one of 20 app avatars**.

- **Upload:** User selects a file (image/jpeg, png, gif, webp, max 3MB). The client sends it to `POST /api/user/profile/avatar`, which saves the file under `public/uploads/avatars/` and sets `AppUser.avatarUrl` to that path. The client refetches profile so the new image appears everywhere that uses it. “Remove image” sends `avatarUrl: null` via PATCH and refetches so the UI falls back to preset or initial.
- **20 avatars:** The app defines 20 preset ids (crest, bolt, crown, trophy, etc.). Each is mapped to an emoji in `AvatarCatalogResolver` for a consistent, playful look. Profile and settings show all 20 as clickable buttons; the chosen preset is stored in `UserProfile.avatarPreset`. When the user picks a preset and saves, we also send `avatarUrl: null` so any previous upload is cleared and the preset is what’s shown.
- **Rendering:** `IdentityImageRenderer` decides what to show: if `avatarUrl` exists, it shows that image; otherwise if `avatarPreset` exists, it shows the preset emoji in a circle; otherwise the user’s initial. This is used on the profile page (identity card and edit preview), settings profile section, and settings modal so behavior is consistent.
- **Modules:** `ProfileImageUploadService` and `UserImagePersistenceService` handle upload and setting/clearing `avatarUrl`. `AvatarCatalogResolver` and `AvatarPickerService` provide the 20-option catalog and emoji mapping. The picker and upload/remove controls are implemented in the profile and settings forms. **ProfileImagePreviewController** is used there to show an **immediate preview** when the user selects a file (object URL) before the upload completes; the URL is revoked after upload or cancel. The **nav (HomeTopNav)** shows the user’s avatar when authenticated, linking to /profile.

Result: users can upload a photo, choose one of 20 avatars, or rely on their initial; they can change or remove their image later; and the same logic is used across profile, settings, and modal with no dead buttons or stale previews.
