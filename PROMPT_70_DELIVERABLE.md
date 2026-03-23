# Prompt 70: Profile Image Upload + 20 Avatar Picker + Full UI Click Audit

## 1. Architecture Overview
- **Frontend:** Next.js App Router, React client components for signup, profile, settings, nav, chat.
- **Avatar System:**
  - 20 visually distinct emoji presets (no duplicates).
  - Upload, preview, remove, and Initial (no-image) fallback.
  - Shared identity renderer for all surfaces.
- **Persistence:**
  - API: `/api/user/profile/avatar` (upload), `/api/user/profile` (PATCH avatarPreset/avatarUrl), `/api/auth/register` (signup avatar).
  - State: avatarPreset and avatarUrl stored on user profile.

## 2. Implementation Plan
- Patch all avatar preset emoji to be unique.
- Align upload validation (3MB limit) across client and backend.
- Add explicit Initial (no-image) option everywhere.
- Ensure all avatar changes clear uploaded image as needed.
- Add live preview to signup.
- Add e2e click-audit harness and Playwright spec.

## 3. Core Logic
- Avatar picker and upload logic unified across signup, settings, and profile edit.
- Shared `IdentityImageRenderer` and `ProfileImagePreviewController` for all identity surfaces.
- All avatar state changes propagate to nav/header/chat/profile.

## 4. Component/Service Updates
- [lib/avatar/AvatarCatalogResolver.ts]: Unique emoji for all 20 presets.
- [lib/signup/AvatarPickerService.ts]: 3MB validation.
- [app/signup/page.tsx]: Initial option, live preview, upload fixes.
- [app/settings/SettingsClient.tsx], [app/profile/EditableProfileFormController.tsx]: Consistent clear-on-preset.
- [app/api/auth/register/route.ts]: Accepts null preset for Initial.

## 5. Click Audit Findings
- All 20 avatar options are visually distinct and clickable.
- Upload, preview, and remove work at signup and in settings/profile.
- Initial (no-image) option is available and persists.
- All changes propagate to nav/header/chat identity.
- Reload and persistence verified.

## 6. QA Results
- **Unit:** `__tests__/avatar-catalog-resolver.test.ts` — PASS
- **E2E:** `e2e/profile-avatar-click-audit.spec.ts` — PASS (3 tests)
- **HTML Report:** Run `npx playwright show-report` for full visual log.
- **Markdown Summary:** See [artifacts/profile-click-audit-*/report.md](artifacts/profile-click-audit-*/report.md)

## 7. Fixes Applied
- No duplicate emoji in avatar picker.
- Upload size validation consistent.
- Initial/no-image option everywhere.
- All avatar state changes clear uploaded image as needed.
- All identity surfaces use shared renderer.

## 8. Checklist
- [x] 20 unique avatar presets
- [x] Upload, preview, remove everywhere
- [x] Initial (no-image) option
- [x] Live preview at signup
- [x] All surfaces update on change
- [x] E2E click-audit harness/spec
- [x] All tests pass

## 9. System Explanation
This implementation guarantees a robust, user-friendly avatar system with full testable coverage. All avatar interactions (picker, upload, remove, Initial) are available at signup and in settings/profile, with immediate preview and persistence. All identity render points (nav, header, chat, etc.) reflect the current avatar state. The click-audit harness and Playwright spec ensure every interaction is tested and verifiable.

---

**To view the full audit report:**
- Run: `npx playwright show-report`
- Or see: [artifacts/profile-click-audit-*/report.md](artifacts/profile-click-audit-*/report.md)

**All Prompt 70 requirements are now complete and validated.**
