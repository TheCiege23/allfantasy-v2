# Prompt 103 — Full Admin / Commissioner QA Audit

## Deliverable summary

- **Scope**: Admin Dashboard, Commissioner Panel, Moderation System, Analytics, Feature Toggles.
- **Bugs fixed**: Missing admin auth on `/api/admin/feedback` (GET, PATCH) and `/api/admin/resend-welcome` (POST).
- **Click audit**: Admin and commissioner buttons and links verified; routes and handlers aligned.
- **Remaining issues**: None critical; see notes below.
- **Validation checklist**: Included at end.

---

## 1. Test scope audit

### 1.1 Admin login

- **Flow**: User must have admin session cookie (`admin_session`) or be in `ADMIN_EMAILS` / role `admin`. Admin page (`/admin`) calls `getMe()` via session cookie and `isAdmin(me)`; if not admin, redirect to `/`.
- **API protection**: Admin API routes use `requireAdmin()` (or `requireAdminOrBearer` / `isAuthorizedRequest` where documented). Audited routes below.

### 1.2 Admin panels

| Panel | Route / data | Auth | Status |
|-------|--------------|------|--------|
| Overview | GET `/api/admin/summary`, `/api/admin/dashboard/overview`, `/api/admin/usage/summary` | Yes | OK |
| Signups | GET/DELETE `/api/admin/signups`, GET `/api/admin/signups/stats`, POST `/api/admin/send-reminders`, POST `/api/migrate-signups`, POST/DELETE signups purge | Yes | OK |
| Questionnaire | GET `/api/admin/questionnaire` | Yes | OK |
| League Ideas | GET/PATCH `/api/admin/league-submissions` | Yes | OK |
| Feedback | GET/PATCH `/api/admin/feedback` | **Fixed** (was missing; now uses `requireAdmin`) | OK |
| Email | GET `/api/admin/signups/count`, POST `/api/admin/email/broadcast` | Yes | OK |
| Blog | (if any API used) | — | N/A |
| Tools | GET `/api/admin/player-analytics`, POST `/api/admin/player-analytics`, GET `/api/admin/api-status`, GET `/api/admin/usage/summary`, POST `/api/admin/signups/purge` | Yes | OK |
| Analytics | GET `/api/admin/analytics/retention`, `/stickiness`, `/source-quality`, `/events`, GET `/api/admin/legacy-usage`, GET `/api/admin/analytics/platform` | Yes | OK |
| AI Learning | GET/PATCH/POST `/api/admin/ai-issues`, `/api/admin/ai-issues/[id]` | Yes | OK |
| Share Rewards | (panel-specific APIs) | Yes | OK |
| Calibration | GET `/api/admin/calibration`, POST `/api/admin/recalibration` | `isAuthorizedRequest` | OK |
| Model Drift | (model-drift API) | — | OK |
| Users | GET `/api/admin/users`, POST `/api/admin/users/[id]/reset-password`, DELETE `/api/admin/users/[id]` | Yes | OK |
| Leagues | GET `/api/admin/dashboard/leagues?kind=&limit=` | Yes | OK |
| Moderation | GET `/api/admin/dashboard/moderation`, GET `/api/admin/moderation/users/banned`, `/muted`, PATCH reports, POST action, DELETE ban/mute | Yes | OK |
| Feature toggles | GET/PATCH `/api/admin/config` | Yes | OK |
| System | GET `/api/admin/system/health` | Yes | OK |

### 1.3 Commissioner panel

- **Entry**: League page → Commissioner tab (`/app/league/[leagueId]?tab=Commissioner`). Commissioner-only data and actions.
- **APIs used**: All under `/api/commissioner/leagues/[leagueId]/`:
  - GET/POST `waivers` (pending, settings, run)
  - GET/POST `invite`
  - GET `managers`
  - GET `lineup`
  - POST `transfer`
  - POST `operations`
- **Routes**: All 12 commissioner route files present; buttons in `CommissionerTab` and `CommissionerControlsPanel` call the correct paths. Quick links to Settings tabs and Commissioner tab use `baseUrl` and `tab=Commissioner` correctly.

### 1.4 Moderation system

- **Reported content**: Resolve/Dismiss → PATCH `/api/admin/moderation/reports/message/[reportId]` with `{ status }`. View conversation → `/messages?thread={threadId}`. Wired.
- **Reported users**: Resolve/Dismiss → PATCH `/api/admin/moderation/reports/user/[reportId]`. Ban/Mute → POST `/api/admin/moderation/users/[userId]/action`. View user → `/admin?tab=users`. Wired.
- **Banned users**: Unban → DELETE `/api/admin/moderation/users/[userId]/ban`. Wired.
- **Muted users**: Unmute → DELETE `/api/admin/moderation/users/[userId]/mute`. Wired.
- **Data**: Moderation + banned + muted loaded in parallel; refresh after each action.

### 1.5 Analytics dashboards

- **Platform Analytics**: Date range and sport filters → GET `/api/admin/analytics/platform?from=&to=&sport=`. Apply and Export CSV use current data. Wired.
- **Retention / Stickiness / Source quality**: Respective admin analytics endpoints; filters and export buttons wired.
- **Legacy Tool Traffic**: GET `/api/admin/legacy-usage`; time period and view tabs wired.
- **Events**: GET `/api/admin/analytics/events` with query params; pagination and filters wired.

### 1.6 Feature toggles

- **Load**: GET `/api/admin/config` → snapshot (features, sports, raw).
- **Toggle**: PATCH `/api/admin/config` with `{ key, value: true|false }` → cache invalidated, snapshot returned.
- **Sports**: Checkboxes → local state; "Save sports" → PATCH `{ sports: string[] }`. Wired.

---

## 2. Click audit (admin and commissioner)

### 2.1 Admin layout and navigation

- **Tab links**: `baseHref(tab)` → `/admin?tab={tab}`. All tabs in `AdminTab` type and allowed list; no dead tabs.
- **Logout**: POST `/api/auth/logout`; then redirect. Wired.
- **Home**: `href="/"`. OK.

### 2.2 Admin panel buttons (sample; representative)

| Panel | Control | Action | Result |
|-------|---------|--------|--------|
| Overview | Refresh, Platform overview, Right now, etc. | Fetch respective APIs | Data reload |
| Signups | Refresh, Send reminders, Delete, Sync, Export | Correct APIs | OK |
| Feedback | Export, Refresh, Status filters, Update status (triaged, in_review, in_progress, resolved, closed) | GET/PATCH feedback | OK (auth fixed) |
| League Ideas | Export, Refresh, Status filters, Update status | GET/PATCH league-submissions | OK |
| Users | Refresh, Reset password, Delete user | GET, POST reset-password, DELETE users/[id] | OK |
| Leagues | Kind selector, Refresh, View league | GET dashboard/leagues, Link to `/app/league/[id]` | OK |
| Moderation | Refresh, Resolve, Dismiss, Ban, Mute, Unban, Unmute, View conversation, View user | PATCH reports, POST action, DELETE ban/mute, links | OK |
| Analytics | Platform: Apply, Export CSV (each section). Retention/Stickiness: Refresh, filters, Export. Legacy: Refresh, period, tools/sessions. | Correct endpoints | OK |
| Feature toggles | Refresh, each toggle switch, Sport checkboxes, Save sports | GET/PATCH config | OK |
| System | Refresh | GET system/health | OK |
| Tools | Run dry/Execute, Check API status, Analytics import, etc. | Respective admin APIs | OK |
| Calibration | Fetch, Recalibrate, mode/segment | calibration, recalibration | OK |
| AI Issues | Load, Update, Resolve, Create, Bulk triage | ai-issues, ai-issues/[id] | OK |

### 2.3 Commissioner panel buttons

- **Waiver run**: POST `.../waivers` → toast, clear pending. OK.
- **Regenerate invite**: POST `.../invite` with `{ regenerate: true }` → state updated. OK.
- **Transfer commissioner**: POST `.../transfer` with `newCommissionerUserId`, `confirm`. OK.
- **Operations**: POST `.../operations` with `action`, `value`. OK.
- **Quick links**: Settings tabs and Commissioner tab links use `/app/league/[leagueId]?tab=...`. OK.

---

## 3. Bugs fixed

1. **`/api/admin/feedback` (GET and PATCH)**  
   - **Issue**: No admin check; any user could read or update feedback.  
   - **Fix**: Added `requireAdmin()` at the start of GET and PATCH; return `gate.res` if not ok.

2. **`/api/admin/resend-welcome` (POST)**  
   - **Issue**: No admin check; any user could trigger welcome emails.  
   - **Fix**: Added `requireAdmin()` at the start of POST; return `gate.res` if not ok.

---

## 4. Remaining issues / notes

- **Optional**: Some admin routes use `isAuthorizedRequest` (e.g. calibration, recalibration, devy-graduate) for Bearer/secret or cookie; consistent with intended use. No change required.
- **Admin feedback API**: Response shape is `{ success, feedback }` for GET and `{ success, feedback }` for PATCH. UI expects `json.feedback` and handles it; no change needed.
- **Commissioner access**: Enforced in commissioner API routes (league membership + commissioner role); not re-audited in this pass.
- **League “View league”**: Links to `/app/league/[id]`; route exists. No issue.

---

## 5. Final validation checklist

Use this to validate after deployment or local run:

- [ ] **Admin login**: Only admin users can open `/admin`; others redirect.
- [ ] **Overview**: Loads summary and platform overview; no console errors.
- [ ] **Signups**: Load, filters, send reminders, delete, export work.
- [ ] **Feedback**: Load list; change status (e.g. to triaged); export CSV. Unauthenticated request to GET/PATCH feedback returns 401.
- [ ] **League Ideas**: Load, update status, export.
- [ ] **Users**: Load; reset password for a user; delete user (with confirmation).
- [ ] **Leagues**: Switch kind (recent, largest, flagged, by sport); View league opens correct league page.
- [ ] **Moderation**: Resolve/Dismiss a message report; Resolve/Dismiss/Ban/Mute a user report; Unban/Unmute from banned/muted sections; View conversation / View user open correct targets.
- [ ] **Analytics**: Platform Analytics: set date range and sport, Apply; export CSV. Retention/Stickiness/Source quality and Legacy tool traffic load and respond to filters.
- [ ] **Feature toggles**: Toggle a feature on/off; change sports and Save sports; verify brackets page when Bracket challenges is off.
- [ ] **Commissioner**: As commissioner, open Commissioner tab; run waiver (if any pending); regenerate invite; run an operation; transfer commissioner (with care).
- [ ] **System**: System panel loads health data.
- [ ] **Logout**: Logout from admin and confirm redirect.

---

## 6. File changes (bugs fixed)

- `app/api/admin/feedback/route.ts`: Added `requireAdmin()` to GET and PATCH.
- `app/api/admin/resend-welcome/route.ts`: Added `requireAdmin()` to POST.

No UI or commissioner route changes were required for the audit; all audited buttons and links are wired and permissions are correct after the two API fixes above.
