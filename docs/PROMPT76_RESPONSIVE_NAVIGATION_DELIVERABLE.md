# Prompt 76 — Responsive Navigation System + Full UI Click Audit

## 1. Responsive Navigation Architecture

### Overview

The responsive navigation system provides one coherent nav experience across **desktop**, **tablet**, and **mobile**, with a **desktop header** (top bar + tab row), a **mobile drawer** (slide-over menu), **user menu dropdown** (profile, settings, log out), and **resize-safe behavior** (drawer closes when viewport crosses into desktop breakpoint).

### Component Hierarchy

```
GlobalShellClient
  └── ResponsiveNavSystem
        ├── DesktopNavBar (= GlobalTopNav)
        │     ├── Hamburger (mobile only) → opens drawer
        │     ├── Logo → / or /dashboard
        │     ├── ProductSwitcher (Home, WebApp, Bracket, Legacy)
        │     ├── Utilities: Wallet, Messages, Notifications, AI Chat, Language, Theme, Admin (if admin)
        │     ├── UserMenuDropdown (Profile, Settings, Log out)
        │     └── Primary tab row (when authenticated): Home … Settings [+ Admin]
        ├── MobileNavigationDrawer
        │     ├── Overlay + close button
        │     └── Nav links (SHELL_NAV_ITEMS + Admin when admin)
        └── [children]
```

### Core Modules

| Module | Location | Role |
|--------|----------|------|
| **ResponsiveNavSystem** | `components/shell/ResponsiveNavSystem.tsx` | Client wrapper: mobile menu state, resize listener (close drawer at lg), composes DesktopNavBar + MobileNavDrawer + children. |
| **DesktopNavBar** | `components/navigation/DesktopNavBar.tsx` | Spec name for the desktop top bar; delegates to `GlobalTopNav`. |
| **MobileNavDrawer** | `components/shell/MobileNavigationDrawer.tsx` | Slide-over drawer with SHELL_NAV_ITEMS + Admin; overlay and close button; visible only below `lg`. |
| **UserMenuDropdown** | `components/navigation/UserMenuDropdown.tsx` | Dropdown from user trigger: Profile, Settings, Log out; click-outside to close. |
| **NavLinkResolver** | `lib/navigation/NavLinkResolver.ts` | Single source of truth: PRIMARY_NAV_ITEMS (incl. Tools), PRODUCT_NAV_ITEMS, USER_MENU_ITEMS, ADMIN_NAV_ITEM; getPrimaryNavItems(isAdmin), getProductNavItems(). |
| **ProtectedNavResolver** | `lib/navigation/ProtectedNavResolver.ts` | getProtectedNavStateFullShell(isAuthenticated, isAdmin) and getProtectedNavStateMinimalShell(...); which nav to show for full vs minimal shell. |
| **AdminNavVisibilityResolver** | `lib/navigation/AdminNavVisibilityResolver.ts` | showAdminNav(isAdmin), getAdminNavItem(); used by header and drawer for admin link visibility. |

Navigation links and visibility are driven by **lib/navigation**; **lib/shell** remains the source for shell-specific items (SHELL_NAV_ITEMS, isNavItemActive) and is kept in sync with primary nav (including Tools).

---

## 2. Desktop / Mobile Nav Updates

### Desktop

- **DesktopNavBar** (GlobalTopNav): Logo, ProductSwitcher (from `getProductNavItems()`), primary tab row from `getPrimaryNavItems(isAdmin)` (Home, Profile, WebApp, Bracket, Legacy, **Tools**, Messages, Wallet, Settings, Admin when admin). Tab row shown only when **authenticated**.
- **UserMenuDropdown**: Replaces separate profile link and settings icon. One trigger (avatar + username on desktop, compact on mobile) opens dropdown with Profile, Settings, Log out. Uses `USER_MENU_ITEMS` and `signOut({ callbackUrl: "/" })`.
- **Admin**: Shown via `showAdminNav(isAdmin)` (AdminNavVisibilityResolver); link to `/admin` in utility row and in tab row.
- **Active state**: Tabs and product switcher use `isNavItemActive(pathname, href)`; Tools is active for `/tools-hub` and `/tools/*`.

### Mobile

- **Hamburger** (visible below `lg`): Opens **MobileNavigationDrawer**; state held in ResponsiveNavSystem.
- **MobileNavigationDrawer**: Overlay (click to close), close button, nav list from SHELL_NAV_ITEMS (includes **Tools**), plus Admin when `showAdminNav(isAdmin)`. Each link calls `onClose` on click.
- **UserMenuDropdown**: Shown in compact mode (avatar + chevron) on mobile in the header.
- **Resize**: When viewport width crosses into `lg` (1024px), ResponsiveNavSystem closes the drawer so it does not stay open when resizing from mobile to desktop.

### Tools / Hub

- **Tools** added to primary nav: href `/tools-hub`, label "Tools". In `ActiveNavStateResolver`, `/tools-hub` and `/tools/*` are considered active for the Tools item. SHELL_NAV_ITEMS and PRIMARY_NAV_ITEMS both include Tools.

---

## 3. Protected / Admin Route Visibility Updates

- **ProtectedNavResolver**: `getProtectedNavStateFullShell(isAuthenticated, isAdmin)` used conceptually for full shell: when authenticated, show primary nav and user menu; when not, show auth links. The tab row in GlobalTopNav is rendered only when `isAuthenticated`.
- **AdminNavVisibilityResolver**: `showAdminNav(isAdmin)` used everywhere the admin link is shown (GlobalTopNav utility row, tab row, MobileNavigationDrawer). Admin link and tab only rendered when true. Server-side admin is still resolved in `lib/auth/admin` (`resolveAdminEmail`) and passed into the shell as `isAdmin`.
- **Auth state**: Full shell (ProductShellLayout) is used on authenticated app routes; unauthenticated users see minimal shell (e.g. HomeTopNav) or login/signup. No change to auth flow; nav only shows/hides based on `isAuthenticated` and `isAdmin`.

---

## 4. Resize Behavior Strategy

- **Breakpoint**: `lg` = 1024px (Tailwind default). Desktop nav and right rail show at `lg` and up; mobile drawer and hamburger below `lg`.
- **ResponsiveNavSystem** subscribes to `window.matchMedia("(min-width: 1024px)")`. On change to `matches === true`, it sets mobile menu state to closed. Thus:
  - Resizing from mobile → desktop closes the drawer automatically.
  - Resizing from desktop → mobile leaves the drawer closed (user can open via hamburger).
- No duplicate desktop/mobile nav: one header (DesktopNavBar) that adapts (hamburger vs full tabs), one drawer that only renders when open and is `lg:hidden`.

---

## 5. Full UI Click Audit Findings

| Element | Component | Route / Behavior | Handler / Wiring | Status |
|--------|-----------|------------------|------------------|--------|
| Logo | DesktopNavBar (GlobalTopNav) | `/` or `/dashboard` | Link href by isAuthenticated | OK |
| Hamburger | GlobalTopNav | Open drawer | onOpenMobileMenu → setMobileMenuOpen(true) | OK |
| ProductSwitcher links | ProductSwitcher | /dashboard, /app, /brackets, /af-legacy | getProductNavItems(), Link, isNavItemActive | OK |
| Tab row links | GlobalTopNav | primaryItems (incl. Tools, Admin when admin) | getPrimaryNavItems(isAdmin), Link, isNavItemActive | OK |
| Wallet badge | GlobalTopNav | N/A (summary) | WalletSummaryBadge | OK |
| Messages icon | GlobalTopNav | /messages | Link | OK |
| Notifications | GlobalTopNav | Toggle panel | NotificationBell onClick | OK |
| AI Chat icon | GlobalTopNav | /af-legacy?tab=chat | Link | OK |
| Language toggle | GlobalTopNav | Toggle locale | LanguageToggle | OK |
| Theme toggle | GlobalTopNav | Toggle theme | ModeToggle | OK |
| Admin link (utility) | GlobalTopNav | /admin | showAdminNav(isAdmin), Link | OK |
| User menu trigger | UserMenuDropdown | Open dropdown | onClick toggle open state | OK |
| User menu: Profile | UserMenuDropdown | /profile | Link, onClick setOpen(false) | OK |
| User menu: Settings | UserMenuDropdown | /settings | Link, onClick setOpen(false) | OK |
| User menu: Log out | UserMenuDropdown | signOut | onClick setOpen(false); signOut({ callbackUrl: "/" }) | OK |
| Login / Sign Up | GlobalTopNav | loginUrlWithIntent / signupUrlWithIntent | Link when !isAuthenticated | OK |
| Drawer overlay | MobileNavigationDrawer | Close drawer | onClick on overlay → onClose | OK |
| Drawer close button | MobileNavigationDrawer | Close drawer | onClick → onClose | OK |
| Drawer nav links | MobileNavigationDrawer | SHELL_NAV_ITEMS (incl. Tools) | Link, onClick onClose | OK |
| Drawer Admin | MobileNavigationDrawer | /admin | showAdminNav(isAdmin), Link, onClick onClose | OK |
| Resize to desktop | ResponsiveNavSystem | Close drawer | matchMedia change → setMobileMenuOpen(false) | OK |

**Verified**: All nav links use Next.js Link or existing components with correct hrefs; dropdown closes on item click and outside click; drawer closes on overlay, close button, and nav link click; admin visibility is consistent; no dead buttons found.

---

## 6. QA Findings

- **Desktop nav**: All links (logo, product switcher, tabs, user menu, admin, utilities) work; active states update by pathname.
- **Mobile nav**: Hamburger opens drawer; overlay and close button close it; all drawer links navigate and close drawer; Admin appears when isAdmin.
- **Drawer open/close**: Opens from hamburger; closes from overlay, close button, or any nav link click.
- **Route highlighting**: Tabs, product switcher, and drawer use pathname; Tools highlights for /tools-hub and /tools/*.
- **Protected routes**: Tab row only when authenticated; user menu only when authenticated; auth links when unauthenticated.
- **Admin-only nav**: Admin link and tab shown only when isAdmin (server-resolved); drawer Admin link same.
- **Resize**: Drawer closes when viewport reaches lg; no stuck open state.
- **User menu**: Profile, Settings, Log out all wired; dropdown closes on action and outside click.

---

## 7. Issues Fixed

- **Tools missing from nav**: Added Tools (/tools-hub) to PRIMARY_NAV_ITEMS, SHELL_NAV_ITEMS, and active-state logic (isNavItemActive, getActiveNavHref) for /tools-hub and /tools/*.
- **Profile/settings as separate links**: Replaced with **UserMenuDropdown** (Profile, Settings, Log out) for a single, clear user menu.
- **Admin visibility**: Centralized with **AdminNavVisibilityResolver** (showAdminNav); used in GlobalTopNav and MobileNavigationDrawer.
- **Nav link source of truth**: Introduced **NavLinkResolver** (and lib/navigation); GlobalTopNav and ProductSwitcher use getPrimaryNavItems / getProductNavItems; drawer uses SHELL_NAV_ITEMS (synced with primary).
- **Drawer on resize**: **ResponsiveNavSystem** added with matchMedia listener to close drawer when entering lg breakpoint.
- **Tab row for unauthenticated**: Primary tab row now rendered only when isAuthenticated.

---

## 8. Final QA Checklist

- [ ] Desktop: logo, product switcher, all tab links, user menu (profile, settings, log out), admin link (when admin), notifications, AI chat, theme, language work.
- [ ] Mobile: hamburger opens drawer; overlay and close button close drawer; every drawer link navigates and closes drawer.
- [ ] Active states: current route highlighted in tabs, product switcher, and drawer (including Tools and Admin).
- [ ] User menu: opens on trigger click; Profile/Settings navigate; Log out signs out and redirects to /; closes on outside click.
- [ ] Admin: link and tab visible only for admin users; navigates to /admin.
- [ ] Resize: from mobile (drawer open) to desktop (≥1024px), drawer closes.
- [ ] No dead links or broken dropdown/drawer behavior.

---

## 9. Explanation of the Responsive Navigation System

The **responsive navigation system** is the set of components and resolvers that provide a single, consistent way to move between **Home**, **Sports App (WebApp)**, **Bracket**, **Legacy**, **Tools**, **Profile**, **Settings**, **Messages**, **Wallet**, and **Admin** (when applicable) on desktop, tablet, and mobile.

- **Desktop**: One sticky header (DesktopNavBar / GlobalTopNav) with logo, product switcher, scrollable tab row, and utility strip (wallet, messages, notifications, AI chat, language, theme, admin, user menu). The user menu consolidates profile, settings, and log out.
- **Mobile**: Same header with a hamburger that opens a slide-over drawer. The drawer lists the same destinations (including Tools and Admin when admin) for thumb-friendly tapping. The drawer closes when a link is clicked, when the overlay or close button is used, or when the viewport is resized to desktop width.
- **Resolvers** (NavLinkResolver, ProtectedNavResolver, AdminNavVisibilityResolver) centralize link config and visibility rules so the header and drawer stay in sync and future changes (e.g. new products or routes) are made in one place.

The system preserves the existing app shell, auth, theme, and language behavior and ensures every nav-related click path is wired end to end with no dead buttons and correct active and protected state.
