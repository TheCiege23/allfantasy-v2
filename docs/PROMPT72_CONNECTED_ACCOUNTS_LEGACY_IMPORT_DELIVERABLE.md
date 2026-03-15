# Prompt 72 — Connected Accounts + Legacy Import Settings + Full UI Click Audit (Deliverable)

## 1. Connected Accounts / Import Settings Architecture

- **Connected sign-in providers**
  - **Source:** `AuthAccount` (provider, userId) for “linked”; env (e.g. `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_ENABLE_APPLE_AUTH`) for “configured.”
  - **API:** `GET /api/user/connected-accounts` returns `{ providers: [{ id, name, configured, linked }] }` for Google, Apple, Facebook, Instagram, X, TikTok.
  - **Connect:** User clicks “Connect” → `signIn(providerId, { callbackUrl: '/settings' })`. If provider not configured, show fallback message (no dead button).
  - **Disconnect:** Not exposed in settings to avoid lockout; `canDisconnectProvider` returns false. Documented for future use.

- **Fantasy platform (Sleeper)**
  - **Source:** `UserProfile.sleeperUsername`, `sleeperLinkedAt`; link is created via dashboard/Legacy flow (not OAuth).
  - **Settings:** Connected Accounts tab shows “Sleeper” under “Fantasy platform (Legacy import)” with Linked as @username or “Connect Sleeper” → `/dashboard`.

- **Legacy import**
  - **Source:** `LegacyUser` (by sleeperUsername), `LegacyImportJob` (status, progress, error); `AppUser.legacyUserId` links to `LegacyUser`.
  - **API:** `GET /api/user/legacy-import-status` returns `{ sleeperUsername, providers: { sleeper, yahoo, espn, mfl, fleaflicker, fantrax } }` with linked, importStatus, lastJobAt, error, available. Sleeper is populated from profile + LegacyImportJob; others available: false.
  - **UI:** Legacy Import tab lists all six providers; Sleeper shows linked + import status and “Start import” / “Re-import / refresh” → `/af-legacy` or “Connect first” → `/dashboard`. Others show “Coming soon.” Explanation: import affects rankings/level; no history = start from level 1.

---

## 2. Provider Connection Logic

- **ConnectedAccountService:** `getConnectedAccounts()` → GET `/api/user/connected-accounts`; returns provider list.
- **ProviderConnectionResolver:** `getProviderConnectAction(configured)` → “connect” | “fallback”; `getProviderFallbackMessage(providerId)` returns message when not configured.
- **ProviderFallbackViewService:** `getFallbackViewMessage(providerId)` (same as above); `canDisconnectProvider()` → false.
- **Connect flow:** Settings “Connect” calls `signIn(providerId, { callbackUrl: '/settings' })` when configured; when not configured, shows fallback message (no redirect). OAuth callback is handled by NextAuth; if using an adapter that writes to `AuthAccount`, “linked” will update after next fetch.

---

## 3. Legacy Import Settings Logic

- **LegacyImportSettingsService:** `getLegacyImportStatus()` → GET `/api/user/legacy-import-status`; returns sleeperUsername and per-provider status.
- **ImportStatusQueryService:** `getLegacyProviderName(id)`, `LEGACY_PROVIDER_IDS`, `getImportStatusLabel(status)`, `getProviderStatus(data, providerId)` for consistent labels and status.
- **Import status:** Sleeper: from `UserProfile.sleeperUsername` → `LegacyUser` → latest `LegacyImportJob` (status, progress, error). Status labels: Completed, Importing…, Queued, Failed, Not started.
- **Actions:** “Start import” / “Re-import / refresh” link to `/af-legacy`; “Connect first” links to `/dashboard`. “Open Legacy app” and “Dashboard (link Sleeper)” at bottom of Legacy Import tab.

---

## 4. Frontend Settings Component Updates

- **ConnectedIdentityRenderer** (`components/connected-accounts/ConnectedIdentityRenderer.tsx`): Renders one provider row (name + Linked/Not linked with icon). Used in Connected Accounts tab for each sign-in provider.
- **Connected Accounts tab**
  - Fetches `getConnectedAccounts()` on mount; state: providers, loading, fallbackMessage.
  - “Sign-in providers” list: each provider has ConnectedIdentityRenderer + “Connect” (or “Connected” if linked). Click “Connect” → handleConnect(id, configured): if !configured show fallback message, else signIn(id, { callbackUrl: '/settings' }).
  - “Fantasy platform (Legacy import)”: Sleeper row with Linked as @username or “Connect Sleeper” → `/dashboard`.
- **Legacy Import tab**
  - Fetches `getLegacyImportStatus()` on mount; state: legacyStatus, loading.
  - Copy: rankings/level and “start from scratch (level 1)” when no history.
  - “Import providers” list: Sleeper, Yahoo, ESPN, MFL, Fleaflicker, Fantrax. Sleeper: linked + import status, “Re-import / refresh” or “Start import” → `/af-legacy`, or “Connect first” → `/dashboard`. Others: “Coming soon.”
  - Links: “Open Legacy app” → `/af-legacy`, “Dashboard (link Sleeper)” → `/dashboard`.

---

## 5. Full UI Click Audit Findings

| Location | Element | Handler | State / API | Persisted / Reload | Status |
|----------|--------|---------|-------------|--------------------|--------|
| **Settings – Connected** | Tab | setActiveTab("connected") | — | — | OK |
| **Settings – Connected** | Connect (provider) | handleConnect(id, configured) | signIn(id) or setFallbackMessage | — | OK |
| **Settings – Connected** | Provider list | — | getConnectedAccounts() → GET /api/user/connected-accounts | On mount | OK |
| **Settings – Connected** | Connect Sleeper | Link | /dashboard | — | OK |
| **Settings – Legacy** | Tab | setActiveTab("legacy") | — | — | OK |
| **Settings – Legacy** | Import list | — | getLegacyImportStatus() → GET /api/user/legacy-import-status | On mount | OK |
| **Settings – Legacy** | Start import / Re-import | Link | /af-legacy | — | OK |
| **Settings – Legacy** | Connect first | Link | /dashboard | — | OK |
| **Settings – Legacy** | Open Legacy app | Link | /af-legacy | — | OK |
| **Settings – Legacy** | Dashboard (link Sleeper) | Link | /dashboard | — | OK |
| **GET /api/user/connected-accounts** | — | — | AuthAccount + env | Yes | OK |
| **GET /api/user/legacy-import-status** | — | — | UserProfile + LegacyUser + LegacyImportJob | Yes | OK |

**Notes**

- Fallback: When a sign-in provider is not configured, “Connect” shows an inline message instead of calling signIn; no dead button.
- Disconnect: Intentionally not exposed; at least one sign-in method must remain.
- Legacy import status and connected accounts are refetched when the user reopens the tab (remount) or navigates back to settings.

---

## 6. QA Findings

- **Positive:** Provider list loads; Connect triggers signIn for configured providers; fallback message for unconfigured; Sleeper shows linked/connect; Legacy Import shows Sleeper status and links; other legacy providers show “Coming soon”; rankings/level copy is clear.
- **Edge cases:** If GET connected-accounts or legacy-import-status fails, list is empty or loading stops; no crash. OAuth “linked” depends on AuthAccount (adapter); if app uses JWT-only, linked may stay false until adapter is used.
- **Mobile/desktop:** Same flows; links and buttons work.

---

## 7. Issues Fixed

1. **Connected Accounts was Sleeper-only:** Added sign-in provider list (Google, Apple, Facebook, Instagram, X, TikTok) with configured/linked from API and Connect/fallback behavior.
2. **No provider status API:** Added GET `/api/user/connected-accounts` (AuthAccount + env) and GET `/api/user/legacy-import-status` (profile + LegacyUser + LegacyImportJob).
3. **Legacy Import was placeholder copy:** Added provider list (Sleeper + five “coming soon”), Sleeper linked + import status, Start/Re-import and Connect first links, and rankings/level explanation.
4. **No fallback for unconfigured providers:** Connect click shows inline message when provider is not configured instead of failing or doing nothing.
5. **No shared components:** Added ConnectedIdentityRenderer and lib modules (ConnectedAccountService, ProviderConnectionResolver, ProviderFallbackViewService, LegacyImportSettingsService, ImportStatusQueryService) for reuse and auditability.

---

## 8. Final QA Checklist

- [ ] **Connected Accounts tab:** Opens and loads provider list; each provider shows Linked or Not linked and Connect or “Connected.”
- [ ] **Connect (configured):** Click Connect for Google (or Apple if enabled) → redirects to provider then back to /settings.
- [ ] **Connect (not configured):** Click Connect for Facebook/Instagram/X/TikTok → inline fallback message, no redirect.
- [ ] **Sleeper (Connected):** “Connect Sleeper” and “Linked as @…” and link to dashboard work.
- [ ] **Legacy Import tab:** Loads; rankings/level copy visible; Sleeper row shows linked + import status; “Start import” / “Re-import / refresh” / “Connect first” correct; Yahoo/ESPN/MFL/Fleaflicker/Fantrax show “Coming soon.”
- [ ] **Legacy links:** “Open Legacy app” and “Dashboard (link Sleeper)” go to /af-legacy and /dashboard.
- [ ] **Navigation:** Switching between Connected Accounts and Legacy Import tabs works; data loads per tab.
- [ ] **Mobile:** All buttons and links usable.

---

## 9. Explanation of the Connected Accounts and Legacy Import Settings System

The settings area gives one place to manage **sign-in providers** and **legacy import**.

- **Connected Accounts**
  - **Sign-in providers:** Google, Apple, Facebook, Instagram, X, TikTok. Each shows linked (from AuthAccount) and configured (from env). “Connect” either starts OAuth (when configured) or shows a short “not configured” / “planned” message so every button does something.
  - **Sleeper:** Shown as the fantasy platform link; connect via dashboard. Used for Legacy import and league sync.

- **Legacy Import**
  - **Rankings/level:** Copy explains that import affects rankings and level; no import means starting from level 1.
  - **Providers:** Sleeper (linked + import status from LegacyImportJob), Yahoo, ESPN, MFL, Fleaflicker, Fantrax (coming soon). For Sleeper: “Start import” or “Re-import / refresh” to Legacy app, or “Connect first” to dashboard.
  - **APIs:** Connected accounts and legacy import status come from GET `/api/user/connected-accounts` and GET `/api/user/legacy-import-status`; both are used on tab mount so status is correct and all click paths are wired with no dead buttons.
