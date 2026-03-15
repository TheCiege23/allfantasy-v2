/**
 * ProtectedRouteResolver — which paths require auth or admin; login redirect URL for protected routes.
 */

/** Path prefixes that require an authenticated session. */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/app",
  "/leagues",
  "/brackets",
  "/bracket",
  "/af-legacy",
  "/legacy",
  "/profile",
  "/settings",
  "/wallet",
  "/messages",
  "/onboarding",
  "/mock-draft",
  "/mock-draft-simulator",
  "/trade-finder",
  "/trade-history",
  "/dynasty-trade-analyzer",
  "/startup-dynasty",
  "/legacy-import",
  "/verify",
  "/bracket-intelligence",
  "/lab",
]

/** Path prefixes that require admin (in addition to auth). */
const ADMIN_PREFIXES = ["/admin"]

export function isProtectedPath(pathname: string | null): boolean {
  if (!pathname || pathname === "/") return false
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  )
}

export function isAdminPath(pathname: string | null): boolean {
  if (!pathname) return false
  return ADMIN_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  )
}

/** Build login redirect URL that preserves the requested path as callbackUrl. */
export function getLoginRedirectUrl(requestedPath: string | null): string {
  const path = requestedPath && requestedPath.startsWith("/") && !requestedPath.startsWith("//")
    ? requestedPath
    : "/dashboard"
  return `/login?callbackUrl=${encodeURIComponent(path)}`
}

/** Build signup redirect URL that preserves the requested path as next. */
export function getSignupRedirectUrl(requestedPath: string | null): string {
  const path = requestedPath && requestedPath.startsWith("/") && !requestedPath.startsWith("//")
    ? requestedPath
    : "/dashboard"
  return `/signup?next=${encodeURIComponent(path)}`
}
