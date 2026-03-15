# Prompt 77 — Unified Dashboard Architecture + Full UI Click Audit

## 1. Dashboard Architecture

### Overview

The unified dashboard gives users a single post-login overview of activity across **Sports App (WebApp)**, **Bracket Challenge**, and **Legacy**, with **welcome/profile summary**, **active leagues by sport**, **bracket pools and entries**, **quick actions**, **AI activity**, and **setup alerts**. It is **sport-aware** (NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer) and **theme/language** compatible.

### Component and Data Flow

```
DashboardPage (server)
  ├── Fetches: user, profile, bracket leagues, bracket entries
  ├── DashboardContent (client)
  │     ├── Welcome block (profile link)
  │     ├── ProductLauncherCards (from DashboardCardResolver)
  │     ├── Setup alerts (from DashboardAlertResolver)
  │     ├── Mobile: Create Pool / Join Pool
  │     ├── RecentAIActivity
  │     ├── Grid: ActiveLeaguesSection (client fetch /api/league/list) | My Pools (bracket leagues)
  │     ├── My Bracket Entries (full width)
  │     └── Quick Actions (from DashboardQuickActionResolver)
  ├── RosterLegacyReport (client, /api/roster/legacy-report)
  └── SyncedRosters (client, /api/league/list, expand/collapse)
```

### Core Modules

| Module | Location | Role |
|--------|----------|------|
| **UnifiedDashboardService** | `lib/dashboard/UnifiedDashboardService.ts` | Builds full dashboard payload: sections, product cards, quick actions, setup alerts, league counts, app leagues by sport, needsSetup. |
| **DashboardCardResolver** | `lib/dashboard/DashboardCardResolver.ts` | PRODUCT_LAUNCHER_CARDS (bracket, webapp, legacy), getProductLauncherCards(opts). |
| **DashboardLayoutEngine** | `lib/dashboard/DashboardLayoutEngine.ts` | getDashboardSections(input): section order and visibility, viewAllHref for active_leagues (/leagues) and bracket_entries (/brackets). |
| **DashboardQuickActionResolver** | `lib/dashboard/DashboardQuickActionResolver.ts` | DASHBOARD_QUICK_ACTIONS, getDashboardQuickActions(): Create Bracket Pool, Open WebApp, Open Legacy AI. |
| **DashboardLeagueSummaryService** | `lib/dashboard/DashboardLeagueSummaryService.ts` | getAppLeaguesBySport(leagues), getLeagueSummaryCounts(input): groups app leagues by sport, returns total counts. |
| **DashboardAlertResolver** | `lib/dashboard/DashboardAlertResolver.ts` | getDashboardSetupAlerts(input), needsSetupAction(input): verify email, age confirm, profile complete. |
| **SportDashboardResolver** | `lib/dashboard/SportDashboardResolver.ts` | getDashboardSportOrder(), getSportSectionLabel/Emoji/Info: sport labels and emoji for section headers (all 7 sports). |

Dashboard data is resolved via **lib/dashboard**; UI uses these resolvers so links and copy stay in one place.

---

## 2. Dashboard Section / Component Updates

### Sections (in order)

1. **Welcome** — Greeting, @username, Sleeper (if set), Profile link.
2. **Product launchers** — Three cards (Bracket, WebApp, Legacy) from `getProductLauncherCards({ poolCount, entryCount })`; each card links to `/brackets`, `/app/home`, `/af-legacy`.
3. **Alerts** — Shown when `needsSetupAction()`; content from `getDashboardSetupAlerts()`; links to `/verify`, `/onboarding`.
4. **Verified ready** — When !needsAction, single line: “Your account is verified and ready…”
5. **Mobile quick** — Create Pool → `/brackets/leagues/new`, Join Pool → `/brackets/join` (sm:hidden).
6. **Recent AI Activity** — Existing widget (placeholder items).
7. **Active Leagues** — New `ActiveLeaguesSection`: client fetch `/api/league/list`, `groupLeaguesBySport()` from lib/dashboard; section headers by sport (emoji + label); league cards link to `/leagues/[id]`; “View all” → `/leagues`.
8. **My Pools** — Bracket leagues; “View all” → `/brackets`; each pool → `/brackets/leagues/[id]`; show up to 5, then “+N more” → `/brackets`.
9. **My Bracket Entries** — Bracket entries; “View all” → `/brackets`; each entry → `/bracket/[tournamentId]/entry/[id]`; show up to 5, then “+N more”.
10. **Quick Actions** — Three buttons from `getDashboardQuickActions()`: Create Bracket Pool, Open WebApp, Open Legacy AI (same hrefs as product cards).
11. **Roster Legacy Report** — Existing; POST `/api/roster/legacy-report`.
12. **Synced Rosters** — Existing; GET `/api/league/list`, expand/collapse per league.

### Component changes

- **ProductLauncherCards** — Now uses `getProductLauncherCards()` from lib/dashboard; single list of cards with hrefs/descriptions; Bracket card shows entryCount/poolCount.
- **DashboardContent** — Uses `getDashboardSetupAlerts()`, `needsSetupAction()`, `getDashboardQuickActions()`; adds `ActiveLeaguesSection`; adds “View all” and “+N more” for My Pools and My Bracket Entries; quick action hrefs from resolver.

---

## 3. Backend Data Resolver Updates

- **Server (dashboard page)** — Unchanged: user, profile, bracket leagues, bracket entries from Prisma; passed as props to DashboardContent.
- **Client**
  - **ActiveLeaguesSection** — GET `/api/league/list` (existing proxy to league list); response leagues passed to `groupLeaguesBySport()` (DashboardSportGroupingService) for display order (NFL, NHL, MLB, NBA, NCAAF, NCAAB, SOCCER).
  - **SyncedRosters** — Unchanged: GET `/api/league/list`, expand/collapse.
  - **RosterLegacyReport** — Unchanged: POST `/api/roster/legacy-report`.

No new API routes; dashboard lib consumes existing APIs and server data.

---

## 4. Quick-Action Integration Points

- **Create Bracket Pool** — href `/brackets/leagues/new` (DashboardQuickActionResolver + product launcher Bracket card + mobile “Create Pool”).
- **Open WebApp** — href `/app/home` (DashboardQuickActionResolver + product launcher WebApp card + quick action button).
- **Open Legacy AI** — href `/af-legacy` (DashboardQuickActionResolver + product launcher Legacy card + quick action button).
- **Join Pool** — href `/brackets/join` (mobile only; not in resolver; can be added to DashboardQuickActionResolver later if desired).

All quick actions and product launcher links are defined in lib/dashboard and used by DashboardContent and ProductLauncherCards.

---

## 5. Full UI Click Audit Findings

| Element | Component | Route / Behavior | Handler / API | Status |
|--------|-----------|------------------|---------------|--------|
| Profile (@username) | DashboardContent | /profile | Link | OK |
| Profile (link) | DashboardContent | /profile | Link | OK |
| Bracket card | ProductLauncherCards | /brackets | Link, getProductLauncherCards | OK |
| WebApp card | ProductLauncherCards | /app/home | Link | OK |
| Legacy card | ProductLauncherCards | /af-legacy | Link | OK |
| Alert: Verify | DashboardContent | /verify | Link from getDashboardSetupAlerts | OK |
| Alert: Complete (age/profile) | DashboardContent | /onboarding | Link | OK |
| Create Pool (mobile) | DashboardContent | /brackets/leagues/new | Link | OK |
| Join Pool (mobile) | DashboardContent | /brackets/join | Link | OK |
| Active Leagues: View all | ActiveLeaguesSection | /leagues | Link | OK |
| Active Leagues: league row | ActiveLeaguesSection | /leagues/[id] | Link | OK |
| Active Leagues: +N more | ActiveLeaguesSection | /leagues | Link | OK |
| Active Leagues: Open WebApp (empty) | ActiveLeaguesSection | /app/home | Link | OK |
| My Pools: View all | DashboardContent | /brackets | Link | OK |
| My Pools: pool row | DashboardContent | /brackets/leagues/[id] | Link | OK |
| My Pools: +N more | DashboardContent | /brackets | Link | OK |
| My Bracket Entries: View all | DashboardContent | /brackets | Link | OK |
| My Bracket Entries: entry row | DashboardContent | /bracket/[tournamentId]/entry/[id] | Link | OK |
| My Bracket Entries: +N more | DashboardContent | /brackets | Link | OK |
| Quick Action: Create Bracket Pool | DashboardContent | /brackets/leagues/new | Link, getDashboardQuickActions | OK |
| Quick Action: Open WebApp | DashboardContent | /app/home | Link | OK |
| Quick Action: Open Legacy | DashboardContent | /af-legacy | Link | OK |
| SyncedRosters: expand/collapse | SyncedRosters | Toggle state | setExpandedLeague | OK |
| SyncedRosters: league list | — | /api/league/list | GET on mount | OK |
| RosterLegacyReport | RosterLegacyReport | — | POST /api/roster/legacy-report on mount | OK |

No dead cards or broken links identified; all dashboard click paths wired.

---

## 6. QA Findings

- **Dashboard load** — Loads after login with server data (user, profile, bracket leagues/entries) and client sections (Active Leagues, SyncedRosters, RosterLegacyReport).
- **Cards** — Product launcher and quick action cards route to /brackets, /app/home, /af-legacy and /brackets/leagues/new as intended.
- **Filters** — No sport filter on dashboard; Active Leagues grouped by sport via groupLeaguesBySport (display order correct).
- **Active league sections** — ActiveLeaguesSection shows app leagues grouped by sport; league rows link to /leagues/[id]; “View all” to /leagues.
- **Bracket summary** — My Pools and My Bracket Entries show server data; “View all” and “+N more” go to /brackets; entry links use tournamentId and entry id.
- **Quick actions** — All three actions use hrefs from getDashboardQuickActions(); behavior matches product launchers.
- **AI widgets** — RecentAIActivity present (placeholder); no new AI flows; AI entry points (e.g. Legacy) linked from cards.
- **Mobile** — Layout responsive; mobile quick buttons (Create Pool, Join Pool) visible on small screens; stacked cards and grid remain usable.
- **Theme/language** — Dashboard uses mode-readable and existing theme; no new theme/language logic; compatible with app preferences.

---

## 7. Issues Fixed

- **No single source for dashboard links** — Introduced DashboardCardResolver and DashboardQuickActionResolver; product launcher and quick action hrefs/descriptions come from lib/dashboard.
- **Setup alerts duplicated in UI** — Replaced inline conditions with getDashboardSetupAlerts() and needsSetupAction(); alert content and links centralized in DashboardAlertResolver.
- **Active leagues not on dashboard** — Added ActiveLeaguesSection: fetches /api/league/list, groups by sport with groupLeaguesBySport (all 7 sports), links to /leagues/[id] and “View all” to /leagues.
- **Missing “View all” for pools/entries** — Added “View all” for My Pools and My Bracket Entries (→ /brackets) and “+N more” when list length > 5.
- **Sport order/labels for dashboard** — SportDashboardResolver and existing DashboardSportGroupingService use SportSelectorUIService (NFL, NHL, MLB, NBA, NCAAF, NCAAB, SOCCER) for section headers and grouping.

---

## 8. Final QA Checklist

- [ ] Dashboard loads after login; welcome line and profile links correct.
- [ ] Bracket, WebApp, Legacy product launcher cards navigate to /brackets, /app/home, /af-legacy.
- [ ] Setup alerts show when needed; Verify and Complete links go to /verify and /onboarding.
- [ ] Mobile: Create Pool and Join Pool go to /brackets/leagues/new and /brackets/join.
- [ ] Active Leagues loads from /api/league/list; groups by sport; league rows go to /leagues/[id]; “View all” to /leagues.
- [ ] My Pools: rows to /brackets/leagues/[id]; “View all” and “+N more” to /brackets.
- [ ] My Bracket Entries: rows to /bracket/[tournamentId]/entry/[id]; “View all” and “+N more” to /brackets.
- [ ] Quick actions: Create Bracket Pool, Open WebApp, Open Legacy AI route correctly.
- [ ] SyncedRosters: expand/collapse works; data from /api/league/list.
- [ ] RosterLegacyReport loads from /api/roster/legacy-report.
- [ ] Mobile layout readable; no dead buttons.

---

## 9. Explanation of the Unified Dashboard System

The **unified dashboard** is the main post-login surface that summarizes activity across **Bracket**, **WebApp (sports leagues)**, and **Legacy** in one place.

- **Welcome and profile** — Greeting and profile links so identity and progress are clear.
- **Product launchers** — Three cards (Bracket, WebApp, Legacy) with consistent hrefs and descriptions from **DashboardCardResolver**, so the user can jump into any product.
- **Setup alerts** — **DashboardAlertResolver** drives verify/onboarding alerts and links; when complete, a short “verified and ready” line is shown.
- **Active leagues** — **ActiveLeaguesSection** loads app leagues from `/api/league/list` and groups them by sport using **DashboardLeagueSummaryService** / **DashboardSportGroupingService** (NFL, NHL, NBA, MLB, NCAA Football, NCAA Basketball, Soccer). Each league links to `/leagues/[id]`; “View all” goes to `/leagues`.
- **Bracket context** — My Pools and My Bracket Entries use server-provided data; “View all” and “+N more” link to `/brackets`; entry links use the correct tournament and entry ids.
- **Quick actions** — **DashboardQuickActionResolver** supplies the same primary actions (Create Bracket Pool, Open WebApp, Open Legacy) so they stay in sync with the product launchers.
- **Layout and extension** — **DashboardLayoutEngine** defines section order and viewAllHref; **UnifiedDashboardService** builds a single payload for sections, cards, alerts, and league data. New sections or links can be added in lib/dashboard and reused across the dashboard UI.

The dashboard preserves existing dashboard, sports app, bracket, and legacy behavior; supports all seven sports for league grouping; and keeps a single source of truth for links and alerts so every dashboard-related click path works end to end.
