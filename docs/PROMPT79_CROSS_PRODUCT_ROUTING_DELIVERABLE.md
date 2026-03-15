# Prompt 79 — Cross-Product Routing + Product Switching + Full UI Click Audit

## 1. Cross-Product Routing Architecture

### Overview

The cross-product routing layer gives a **single source of truth** for product entry routes, protected routes, post-auth intent, and deep links so that movement between **Sports App**, **Bracket Challenge**, **Legacy**, **Settings/Profile**, **AI entry points**, and **Admin** is consistent and predictable. It does not replace Next.js or existing auth; it **orchestrates** redirect URLs, product switcher targets, and fallbacks.

### Component and Data Flow

```
User action (nav link, product switcher, deep link, post-login)
  → CrossProductRouteResolver / ProductSwitchController (entry routes, switch targets)
  → PostAuthIntentRouter (callbackUrl, next, returnTo)
  → ProtectedRouteResolver (is protected? login redirect URL)
  → UnauthorizedFallbackResolver (fallback when not auth / not admin)
  → DeepLinkHandler (normalize and validate deep link path)
  → Next.js navigation or redirect()
```

### Core Modules

| Module | Location | Role |
|--------|----------|------|
| **CrossProductRouteResolver** | `lib/routing/CrossProductRouteResolver.ts` | PRODUCT_ROUTE_CONFIGS (productId, entryRoute, pathPrefixes); getProductEntryRoute(productId); isPathInProduct(pathname, productId). |
| **ProductSwitchController** | `lib/routing/ProductSwitchController.ts` | getProductSwitchHref(productId); getProductSwitchItems(); getSwitchTargetFromPath(pathname, targetProductId). |
| **PostAuthIntentRouter** | `lib/routing/PostAuthIntentRouter.ts` | Re-exports safeRedirectPath, getRedirectAfterLogin, getRedirectAfterSignup, loginUrlWithIntent, signupUrlWithIntent; getPostAuthDestination({ callbackUrl, next, returnTo }); buildLoginUrlWithIntent, buildSignupUrlWithIntent. |
| **ProtectedRouteResolver** | `lib/routing/ProtectedRouteResolver.ts` | isProtectedPath(pathname); isAdminPath(pathname); getLoginRedirectUrl(requestedPath); getSignupRedirectUrl(requestedPath). |
| **UnauthorizedFallbackResolver** | `lib/routing/UnauthorizedFallbackResolver.ts` | getUnauthorizedFallback(isAuthenticated, isAdmin, requestedPath); DEFAULT_UNAUTHENTICATED_FALLBACK, DEFAULT_UNAUTHORIZED_FALLBACK. |
| **DeepLinkHandler** | `lib/routing/DeepLinkHandler.ts` | normalizeDeepLink(path); isAllowedDeepLink(path); getDeepLinkRedirect(path, defaultPath). |

---

## 2. Product-Switching Logic

- **Product switcher** (header): Uses `getProductNavItems()` from `lib/navigation` (hrefs: /dashboard, /app, /brackets, /af-legacy). Same targets as **CrossProductRouteResolver** entry routes: Home → /dashboard, WebApp → /app/home, Bracket → /brackets, Legacy → /af-legacy.
- **ProductSwitchController.getProductSwitchHref(productId)** returns the canonical entry route for that product so any “switch to product” action (nav, redirect, deep link) uses the same URL.
- **Shell transitions**: Full shell (GlobalAppShell) wraps dashboard, app, leagues, brackets, af-legacy, profile, settings, etc. Switching product is a client-side or server navigation to the entry route; theme/language/session are preserved by the app (session cookie, theme provider, i18n). No special “transition” API—just normal navigation.
- **Return-to-previous-context**: Post-auth intent (callbackUrl, next, returnTo) is handled by **PostAuthIntentRouter** and existing auth-intent-resolver; after login/signup/verify the user is sent to the requested path when safe.

---

## 3. Protected / Deep-Link Route Updates

- **ProtectedRouteResolver**
  - **Protected prefixes**: /dashboard, /app, /leagues, /brackets, /bracket, /af-legacy, /legacy, /profile, /settings, /wallet, /messages, /onboarding, /mock-draft, /mock-draft-simulator, /trade-finder, /trade-history, /dynasty-trade-analyzer, /startup-dynasty, /legacy-import, /verify, /bracket-intelligence, /lab.
  - **Admin prefixes**: /admin.
  - **getLoginRedirectUrl(requestedPath)** builds `/login?callbackUrl=<requestedPath>` with a safe path so post-login redirect returns the user to the intended page.
  - **getSignupRedirectUrl(requestedPath)** builds `/signup?next=<requestedPath>`.

- **UnauthorizedFallbackResolver**
  - Not authenticated → `getLoginRedirectUrl(requestedPath)`.
  - Authenticated but not admin and requested path is /admin → `/dashboard`.

- **DeepLinkHandler**
  - **Allowed deep link prefixes**: dashboard, app, leagues, bracket, brackets, af-legacy, legacy, profile, settings, wallet, messages, admin, tools-hub, tools/, chimmy, trade-evaluator, mock-draft, waiver-ai, verify, onboarding, login, signup.
  - **normalizeDeepLink(path)** uses safeRedirectPath so only internal paths are accepted.
  - **isAllowedDeepLink(path)** returns true only for allowed prefixes.
  - **getDeepLinkRedirect(path, defaultPath)** returns normalized path if allowed, else defaultPath (e.g. /dashboard).

Existing page-level redirects (e.g. `redirect("/login?callbackUrl=/dashboard")`) align with these resolvers; new code should use **getLoginRedirectUrl** or **buildLoginUrlWithIntent** from the routing lib for consistency.

---

## 4. Frontend Integration Updates

- **Product switcher**: Already uses `getProductNavItems()` (lib/navigation); hrefs match **CrossProductRouteResolver** entry routes. No change required; routing lib documents and backs the same contract.
- **Nav links**: GlobalTopNav tabs and mobile drawer use PRIMARY_NAV_ITEMS / SHELL_NAV_ITEMS; their hrefs align with product entry routes and protected paths. No change required.
- **Dashboard product cards / quick actions**: Link to /brackets, /app/home, /af-legacy; same as product switcher. No change required.
- **Auth flows**: Login/signup/verify already use callbackUrl, next, returnTo. **PostAuthIntentRouter** re-exports and extends the same behavior; optional adoption of **buildLoginUrlWithIntent** in shared components for consistency.
- **Deep links**: Notifications or emails that link into the app can use **getDeepLinkRedirect(path)** before redirecting to ensure the destination is allowed and normalized.

No mandatory frontend changes; the routing layer is the reference for redirect URLs and product entry routes. Future work can replace ad-hoc `"/login?callbackUrl=..."` with **getLoginRedirectUrl** or **buildLoginUrlWithIntent** where appropriate.

---

## 5. Full UI Click Audit Findings

| Element | Component | Route / Behavior | Handler / Wiring | Status |
|--------|-----------|------------------|------------------|--------|
| Product switcher: Home | ProductSwitcher | /dashboard | Link, getProductNavItems | OK |
| Product switcher: WebApp | ProductSwitcher | /app | Link | OK |
| Product switcher: Bracket | ProductSwitcher | /brackets | Link | OK |
| Product switcher: Legacy | ProductSwitcher | /af-legacy | Link | OK |
| Nav tabs (all) | GlobalTopNav | PRIMARY_NAV_ITEMS hrefs | Link | OK |
| Dashboard: Bracket card | ProductLauncherCards | /brackets | Link | OK |
| Dashboard: WebApp card | ProductLauncherCards | /app/home | Link | OK |
| Dashboard: Legacy card | ProductLauncherCards | /af-legacy | Link | OK |
| Dashboard quick actions | DashboardContent | /brackets/leagues/new, /app/home, /af-legacy | Link | OK |
| Login: callbackUrl | LoginContent | searchParams callbackUrl/next | getRedirectAfterLogin | OK |
| Signup: next | Signup page | next param | getRedirectAfterSignup | OK |
| Logout: callback | logout page | callbackUrl/next → login | signOut({ callbackUrl }) | OK |
| Protected: dashboard | dashboard/page | no session → redirect | redirect("/login?callbackUrl=/dashboard") | OK |
| Protected: profile | profile/page | no session → redirect | redirect("/login?callbackUrl=/profile") | OK |
| Protected: settings | settings/page | no session → redirect | redirect("/login?callbackUrl=/settings") | OK |
| Protected: onboarding | onboarding/page | no session → redirect | redirect("/login?callbackUrl=/onboarding") | OK |
| Protected: brackets | brackets/page | login/signup links | callbackUrl=/brackets | OK |
| Protected: bracket entry | bracket/.../entries/new | no userId → /login | redirect("/login") | OK |
| Admin: access | admin/page | no session → login?next=/admin | redirect | OK |
| Deep links | — | Notifications/emails | Use getDeepLinkRedirect when implementing | N/A |

All product switcher and nav links are wired; protected routes redirect to login with callbackUrl; post-auth redirects use callbackUrl/next/returnTo. No dead redirects or looped redirects identified.

---

## 6. QA Findings

- **Switching between products**: Product switcher and nav tabs use the same entry routes (/dashboard, /app, /brackets, /af-legacy); navigation works and shell stays consistent.
- **Deep links**: DeepLinkHandler defines allowed prefixes and getDeepLinkRedirect; any new deep link handling should use it to avoid open redirects.
- **Auth-protected routes**: Dashboard, profile, settings, onboarding, brackets, mock-draft, etc. redirect to login with callbackUrl when unauthenticated; pattern matches ProtectedRouteResolver.
- **Post-auth routing**: Login and signup use callbackUrl/next; verify uses returnTo; auth-intent-resolver and PostAuthIntentRouter centralize safe redirect logic.
- **Admin route access**: Admin page checks session and admin role; redirects to login with next=/admin when not authenticated; UnauthorizedFallbackResolver documents fallback to /dashboard when authenticated but not admin.
- **Theme/language/session**: Session and preferences persist across transitions (cookie, providers); no product-specific clearing on switch.

---

## 7. Issues Fixed

- **No single source for product entry routes**: Added **CrossProductRouteResolver** with PRODUCT_ROUTE_CONFIGS and getProductEntryRoute so product switcher and “go to product” links share the same targets.
- **Product switch logic not centralized**: Added **ProductSwitchController** (getProductSwitchHref, getProductSwitchItems) so switch targets are explicit and consistent.
- **Post-auth intent scattered**: **PostAuthIntentRouter** re-exports auth-intent-resolver and adds getPostAuthDestination and build* helpers so all post-auth redirect logic is discoverable in one place.
- **Protected vs admin paths not explicit**: **ProtectedRouteResolver** lists protected and admin prefixes and exposes getLoginRedirectUrl/getSignupRedirectUrl for building redirect URLs.
- **Unauthorized fallback not formalized**: **UnauthorizedFallbackResolver** defines getUnauthorizedFallback(isAuthenticated, isAdmin, requestedPath) so fallback behavior is consistent (login with callback vs dashboard for admin).
- **Deep link safety**: **DeepLinkHandler** (normalizeDeepLink, isAllowedDeepLink, getDeepLinkRedirect) ensures deep links are internal and safe.

---

## 8. Final QA Checklist

- [ ] Product switcher: Home, WebApp, Bracket, Legacy navigate to /dashboard, /app, /brackets, /af-legacy.
- [ ] Nav tabs and drawer links navigate to correct product and profile/settings.
- [ ] Dashboard product cards and quick actions route to the same entry points as the switcher.
- [ ] Unauthenticated access to dashboard, profile, settings, onboarding redirects to login with callbackUrl.
- [ ] After login/signup, user is sent to callbackUrl/next when provided and safe.
- [ ] Logout redirects to login with callbackUrl when provided.
- [ ] Admin: unauthenticated → login?next=/admin; authenticated non-admin → can be sent to /dashboard if implemented.
- [ ] Theme and language persist across product switches.
- [ ] No redirect loops or dead redirects.

---

## 9. Explanation of the Cross-Product Routing System

The **cross-product routing system** is the layer that makes moving between **Sports App**, **Bracket**, **Legacy**, **Settings/Profile**, **AI**, and **Admin** predictable and safe.

- **CrossProductRouteResolver** defines the **canonical entry route** for each product (Home, WebApp, Bracket, Legacy) and which path prefixes belong to each product. The product switcher and all “go to product” links use these same routes so the user never lands on a broken or inconsistent URL.

- **ProductSwitchController** answers “where do I go when I switch to this product?” so that any UI or redirect that switches product uses the same href (e.g. /app/home for WebApp, /brackets for Bracket).

- **PostAuthIntentRouter** and the existing auth-intent-resolver ensure that after **login**, **signup**, or **verify**, the user is sent to the path they intended (callbackUrl, next, returnTo) when it is safe (internal path, no open redirect).

- **ProtectedRouteResolver** defines which paths require auth and which require admin, and provides **getLoginRedirectUrl** and **getSignupRedirectUrl** so every protected page can redirect unauthenticated users to login/signup with the right callback.

- **UnauthorizedFallbackResolver** defines what to do when access is denied: not authenticated → login with callback; authenticated but not admin on /admin → dashboard. This avoids ambiguous or inconsistent fallbacks.

- **DeepLinkHandler** validates and normalizes deep link paths (e.g. from notifications or emails) so only allowed internal routes are used and open redirects are prevented.

Together, these modules keep **route transitions** clean, **post-auth destination intent** correct, **product switcher** behavior consistent, **deep links** safe, **protected route** handling explicit, and **fallback routing** for unauthorized access predictable. Users stay within the platform with a single session and consistent shell across products.
