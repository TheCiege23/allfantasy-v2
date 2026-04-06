import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

import { resolveAuthSecret } from "@/lib/auth/resolve-auth-secret"
import { isFullyBlocked, isPaidBlocked } from "@/lib/geo/restrictedStates"

/**
 * App routes that must have a valid NextAuth session (JWT).
 * Matches: /dashboard/rankings, /dashboard/rankings/*, /league/*
 */
function requiresSessionAuth(pathname: string): boolean {
  if (pathname.startsWith("/dashboard/rankings")) return true
  if (pathname.startsWith("/league/")) return true
  return false
}

/** Paths that skip geo logic. Includes `/api/auth` so NextAuth + OAuth callbacks are never geo-blocked. */
const GEO_EXEMPT_PREFIXES = [
  "/geo-blocked",
  "/paid-restricted",
  "/restricted",
  "/terms",
  "/privacy",
  "/data-deletion",
  "/disclaimer",
  "/api/health",
  "/api/auth",
  "/api/geo",
  "/_next",
  "/favicon.ico",
]

/** Exact-prefix match: `/pro` matches `/pro` and `/pro/foo`, not `/professional`. */
function isPaidPrefix(prefix: string, pathname: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

/** Paid API surfaces in paid_block states (cron/webhooks like sync-profiles stay open). */
const PAID_GEO_PREFIXES = [
  "/api/subscription/checkout",
  "/api/subscription/portal",
  "/api/subscription/billing-portal",
  "/api/subscription/cancel",
  "/api/subscription/upgrade",
  "/api/monetization/checkout",
  "/api/user/autocoach",
]

/** Paid / premium surfaces — align with product geo policy (dispersal, import, rankings, league draft room). */
const PAID_GEO_PATTERNS = [
  /^\/api\/leagues\/[^/]+\/dispersal-draft/,
  /^\/league\/[^/]+\/dispersal-draft/,
  /^\/api\/leagues\/import/,
  /^\/dashboard\/rankings/,
  /^\/api\/leagues\/[^/]+\/integrity(?:\/|$)/,
  /^\/api\/leagues\/[^/]+\/autocoach-settings/,
]

function isExemptPath(pathname: string): boolean {
  for (const p of GEO_EXEMPT_PREFIXES) {
    if (pathname === p || pathname.startsWith(`${p}/`)) return true
  }
  return false
}

/**
 * `/app` marketing shell and duplicate routes are deprecated; dashboard + `/league/*` are canonical.
 * See docs or APP_DEPRECATION_DELETE_LIST in repo notes when removing `app/app/**` files.
 */
function redirectDeprecatedAppRoutes(request: NextRequest): NextResponse | null {
  const url = request.nextUrl.clone()
  const { pathname } = url

  if (pathname === "/app" || pathname === "/app/") {
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }
  if (pathname === "/dashboard") {
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }
  if (pathname.startsWith("/app/leagues")) {
    url.pathname = pathname.slice(4)
    return NextResponse.redirect(url)
  }
  if (pathname.startsWith("/app/power-rankings")) {
    url.pathname = pathname.slice(4)
    return NextResponse.redirect(url)
  }
  const leagueRoot = pathname.match(/^\/app\/league\/([^/]+)$/)
  if (leagueRoot) {
    url.pathname = `/league/${leagueRoot[1]}`
    return NextResponse.redirect(url)
  }
  return null
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const appRedirect = redirectDeprecatedAppRoutes(request)
  if (appRedirect) {
    return appRedirect
  }

  if (isExemptPath(pathname)) {
    return NextResponse.next()
  }

  const authSecret = resolveAuthSecret()
  if (authSecret && requiresSessionAuth(pathname)) {
    const token = await getToken({ req: request, secret: authSecret })
    if (!token) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      const login = request.nextUrl.clone()
      login.pathname = "/login"
      login.searchParams.set("callbackUrl", `${pathname}${request.nextUrl.search}`)
      return NextResponse.redirect(login)
    }
  }

  const country = request.headers.get("x-vercel-ip-country")
  const region = request.headers.get("x-vercel-ip-country-region")
  const ip = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()

  if (country === "US" && region) {
    const stateCode = region.toUpperCase()

    if (isFullyBlocked(stateCode)) {
      if (pathname.startsWith("/api/")) {
        return new NextResponse(
          JSON.stringify({
            error: "GEO_BLOCKED",
            message: "AllFantasy.ai is not available in your state.",
            stateCode,
          }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        )
      }
      const url = request.nextUrl.clone()
      url.pathname = "/geo-blocked"
      url.searchParams.set("state", stateCode)
      return NextResponse.redirect(url)
    }

    if (isPaidBlocked(stateCode)) {
      const isPaidRoute =
        PAID_GEO_PREFIXES.some((p) => isPaidPrefix(p, pathname)) ||
        PAID_GEO_PATTERNS.some((r) => r.test(pathname))

      if (isPaidRoute && pathname.startsWith("/api/")) {
        return new NextResponse(
          JSON.stringify({
            error: "PAID_GEO_BLOCKED",
            message: "Paid features are not available in your state.",
            stateCode,
            allowFree: true,
            redirectTo: "/paid-restricted",
          }),
          { status: 451, headers: { "Content-Type": "application/json" } }
        )
      }

      if (isPaidRoute && !pathname.startsWith("/api/")) {
        const url = request.nextUrl.clone()
        url.pathname = "/paid-restricted"
        url.searchParams.set("state", stateCode)
        return NextResponse.redirect(url)
      }
    }
  }

  const response = NextResponse.next()
  if (country === "US" && region) {
    response.headers.set("x-user-state", region.toUpperCase())
  }
  if (ip) {
    response.headers.set("x-client-ip", ip)
  }
  return response
}

/**
 * Runs on all non-static routes; session checks apply only to
 * /dashboard/rankings, /league/* (see requiresSessionAuth).
 */
export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
