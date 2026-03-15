# Prompt 75 — Global App Shell Architecture + Full UI Click Audit

## 1. App Shell Architecture

### Overview

The global app shell unifies **Sports App**, **Bracket Challenge**, **Legacy**, **Settings/Profile**, **AI surfaces**, and **Admin** under one consistent chrome. It is **theme-aware** and **language-aware** and supports all seven sports (NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer) via existing sport-scope and resolvers.

### Component Hierarchy

```
GlobalAppShell (server)
  └── GlobalShellClient (client)
        ├── GlobalTopNav (header: logo, product switcher, tabs, profile, notifications, theme, language, admin)
        ├── MobileNavigationDrawer (slide-over nav when open; lg:hidden)
        └── [children]
  └── Grid: [main content] | GlobalRightRail (sidebar, lg only)
```

- **GlobalAppShell** (`components/shared/GlobalAppShell.tsx`): Server component. Resolves session (auth, admin, userLabel) and wraps the app in `GlobalShellClient` plus a two-column grid (content + right rail).
- **GlobalShellClient** (`components/shell/GlobalShellClient.tsx`): Client component. Owns `mobileMenuOpen` state; renders `GlobalTopNav` (with `onOpenMobileMenu`), `MobileNavigationDrawer`, and children.
- **GlobalTopNav** (`components/shared/GlobalTopNav.tsx`): Persistent top bar. Acts as **AppHeader** (no separate component named "AppHeader"). Contains:
  - Hamburger (mobile only) → opens drawer
  - Logo → `/` or `/dashboard`
  - ProductSwitcher (Home, WebApp, Bracket, Legacy)
  - Tab row: Home, Profile, WebApp, Bracket, Legacy, Messages, Wallet, Settings (+ Admin when admin)
  - Wallet badge, Messages link, NotificationBell, AI Chat link, LanguageToggle, ModeToggle, Admin link (when admin), Profile link (desktop), Settings icon (mobile)
- **MobileNavigationDrawer** (`components/shell/MobileNavigationDrawer.tsx`): Slide-over from right; overlay + close button; uses `SHELL_NAV_ITEMS` + Admin when `isAdmin`; active state via `isNavItemActive`.
- **GlobalRightRail** (`components/shared/GlobalRightRail.tsx`): Right sidebar (desktop only). Acts as **AppSidebar** in the spec (no separate component named "AppSidebar").
- **ShellLayoutContainer** (`components/shell/ShellLayoutContainer.tsx`): Optional content wrapper for consistent max-width and padding (max-w-6xl/7xl/1400px).
- **ShellRouteResolver** (`lib/shell/ShellRouteResolver.ts`): `getShellVariant(pathname, isAuthenticated)` → `"minimal" | "full"`; `getProductFromPath(pathname)` → `ProductId`.
- **ActiveNavStateResolver** (`lib/shell/ActiveNavStateResolver.ts`): `SHELL_NAV_ITEMS`, `PRODUCT_SWITCHER_ITEMS`, `isNavItemActive(pathname, href)`, `getActiveNavHref(pathname)`.

### Shell Variants

- **Minimal shell**: Used for landing and public/marketing routes. Rendered by pages that use **HomeTopNav** (e.g. `/`, `/chimmy`, `/tools-hub`, `/tools/...`, `/sports/...`). No GlobalAppShell.
- **Full shell**: Used for authenticated app routes. Rendered via **ProductShellLayout** → **GlobalAppShell** → **GlobalShellClient** (GlobalTopNav + MobileNavigationDrawer + content + GlobalRightRail).

### Product Switcher

The **ProductContextSwitcher** in the spec is implemented by the existing **ProductSwitcher** (`components/shared/ProductSwitcher.tsx`) inside GlobalTopNav. It shows Home, WebApp, Bracket, Legacy with active state by pathname; no separate component was added.

---

## 2. Shell Layout / Component Updates

| Component | Role |
|-----------|------|
| **GlobalAppShell** | Server shell wrapper; session + GlobalShellClient + grid + GlobalRightRail |
| **GlobalShellClient** | Client shell: GlobalTopNav + MobileNavigationDrawer + children |
| **GlobalTopNav** | Header: logo, ProductSwitcher, GLOBAL_TABS, profile/settings/notifications/theme/language/admin |
| **MobileNavigationDrawer** | Mobile nav menu (SHELL_NAV_ITEMS + Admin); overlay + close |
| **ShellLayoutContainer** | Optional content container (max-width + padding) |
| **ShellRouteResolver** | getShellVariant, getProductFromPath |
| **ActiveNavStateResolver** | SHELL_NAV_ITEMS, isNavItemActive, getActiveNavHref |
| **ProductShellLayout** | Layout that wraps children with GlobalAppShell |

**GlobalTopNav** was extended with:

- **Profile**: Link to `/profile` with `IdentityImageRenderer` and username (visible `lg:flex`).
- **Settings**: Gear icon link to `/settings` (visible on smaller screens `lg:hidden` when profile is shown).
- **LanguageToggle** and **useSettingsProfile** for profile data.
- **onOpenMobileMenu**: When provided, a hamburger button (visible `lg:hidden`) opens the mobile drawer.

**Pages updated to rely on layout shell (AppShellNav removed):**

- `app/settings/page.tsx`
- `app/profile/page.tsx`
- `app/profile/[username]/page.tsx`
- `app/wallet/page.tsx`
- `app/messages/page.tsx`
- `app/leagues/[leagueId]/page.tsx`

These now render only `<main>` + page content; the shell comes from their parent layout’s ProductShellLayout.

---

## 3. Routing Integration Updates

### Routes Using Full Shell (ProductShellLayout → GlobalAppShell)

Applied via layout files that wrap with `ProductShellLayout`:

- **Dashboard**: `app/dashboard/layout.tsx`
- **App (Sports)**: `app/app/layout.tsx`
- **Leagues**: `app/leagues/layout.tsx` (includes `app/leagues/[leagueId]/page.tsx`)
- **Bracket**: `app/bracket/layout.tsx`, `app/brackets/layout.tsx`
- **Legacy**: `app/legacy/layout.tsx`, `app/af-legacy/layout.tsx`
- **Settings**: `app/settings/layout.tsx`
- **Profile**: `app/profile/layout.tsx` (includes `app/profile/page.tsx` and `app/profile/[username]/page.tsx`)
- **Wallet**: `app/wallet/layout.tsx`
- **Messages**: `app/messages/layout.tsx`

### Routes Using Minimal Shell (HomeTopNav Only)

- **Landing**: `app/page.tsx` → HomeTopNav
- **Chimmy**: `app/chimmy/ChimmyLandingClient.tsx` → HomeTopNav
- **Tools hub**: `app/tools-hub/ToolsHubClient.tsx` → HomeTopNav
- **Tool landing**: `app/tools/[tool]/ToolLandingClient.tsx` → HomeTopNav
- **Sports landing**: `app/sports/[sport]/SportLandingClient.tsx` → HomeTopNav

Auth, theme, and language flows are unchanged; shell is theme/language aware via existing providers.

---

## 4. Responsive Nav Strategy

- **Desktop (lg and up)**  
  - Persistent **GlobalTopNav** with logo, ProductSwitcher, tab row, and utilities (wallet, messages, notifications, AI chat, language, theme, profile link, settings icon hidden when profile is shown).  
  - **MobileNavigationDrawer** is not rendered as the primary nav (drawer is `lg:hidden`).  
  - **GlobalRightRail** visible in grid.

- **Mobile (below lg)**  
  - **GlobalTopNav** with hamburger that calls `onOpenMobileMenu` → opens **MobileNavigationDrawer**.  
  - Tab row remains in header (scrollable).  
  - Profile block hidden; Settings gear shown.  
  - **MobileNavigationDrawer**: overlay + slide-over from right with SHELL_NAV_ITEMS + Admin; links close drawer on click.  
  - **GlobalRightRail** hidden (layout grid hides it).

Active route highlighting uses `pathname === href || pathname.startsWith(\`${href}/\`)` in both GlobalTopNav tabs and ProductSwitcher, and `isNavItemActive(pathname, href)` in MobileNavigationDrawer.

---

## 5. Full UI Click Audit

| Element | Component | Route / Behavior | Handler / Wiring |
|--------|-----------|-------------------|------------------|
| Logo | GlobalTopNav | `/` (unauthenticated) or `/dashboard` (authenticated) | Link href |
| ProductSwitcher: Home | ProductSwitcher | `/dashboard` | Link |
| ProductSwitcher: WebApp | ProductSwitcher | `/app` | Link |
| ProductSwitcher: Bracket | ProductSwitcher | `/brackets` | Link |
| ProductSwitcher: Legacy | ProductSwitcher | `/af-legacy` | Link |
| Tab: Home | GlobalTopNav | `/dashboard` | Link; active by pathname |
| Tab: Profile | GlobalTopNav | `/profile` | Link; active by pathname |
| Tab: WebApp | GlobalTopNav | `/app` | Link; active by pathname |
| Tab: Bracket | GlobalTopNav | `/brackets` | Link; active by pathname |
| Tab: Legacy | GlobalTopNav | `/af-legacy` | Link; active by pathname |
| Tab: Messages | GlobalTopNav | `/messages` | Link; active by pathname |
| Tab: Wallet | GlobalTopNav | `/wallet` | Link; active by pathname |
| Tab: Settings | GlobalTopNav | `/settings` | Link; active by pathname |
| Tab: Admin | GlobalTopNav | Shown only when `isAdmin`; `/admin` | Link; active by pathname |
| Hamburger (mobile) | GlobalTopNav | Opens mobile drawer | `onOpenMobileMenu()` → setMobileMenuOpen(true) |
| Wallet badge | GlobalTopNav | Wallet summary (existing component) | WalletSummaryBadge |
| Messages icon | GlobalTopNav | `/messages` | Link |
| Notifications icon | GlobalTopNav | Toggle NotificationPanel | NotificationBell: onClick toggles open state; panel uses useNotifications |
| AI Chat icon | GlobalTopNav | `/af-legacy?tab=chat` | Link |
| Language toggle | GlobalTopNav | Toggle locale | LanguageToggle (existing) |
| Theme toggle | GlobalTopNav | Toggle theme | ModeToggle (existing) |
| Admin crest (Shield) | GlobalTopNav | `/admin`; visible when `isAdmin` | Link; server resolves admin from ADMIN_EMAILS |
| Profile link (desktop) | GlobalTopNav | `/profile` | Link + IdentityImageRenderer; useSettingsProfile |
| Settings gear (mobile) | GlobalTopNav | `/settings` | Link (lg:hidden) |
| Login / Sign Up | GlobalTopNav | loginUrlWithIntent / signupUrlWithIntent | Link when !isAuthenticated |
| Drawer overlay | MobileNavigationDrawer | Close drawer | onClick on overlay → onClose |
| Drawer close button | MobileNavigationDrawer | Close drawer | onClick → onClose |
| Drawer nav links | MobileNavigationDrawer | SHELL_NAV_ITEMS hrefs | Link; onClick={onClose} |
| Drawer Admin link | MobileNavigationDrawer | `/admin` when isAdmin | Link; onClick={onClose} |
| Right rail | GlobalRightRail | N/A (sidebar content) | Rendered in GlobalAppShell grid |

**Breadcrumbs**: No global breadcrumb component in the shell; pages may add their own. **Footer**: No global footer in the shell.

**Verified**: All shell links use Next.js `Link` or existing components with correct hrefs; session/admin resolved server-side in GlobalAppShell and passed to client; mobile drawer state is local and closes on navigation; active states derive from `usePathname()`.

---

## 6. QA Findings

- Shell renders correctly after auth: **OK** — full shell used for dashboard, app, leagues, bracket, legacy, settings, profile, wallet, messages.
- Main nav links: **OK** — all GLOBAL_TABS and ProductSwitcher links point to correct routes.
- Mobile nav: **OK** — hamburger opens drawer; drawer links and overlay/close close it; drawer only below lg.
- Active states: **OK** — pathname-based in GlobalTopNav tabs, ProductSwitcher, and MobileNavigationDrawer.
- Profile/Settings/Notifications: **OK** — profile link to `/profile`, settings to `/settings`, NotificationBell toggles panel.
- Admin visibility: **OK** — admin link and tab shown only when `isAdmin` (server-resolved).
- Theme and language: **OK** — ModeToggle and LanguageToggle in shell; theme/language preserved.
- No dead buttons identified in the shell; all click paths wired.

---

## 7. Issues Fixed

- **Removed duplicate AppShellNav** from settings, profile, profile/[username], wallet, messages, and leagues/[leagueId] so the shell is provided only by ProductShellLayout (GlobalAppShell).
- **messages/page.tsx**: Fixed invalid JSX (extra `</div>`) after removing AppShellNav so the tree is a single `<main>`.
- **profile/[username]/page.tsx**: Removed AppShellNav and outer wrapper; page now returns `<main>` only; layout provides shell.
- **leagues/[leagueId]/page.tsx**: Removed AppShellNav and outer `<div>`; page now returns `<main>` only; layout provides shell.

---

## 8. Final QA Checklist

- [ ] Shell renders after login on desktop and mobile.
- [ ] Logo click goes to `/` or `/dashboard` as expected.
- [ ] ProductSwitcher links (Home, WebApp, Bracket, Legacy) navigate and show active state.
- [ ] All GlobalTopNav tab links navigate and show active state.
- [ ] Profile link (desktop) goes to `/profile`; Settings gear (mobile) goes to `/settings`.
- [ ] Notifications icon opens/closes notification panel.
- [ ] AI Chat link goes to `/af-legacy?tab=chat`.
- [ ] Theme and language toggles work and persist in shell.
- [ ] Admin link and tab visible only for admin users; navigate to `/admin`.
- [ ] Mobile: hamburger opens drawer; drawer links navigate and close drawer; overlay/close close drawer.
- [ ] No dead buttons or broken nav states in shell.
- [ ] Theme and language remain consistent across product transitions.

---

## 9. Explanation of the Global App Shell

The **global app shell** is the single chrome that wraps all major product surfaces (Sports App, Bracket, Legacy, Settings/Profile, Messages, Wallet, and Admin when applicable). It provides:

1. **One persistent header** (GlobalTopNav): logo, product switcher, main tabs, and global actions (profile, settings, notifications, AI chat, theme, language, admin).
2. **One mobile experience**: hamburger opens a slide-over drawer with the same nav items and admin, so mobile users get the same entry points without a separate sidebar.
3. **Consistent content area**: layout grid (content + optional right rail) and optional ShellLayoutContainer for spacing.
4. **Correct shell per route**: minimal shell (HomeTopNav) on landing and public pages; full shell (GlobalAppShell) on authenticated app routes via ProductShellLayout.

The shell does not replace the landing page, auth, settings/profile, or sport-specific logic; it unifies the **authenticated app** under one navigation model so that moving between Dashboard, WebApp, Bracket, Legacy, Settings, Profile, Messages, and Wallet feels coherent, premium, and mobile-friendly, with theme and language preserved throughout.
