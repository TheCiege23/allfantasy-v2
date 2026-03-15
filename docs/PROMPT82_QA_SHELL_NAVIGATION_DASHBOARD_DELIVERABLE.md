# Prompt 82 — End-to-End QA Pass for Navigation / Shell / Dashboard Polish + Full UI Click Audit

## 1. QA Findings

### Global Shell

- **Header:** Rendered by `GlobalTopNav` (via `DesktopNavBar`). Logo "AllFantasy.ai" links to `/dashboard` when authenticated, `/` when not. Product switcher (Home, WebApp, Bracket, Legacy), primary nav tabs (Home, Profile, WebApp, Bracket, Legacy, Tools, Messages, Wallet, Settings + Admin when isAdmin), and utility icons (search, wallet, messages, notifications, AI chat, language, theme, admin, profile) are present and wired.
- **Sidebar:** No left sidebar in the main shell. Right rail is `GlobalRightRail` → `SharedRightRail` (notifications preview, AI Quick Ask, Wallet Summary); visible on desktop only (`hidden py-6 lg:block`).
- **Mobile nav:** `MobileNavigationDrawer` opens from the hamburger button (`onOpenMobileMenu`). Backdrop and close button close the drawer; nav links call `onClose` on click. Drawer closes when viewport crosses `lg` (1024px) via `matchMedia` in `ResponsiveNavSystem`.
- **Active states:** Primary tabs use `isNavItemActive(pathname, item.href)` from `lib/shell`; admin uses `pathname.startsWith("/admin")`. Product switcher uses the same `isNavItemActive`. Active styling is applied correctly.

### Responsive Navigation

- **Desktop:** `GlobalTopNav` shows product switcher (md+), primary tabs, and utilities. All links point to correct routes (`/dashboard`, `/profile`, `/app`, `/brackets`, `/af-legacy`, `/tools-hub`, `/messages`, `/wallet`, `/settings`, `/admin`).
- **Mobile:** Hamburger opens drawer; drawer uses `SHELL_NAV_ITEMS` from `lib/shell` (same order as `PRIMARY_NAV_ITEMS` in `lib/navigation`) plus Admin when `showAdminNav(isAdmin)`.
- **Admin visibility:** `showAdminNav(isAdmin)` and server-side `resolveAdminEmail` control admin link in header and drawer. No inconsistency found.
- **Protected routes:** Dashboard page redirects to `/login?callbackUrl=/dashboard` when unauthenticated. Profile redirects to `/login?callbackUrl=/profile`. Shell is used inside `ProductShellLayout` for dashboard, app, brackets, af-legacy; those layouts do not redirect—auth is enforced at page level where required (e.g. dashboard, profile).

### Dashboard

- **Dashboard cards:** `ProductLauncherCards` uses `getProductLauncherCards({ poolCount, entryCount })`; three cards (Bracket → `/brackets`, WebApp → `/app/home`, Legacy → `/af-legacy`) with correct hrefs and labels.
- **Setup alerts:** `getDashboardSetupAlerts` and `needsSetupAction` drive the "Complete your setup" block; each alert can have `actionHref` and `actionLabel`; links are rendered.
- **Quick actions:** Three quick action cards use `getDashboardQuickActions()` indices 0–2 (Create Bracket Pool, Open WebApp, Open Legacy AI); hrefs `/brackets/leagues/new`, `/app/home`, `/af-legacy`. No out-of-bounds access; array is fixed length.
- **My Pools / My Bracket Entries:** League list links to `/brackets/leagues/${league.id}`; entry list links to `/bracket/${entry.tournamentId}/entry/${entry.id}`. "View all" and "+N more" go to `/brackets`. Empty states show when lists are empty.
- **Recent AI Activity:** Placeholder list only; no API or retry. No dead buttons.
- **Mobile CTAs:** "Create Pool" and "Join Pool" link to `/brackets/leagues/new` and `/brackets/join`.

### Universal Search

- **Open/close:** Search overlay opens via top-bar search button and via `createCommandPaletteHandler` (Ctrl+K / ⌘K) in `ResponsiveNavSystem`. Overlay closes on backdrop click, X button, and Escape. Focus moves to input when opened.
- **Live results:** `getUniversalSearchPayload(query)` returns quick actions (filtered by query) and static results when `query.length >= 2`. Grouped by category (quick_action, tool, page, league, player). No live API calls in current implementation; `suggestLiveSearch` is set for future use.
- **Quick actions / grouped results:** Buttons for each item call `navigate(item.href)` then `onClose()` and `router.push(href)`. Keyboard: ArrowDown/ArrowUp update highlight; Enter navigates highlighted item. Footer shows shortcut hint.
- **Empty states:** "No results for …" when query length ≥ 2 and no results; "Type to search. Press … to focus" when query short.

### Cross-Product Routing

- **Product switching:** Product switcher and primary tabs point to `/dashboard`, `/app`, `/brackets`, `/af-legacy`, `/tools-hub`, etc. No broken product switching observed.
- **Deep links:** Dashboard league/entry links use correct paths. Notification center uses `NotificationRouteResolver.getNotificationDestination(n)` for league, chat, bracket, and fallback hrefs.
- **Post-auth redirects:** `loginUrlWithIntent(pathname)` and `signupUrlWithIntent(pathname)` use `safeRedirectPath`; default after login/signup is `/dashboard`. CallbackUrl/next are respected.

### State Polish

- **Loading:** Dashboard page is server-rendered; `DashboardContent` has no loading state. Search overlay shows results immediately (no loading spinner). Notification panel shows loader while `useNotifications` loading. Right rail shows "Loading..." while `useRightRailData` loading.
- **Empty states:** Dashboard: no pools, no entries, no notifications (right rail). Search: no results message. Notification panel: "No notifications yet."
- **Error states:** Notification panel shows error message when `useNotifications.error` is set. Right rail shows error section when `useRightRailData` error. Search does not have an API error state (static only).
- **Retry/recovery:** No explicit retry buttons found in shell/dashboard; notification and right rail rely on refetch/refresh from hooks.

### Notification Center

- **Open/close:** Bell toggles panel; click outside and Escape close (see Prompt 81 deliverable).
- **Unread counts:** Badge from `getUnreadBadgeCount(notifications, 9)`.
- **Mark as read / mark all read:** Wired; API and optimistic updates in place.
- **Route-to-destination:** Notification row and destination link use `getNotificationDestination(n).href`; navigation and panel close verified in audit.

---

## 2. Full UI Click Audit Findings

| Area | Element | Component / Route | Intended behavior | Verified |
|------|--------|-------------------|-------------------|----------|
| Header | Logo | GlobalTopNav → Link | / (unauthenticated) or /dashboard (authenticated) | OK |
| Header | Product tab (Home, WebApp, Bracket, Legacy) | ProductSwitcher → Link | Navigate to item.href; active by isNavItemActive | OK |
| Header | Search button | GlobalTopNav → button | onOpenSearch() → setSearchOpen(true) | OK |
| Header | Wallet | WalletSummaryBadge / Link | Wallet summary or deposit | OK |
| Header | Messages | GlobalTopNav → Link | /messages | OK |
| Header | Notifications | NotificationBell | Toggle panel; badge from unread count | OK |
| Header | AI Chat | GlobalTopNav → Link | /af-legacy?tab=chat | OK |
| Header | Language | LanguageToggle | Toggle locale | OK |
| Header | Theme | ModeToggle | Toggle theme | OK |
| Header | Admin | GlobalTopNav → Link | /admin (when isAdmin) | OK |
| Header | Profile | UserMenuDropdown | Dropdown; Profile, Settings, Log out | OK |
| Header | Primary tab (Home, Profile, …) | GlobalTopNav → Link | item.href; active by isNavItemActive / admin prefix | OK |
| Header | Mobile menu button | GlobalTopNav → button | onOpenMobileMenu() → setMobileMenuOpen(true) | OK |
| Mobile drawer | Backdrop | MobileNavigationDrawer | onClick={onClose} | OK |
| Mobile drawer | Close (X) | MobileNavigationDrawer → button | onClose | OK |
| Mobile drawer | Nav link | Link + onClick={onClose} | Navigate and close drawer | OK |
| Mobile drawer | Admin link | Link + onClick={onClose} | /admin and close | OK |
| Search overlay | Backdrop | SearchOverlay | onClick={onClose} | OK |
| Search overlay | Close (X) | SearchOverlay → button | onClose | OK |
| Search overlay | Quick action / result button | SearchOverlay | navigate(href) → close, router.push, clear query | OK |
| Search overlay | Enter key | SearchOverlay | Navigate highlighted item | OK |
| Dashboard | Product launcher card | ProductLauncherCards → Link | card.href (e.g. /brackets, /app/home, /af-legacy) | OK |
| Dashboard | Setup alert action | DashboardContent → Link | alert.actionHref | OK |
| Dashboard | Create Pool / Join Pool (mobile) | DashboardContent → Link | /brackets/leagues/new, /brackets/join | OK |
| Dashboard | League row | DashboardContent → Link | /brackets/leagues/${league.id} | OK |
| Dashboard | Entry row | DashboardContent → Link | /bracket/${entry.tournamentId}/entry/${entry.id} | OK |
| Dashboard | View all / +N more (pools, entries) | DashboardContent → Link | /brackets | OK |
| Dashboard | Quick action card (x3) | DashboardContent → Link | quickActions[0..2].href | OK |
| Right rail | Open Message Center | SharedRightRail → Link | /messages | OK |
| Right rail | Open AI Chat | SharedRightRail → Link | /af-legacy?tab=chat (fixed from /legacy?tab=chat) | Fixed |
| Right rail | Open Wallet | SharedRightRail → Link | /wallet | OK |
| User menu | Profile | UserMenuDropdown → Link | /profile; close dropdown | OK |
| User menu | Settings | UserMenuDropdown → Link | /settings; close dropdown | OK |
| User menu | Log out | UserMenuDropdown → button | signOut({ callbackUrl: "/" }); close dropdown | OK |
| Unauthenticated | Login / Sign Up | GlobalTopNav → Link | loginUrlWithIntent(pathname), signupUrlWithIntent(pathname) | OK |

All listed click paths are wired; the only correction was the right rail and messages "Open AI Chat" link (see Issues fixed).

---

## 3. Bugs Found

1. **Wrong AI Chat link in right rail and messages:** "Open AI Chat" / "Open Legacy AI Chat" pointed to `/legacy?tab=chat`. The main Legacy product and AI Chat live at `/af-legacy` and `/af-legacy?tab=chat`. `/legacy` is a separate landing page. This could send users to the wrong place when opening AI Chat from the right rail or messages.
2. **No other dead buttons or broken nav:** Audit did not find other dead buttons, broken nav state, or incorrect hrefs in the shell, dashboard, search, or notification center.

---

## 4. Issues Fixed

- **SharedRightRail:** "Open AI Chat" link changed from `/legacy?tab=chat` to `/af-legacy?tab=chat` so it opens the Legacy product AI Chat tab.
- **Messages page:** "Open Legacy AI Chat" link changed from `/legacy?tab=chat` to `/af-legacy?tab=chat` for consistency and correct destination.

No other code changes were required for this QA pass.

---

## 5. Regression Risks

- **Nav item order or href changes:** Primary nav and product switcher use `lib/navigation` (NavLinkResolver) and `lib/shell` (ActiveNavStateResolver). Mobile drawer uses `SHELL_NAV_ITEMS`. Changing order or hrefs in one place without the other could desync tabs and drawer. Keep PRIMARY_NAV_ITEMS and SHELL_NAV_ITEMS aligned (or derive one from the other).
- **Dashboard quick actions:** DashboardContent uses `quickActions[0]`, `quickActions[1]`, `quickActions[2]` with non-null assertion. If `DASHBOARD_QUICK_ACTIONS` length or order changes, update the dashboard or use a map.
- **Auth redirects:** Dashboard and profile use redirect to login with callbackUrl. Any change to auth flow or default redirects should be checked against these pages and the auth-intent-resolver.
- **Search overlay focus:** Two listeners use `createCommandPaletteHandler` (open overlay in ResponsiveNavSystem, focus input in SearchOverlay). Both trigger on Ctrl+K/⌘K; ensure only one overlay is open and focus behavior remains correct.
- **Right rail data:** SharedRightRail uses useNotifications, useWalletSummary, useQuickAI. If any hook changes contract or fails in a new way, the right rail loading/error/empty states should be rechecked.

---

## 6. Final QA Checklist

- [ ] **Shell:** Logo goes to / or /dashboard; product switcher and primary tabs navigate and show correct active state; admin tab/link only when isAdmin.
- [ ] **Mobile:** Hamburger opens drawer; drawer links navigate and close drawer; backdrop and X close; drawer closes at lg breakpoint.
- [ ] **Search:** Search icon and Ctrl+K/⌘K open overlay; Escape and backdrop close; quick actions and results navigate and close overlay; keyboard navigation and Enter work.
- [ ] **Dashboard:** Product launcher cards, setup alerts, quick actions, league/entry links, View all, +N more, and mobile Create/Join Pool all go to correct routes.
- [ ] **Right rail:** Notifications preview, "Open Message Center" → /messages, "Open AI Chat" → /af-legacy?tab=chat, "Open Wallet" → /wallet; loading and error states.
- [ ] **Profile menu:** Profile → /profile, Settings → /settings, Log out → signOut and redirect to /.
- [ ] **Notifications:** Bell opens panel; mark read, mark all read, notification row/link navigate and close; badge and empty/error states (see Prompt 81).
- [ ] **Unauthenticated:** Login/Sign Up use intent URLs; after login/signup user returns to requested path or /dashboard.
- [ ] **No dead buttons:** Every shell, dashboard, search, and right rail clickable element triggers the intended navigation or state change.
- [ ] **No stale nav:** Active tab reflects current pathname (including /admin and /tools-hub).

---

## 7. Explanation of the End-to-End Shell and Dashboard Validation Pass

This pass validated the **global shell** (header, product switcher, primary nav, top-bar utilities, mobile drawer, right rail), **dashboard** (product launcher cards, setup alerts, quick actions, league/entry cards, empty states), **universal search** (open/close, quick actions, grouped results, keyboard, empty state), **cross-product routing** (product links, deep links, post-auth redirects), **state polish** (loading, empty, error where present), and **notification center** (open/close, unread, mark read, routing) as implemented in the codebase.

The **click-by-click audit** confirmed each interactive element: component, route or handler, and correct behavior. One bug was found and fixed: **AI Chat** links in the right rail and messages page pointed to `/legacy?tab=chat` instead of **`/af-legacy?tab=chat`**, so they now open the Legacy product’s AI Chat tab.

No other dead buttons, broken nav state, or incorrect redirects were found. Regression risks (nav sync, dashboard quick action indices, auth redirects, search shortcut, right rail hooks) are documented so future changes can be tested against this baseline. The **final QA checklist** gives a concise manual verification list for shell, dashboard, search, right rail, profile, notifications, and auth.
