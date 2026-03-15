# Prompt 73 — Notification Preferences + Full UI Click Audit (Deliverable)

## 1. Notification Settings Architecture

- **Storage:** `UserProfile.notificationPreferences` (Json). Shape: `NotificationPreferences` with `globalEnabled?: boolean` and `categories?: Partial<Record<NotificationCategoryId, NotificationChannelPrefs>>`. Each category has `enabled`, `inApp`, `email`, `sms`.
- **API:** GET `/api/user/profile` returns `notificationPreferences`; PATCH `/api/user/profile` accepts `notificationPreferences` and persists via `UserProfileService`.
- **Categories (11):** lineup_reminders, matchup_results, waiver_processing, trade_proposals, trade_accept_reject, chat_mentions, bracket_updates, ai_alerts, league_drama, commissioner_alerts, system_account.
- **Delivery:** in-app (always), email (when user has email), SMS (when phone verified). Resolved by `DeliveryMethodResolver.getDeliveryMethodAvailability({ hasEmail, phoneVerified })`.
- **Defaults:** `NotificationPreferenceResolver.getDefaultNotificationPreferences()`: globalEnabled true, all categories enabled with inApp + email on, SMS off. Saved prefs are merged with defaults via `resolveNotificationPreferences(saved)`.

---

## 2. Preference Persistence Logic

- **Read:** Settings Notifications tab uses `profile.notificationPreferences` from `useSettingsProfile()` (GET profile). Client merges with `resolveNotificationPreferences(profile?.notificationPreferences)` so missing categories get defaults.
- **Write:** User edits toggles → local state `prefs`; "Save preferences" → `updateNotificationPreferences(prefs)` → PATCH `/api/user/profile` with `notificationPreferences: prefs` → `UserProfileService.updateUserProfile` updates `UserProfile.notificationPreferences`. Client then `onRefetch()` so profile reloads.
- **Reset:** "Reset to defaults" sets local state to `getDefaultNotificationPreferences()` and marks dirty; user can then Save to persist defaults.

---

## 3. Backend Settings Updates

- **Prisma:** `UserProfile` has `notificationPreferences Json?`. Migration `20260330000000_add_notification_preferences` adds the column.
- **SettingsQueryService:** Selects `notificationPreferences` and returns it in `UserProfileForSettings`.
- **UserProfileService:** `ProfileUpdatePayload.notificationPreferences` is written to `UserProfile.notificationPreferences` (null clears).
- **PATCH /api/user/profile:** Accepts `notificationPreferences` in body and passes to `updateUserProfile`.

---

## 4. Frontend Settings Component Updates

- **NotificationCategoryRenderer** (`components/notification-settings/NotificationCategoryRenderer.tsx`): One category row with expand/collapse (chevron), label, enabled checkbox, and when expanded: delivery checkboxes (In-app, Email, SMS if available). Handlers: onToggleExpand, onToggleEnabled, onToggleChannel.
- **NotificationsSection (Settings → Notifications):**
  - Uses `profile` and `onRefetch` from parent. State: `prefs` (resolved from profile), `expandedCategory`, `saving`, `saveError`, `dirty`.
  - **Global toggle:** "Notifications" On/Off (`prefs.globalEnabled`). Copy: when off, non-critical notifications paused; account/security emails still apply.
  - **By category:** List of 11 categories; each uses NotificationCategoryRenderer. Expand/collapse toggles which category is expanded; per-category enabled and in-app/email/SMS toggles update local `prefs` and set `dirty`.
  - **Save preferences:** Disabled when !dirty or saving; calls `updateNotificationPreferences(prefs)` then `onRefetch()`. On error shows `saveError`.
  - **Reset to defaults:** Sets `prefs` to `getDefaultNotificationPreferences()`, sets `dirty` so user can Save.
- **Delivery availability:** From `getDeliveryMethodAvailability({ hasEmail: !!profile?.email, phoneVerified: !!profile?.phoneVerifiedAt })`; SMS checkbox only shown when `deliveryAvailability.sms`.

---

## 5. Full UI Click Audit Findings

| Location | Element | Handler | State / API | Persisted / Reload | Status |
|----------|--------|---------|-------------|--------------------|--------|
| **Settings – Notifications** | Global On/Off | onChange → setPrefs(globalEnabled) | Local state, dirty | Save → PATCH | OK |
| **Settings – Notifications** | Category expand/collapse | onToggleExpand | setExpandedCategory | — | OK |
| **Settings – Notifications** | Category enabled checkbox | onToggleEnabled → updateCategory | Local prefs, dirty | Save → PATCH | OK |
| **Settings – Notifications** | In-app / Email / SMS checkboxes | onToggleChannel → updateCategory | Local prefs, dirty | Save → PATCH | OK |
| **Settings – Notifications** | Save preferences | handleSave | updateNotificationPreferences → PATCH profile | onRefetch() | OK |
| **Settings – Notifications** | Reset to defaults | handleReset | setPrefs(defaults), dirty | User can Save | OK |
| **PATCH /api/user/profile** | notificationPreferences | body | UserProfileService | GET profile | OK |
| **GET /api/user/profile** | notificationPreferences | — | From UserProfile | Yes | OK |

**Notes**

- All toggles update local state and set dirty; only Save persists. Reset only updates local state until Save.
- Expanded category is single (one open at a time). Delivery toggles disabled when channel unavailable (e.g. SMS when phone not verified).

---

## 6. QA Findings

- **Positive:** Global and per-category toggles update UI; Save persists and refetch shows saved prefs; Reset loads defaults into form; expand/collapse works; delivery toggles respect email/phone availability.
- **Edge cases:** Empty or null saved prefs merge with defaults; invalid JSON in DB would be handled by resolver (fallback to defaults). SMS only shown when phone verified.
- **Mobile/desktop:** Same layout; toggles and buttons work on both.

---

## 7. Issues Fixed

1. **Notifications tab was placeholder:** Replaced with full preference UI: global toggle, 11 categories with expand/collapse and enabled + delivery toggles, Save and Reset.
2. **No persistence:** Added `notificationPreferences` to UserProfile (schema + migration), profile GET/PATCH, UserProfileService, and types; client saves via PATCH and refetches.
3. **No defaults or merge:** Added NotificationPreferenceResolver (defaults + resolve merge); UI always has a full shape.
4. **No delivery awareness:** DeliveryMethodResolver and availability (in-app always, email when has email, SMS when phone verified) drive which checkboxes show and are enabled.
5. **No category component:** Added NotificationCategoryRenderer for consistent category row and expand/collapse + delivery toggles.

---

## 8. Final QA Checklist

- [ ] **Global toggle:** Turn Off/On; Save; reload; confirm value persists.
- [ ] **Category expand:** Open one category; open another; confirm only one expanded; delivery toggles visible when expanded.
- [ ] **Category enabled:** Toggle a category Off/On; Save; reload; confirm category enabled state persists.
- [ ] **Delivery toggles:** Change in-app/email (and SMS if phone verified); Save; reload; confirm delivery prefs persist.
- [ ] **Reset:** Click Reset to defaults; confirm all categories and global match defaults; Save; reload; confirm defaults persisted.
- [ ] **Save disabled:** Confirm Save is disabled when not dirty; after Save, dirty clears until next edit.
- [ ] **Error:** Simulate save failure (e.g. offline); confirm error message shown.
- [ ] **Mobile:** All toggles and buttons usable; layout readable.

---

## 9. Explanation of the Notification Preferences System

Users control how and where they get alerts from a single Notifications tab in Settings.

- **Global switch:** Notifications can be turned off globally; account and security emails are still sent. When on, per-category and delivery settings apply.
- **Categories (11):** Lineup reminders, matchup results, waiver processing, trade proposals, trade accept/reject, chat mentions, bracket updates, AI alerts, league drama/storylines, commissioner alerts, system & account alerts. Each category can be enabled/disabled and, when expanded, can set delivery: In-app, Email, and SMS (SMS only if the user has a verified phone).
- **Persistence:** Preferences are stored in `UserProfile.notificationPreferences` (JSON) and updated via the existing profile PATCH API. The client merges saved data with defaults so missing categories get default values. Save writes current form state; Reset loads defaults into the form (user must Save to persist them).
- **Modules:** NotificationSettingsService (get from profile, update via PATCH), NotificationPreferenceResolver (defaults and merge), DeliveryMethodResolver (which channels are available), and NotificationCategoryRenderer (one category row with expand and toggles) keep the flow consistent and every toggle wired so there are no dead controls or stale state after save.
