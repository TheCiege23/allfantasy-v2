# Prompt 98 — Admin Dashboard Core System + Full UI Click Audit

## Deliverable summary

- **Admin Dashboard architecture** implemented with core modules, new API routes, and three new panels (Leagues, Moderation, System).
- **Platform Overview** on the Overview tab extended with six KPIs from the new dashboard overview API.
- **Backend** modules and APIs added; existing admin login, routes, and tools preserved.
- **Full UI click audit** performed; findings and QA checklist documented below.

---

## 1. Admin dashboard architecture

### 1.1 Access and layout

- **Admin login**: Unchanged. Uses `admin_session` cookie; `verifyAdminSessionCookie()` in `lib/adminSession.ts`. Admin check: `role === "admin"` or email in `ADMIN_EMAILS` env (see `app/admin/page.tsx` and `lib/adminAuth.ts`).
- **Routes**: `/admin` with `?tab=<tab>`. All admin API routes use `requireAdmin()` from `lib/adminAuth.ts`.
- **Layout**: `app/admin/components/AdminLayout.tsx` — sidebar (desktop), mobile drawer, Cmd+K palette, tab content area. New tabs: **Leagues**, **Moderation**, **System**.

### 1.2 Core modules (`lib/admin-dashboard/`)

| Module | Purpose |
|--------|--------|
| **AdminDashboardService** | Platform KPIs: total users, active users today, active leagues, brackets created, drafts (24h), trades today. |
| **AdminAnalyticsResolver** | Leagues count by sport (all 7 sports); sport labels. |
| **AdminUserManagementService** | Newest users, most active users (by event count), reported user summaries (with report count). |
| **AdminLeagueManagementService** | Leagues by sport, largest leagues, recently created, flagged (sync error). All 7 sports via `SUPPORTED_SPORTS`. |
| **AdminModerationBridge** | Reported content (message reports), reported user records, blocked users. |
| **SystemHealthResolver** | API health (Sleeper, Yahoo, MFL, Fantrax, FantasyCalc, TheSportsDB, ESPN, OpenAI, Grok), database ping, latency. |

### 1.3 API routes

| Route | Method | Purpose |
|-------|--------|--------|
| `/api/admin/dashboard/overview` | GET | Platform overview metrics (6 KPIs). |
| `/api/admin/dashboard/leagues?kind=by_sport|largest|recent|flagged&limit=25` | GET | League lists or counts by sport. |
| `/api/admin/dashboard/users?kind=newest|active|reported&limit=50` | GET | User lists (newest, most active, reported). |
| `/api/admin/dashboard/moderation?limit=50` | GET | Reported content, reported users, blocked users. |
| `/api/admin/system/health` | GET | API + database health. |

All require admin (session or bearer/secret via `requireAdmin()`).

---

## 2. Backend updates

- **New lib**: `lib/admin-dashboard/` — types, AdminDashboardService, AdminAnalyticsResolver, AdminUserManagementService, AdminLeagueManagementService, AdminModerationBridge, SystemHealthResolver. Exports curated to avoid name clashes (`getLeaguesCountBySport`, `getReportedUserSummaries`, `getReportedUserRecords`).
- **New API routes** (above). No changes to existing admin routes (`/api/admin/summary`, `/api/admin/users`, etc.).
- **Sports**: All seven sports supported (NFL, NHL, NBA, MLB, NCAAF, NCAAB, SOCCER) via `lib/sport-scope.ts` and `LeagueSport` in Prisma.

---

## 3. Frontend admin UI updates

### 3.1 Overview tab

- **Platform Overview** strip added: Total users, Active today, Active leagues, Brackets created, Drafts (24h), Trades today. Data from `/api/admin/dashboard/overview`. Refresh button reloads overview, Right Now, regions, and platform overview.
- Existing blocks kept: Right Now, Top Endpoints/Tools, signup/legacy stats, Quick Actions, Platform Health, Top Regions.

### 3.2 New tabs and panels

- **Leagues** (`AdminLeagueOverview.tsx`): Dropdown `kind`: By sport, Largest leagues, Recently created, Flagged (sync error). Table with View league → `/app/league/[id]`. Refresh button.
- **Moderation** (`AdminModerationPanel.tsx`): Three sections — Reported content (link to thread/message), Reported users (link to Users tab), Blocked users. Refresh button.
- **System** (`AdminSystemPanel.tsx`): Database status + latency; table of external APIs with status and latency. Refresh button.

### 3.3 Layout and nav

- **AdminLayout**: New tabs in NAV and TAB_SUMMARY; icons Trophy (Leagues), Flag (Moderation), Server (System). Sidebar, mobile tabs, and Cmd+K palette include the new tabs.

---

## 4. Full click audit findings

### 4.1 Admin login

| Element | Component/Route | Handler | Backend | Permissions | Status |
|--------|------------------|---------|---------|-------------|--------|
| Login (redirect to /admin) | `/login` | next-auth / credentials + admin session | `/api/auth/login`, admin session set | ADMIN_EMAILS / role | OK (unchanged) |
| Admin nav link | Global nav | Link to `/admin` | — | Shown only when `isAdmin` | OK (`AdminNavVisibilityResolver`) |

### 4.2 Dashboard open and tab switching

| Element | Component/Route | Handler | Backend | Permissions | Status |
|--------|------------------|---------|---------|-------------|--------|
| Open dashboard | Link `/admin` | Next navigation | — | Admin only | OK |
| Tab switch (sidebar) | AdminLayout | `Link` to `?tab=<tab>` | — | Admin | OK |
| Tab switch (mobile) | AdminTabsBar | `setTab` → `router.replace(baseHref(t))` | — | Admin | OK |
| Cmd+K palette | AdminLayout | Link to `?tab=<tab>`, close palette | — | Admin | OK |

### 4.3 Platform Overview (Overview tab)

| Element | Component/Route | Handler | Backend | Permissions | Status |
|--------|------------------|---------|---------|-------------|--------|
| Refresh | AdminOverview | `load(); loadRightNow(); loadRegions(); loadPlatformOverview()` | `/api/admin/summary`, usage summary, visitor-locations, `/api/admin/dashboard/overview` | Admin | OK |
| Quick action: Rebuild Hall of Fame | AdminOverview | `executeAction("hallOfFame", "/api/leagues/demo/hall-of-fame", "POST")` | Demo league HoF endpoint | Admin | OK (endpoint must exist) |
| Quick action: Calibration | AdminOverview | `executeAction("calibration", "/api/admin/calibration", "POST")` | `/api/admin/calibration` | Admin | OK |
| Quick action: Data Sync | AdminOverview | `executeAction("dataSync", "/api/sports/sync", "POST")` | `/api/sports/sync` | Admin | OK |
| Quick action: View Analytics | AdminOverview | Link `/admin?tab=analytics` | — | Admin | OK |
| Platform Health items | AdminOverview | Link `/admin?tab=analytics` | — | Admin | OK |
| High error rate banner | AdminOverview | Link to analytics with scope/days | — | Admin | OK |

### 4.4 League Overview tab

| Element | Component/Route | Handler | Backend | Permissions | Status |
|--------|------------------|---------|---------|-------------|--------|
| Kind dropdown | AdminLeagueOverview | `setKind` → re-fetch | `/api/admin/dashboard/leagues?kind=...` | Admin | OK |
| Refresh | AdminLeagueOverview | `load()` | Same | Admin | OK |
| View league | AdminLeagueOverview | `Link` to `/app/league/[id]` (target _blank) | — | Admin | OK (app route) |

### 4.5 Moderation tab

| Element | Component/Route | Handler | Backend | Permissions | Status |
|--------|------------------|---------|---------|-------------|--------|
| Refresh | AdminModerationPanel | `load()` | `/api/admin/dashboard/moderation` | Admin | OK |
| Reported content row link | AdminModerationPanel | Link to `/messages?thread=<threadId>` | — | Admin | OK (messages route) |
| Reported user “View user” | AdminModerationPanel | Link `/admin?tab=users` | — | Admin | OK (no deep link to user id; operator uses Users tab search) |

### 4.6 System tab

| Element | Component/Route | Handler | Backend | Permissions | Status |
|--------|------------------|---------|---------|-------------|--------|
| Refresh | AdminSystemPanel | `load()` | `/api/admin/system/health` | Admin | OK |

### 4.7 Users tab (existing)

| Element | Component/Route | Handler | Backend | Permissions | Status |
|--------|------------------|---------|---------|-------------|--------|
| Search | AdminUsers | `setSearchQ` (client filter) | — | Admin | OK |
| Refresh | AdminUsers | `load()` | `/api/admin/users` | Admin | OK |
| Reset PW | AdminUsers | `handleResetPassword` → POST `/api/admin/users/[id]/reset-password` | That route | Admin | OK |
| Delete | AdminUsers | Confirm → DELETE `/api/admin/users/[id]` | That route | Admin | OK |

### 4.8 Header / global

| Element | Component/Route | Handler | Backend | Permissions | Status |
|--------|------------------|---------|---------|-------------|--------|
| Home | AdminLayout | Link `/` | — | Admin | OK |
| Logout | AdminLayout | POST `/api/auth/logout` then `window.location.href = "/login"` | Logout API | — | OK |

### 4.9 Items not implemented (by design)

- **Ban user / Suspend user**: No dedicated “ban” or “suspend” buttons in UI; user state is not extended in this deliverable. Delete user exists. Ban/suspend can be added later (e.g. flag on `AppUser` or profile).
- **Delete league**: No “delete league” button in admin UI; League model and app flows would need a delete policy. Not implemented in this task.
- **Moderation “resolve” buttons**: Reported content/users show status and links only; no resolve/approve/dismiss API or buttons in this deliverable.
- **Worker queue health**: System panel shows API + DB only; worker queue health placeholder for when a queue exists.

---

## 5. QA findings and issues fixed

- **Build**: Fixed AdminTab type (added `leagues` | `moderation` | `system`), conflicting star exports in `lib/admin-dashboard/index.ts` (renamed/resolved exports), and missing `PlatformOverview` type in AdminOverview. Build passes.
- **AdminLayout**: All new tabs present in NAV and TAB_SUMMARY; glow styles for `rose` and `slate` added.
- **Data**: Dashboard overview uses `prisma.appUser`, `prisma.league`, `prisma.bracketLeague`, `prisma.mockDraft`, `prisma.leagueTrade` (tradeDate today), and `prisma.analyticsEvent` (distinct userId today) for the six KPIs.

---

## 6. Final QA checklist

- [ ] **Admin login**: Log in with admin email; redirect to `/admin`; session required.
- [ ] **Dashboard load**: Overview tab loads; Platform Overview strip shows 6 numbers; Right Now and other blocks load.
- [ ] **Tab switching**: Sidebar, mobile tabs, and Cmd+K switch tabs; URL `?tab=` updates.
- [ ] **Leagues tab**: Switch to Leagues; change kind (By sport, Largest, Recent, Flagged); table updates; “View league” opens `/app/league/[id]` in new tab.
- [ ] **Moderation tab**: Reported content, reported users, blocked users sections load; links to messages and Users tab work.
- [ ] **System tab**: Database and API table load; Refresh re-fetches health.
- [ ] **Users tab**: List loads; search filters; Reset PW and Delete (with confirm) work.
- [ ] **Overview refresh**: Refresh reloads summary, usage, regions, and platform overview.
- [ ] **No dead buttons**: Every listed button/link has a handler and, where applicable, an existing or new backend endpoint.

---

## 7. Admin system explanation

The admin dashboard is a separate, permission-gated area for platform operators. Access is determined by:

1. **Session**: After login, an `admin_session` cookie is set (signed; see `lib/adminSession.ts`).
2. **Eligibility**: User must have `role === "admin"` or email listed in `ADMIN_EMAILS` (see `lib/adminAuth.ts` and `app/admin/page.tsx`).
3. **API protection**: All new and existing admin API routes use `requireAdmin()` (or equivalent) and return 401 when not authorized.

The dashboard provides:

- **Platform Overview**: High-level KPIs (users, activity, leagues, brackets, drafts, trades) and “Right Now” usage strip.
- **League Overview**: Leagues by sport (all 7), largest, recent, and flagged (sync error), with links to view league in the app.
- **User management**: Full user list, search, password reset, and delete (existing Users tab).
- **Moderation**: Reported content (messages), reported users, and blocked users, with links to messages and Users tab.
- **System**: Database and external API health with refresh.

Sports support (NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer) is consistent with `lib/sport-scope.ts` and Prisma `LeagueSport`; league counts and filters use the same set. The UI is responsive (sidebar + mobile tabs + drawer) and optimized for desktop use.
