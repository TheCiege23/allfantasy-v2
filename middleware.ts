import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { isFullyBlocked, isPaidBlocked } from "@/lib/geo/restrictedStates"

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

/** Paid commerce / subscription surfaces — free app routes stay available in paid_block states. */
const PAID_GEO_PREFIXES = [
  "/api/monetization/checkout",
  "/api/subscription/billing-portal",
  "/commissioner-upgrade",
  "/pro",
  "/all-access",
  "/war-room",
]

function isExemptPath(pathname: string): boolean {
  for (const p of GEO_EXEMPT_PREFIXES) {
    if (pathname === p || pathname.startsWith(`${p}/`)) return true
  }
  return false
}

function isPaidGeoPath(pathname: string): boolean {
  return PAID_GEO_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isExemptPath(pathname)) {
    return NextResponse.next()
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

    if (isPaidBlocked(stateCode) && isPaidGeoPath(pathname)) {
      if (pathname.startsWith("/api/")) {
        return new NextResponse(
          JSON.stringify({
            error: "PAID_GEO_BLOCKED",
            message: "Paid fantasy sports products are not available in your state.",
            stateCode,
            allowFree: true,
          }),
          { status: 451, headers: { "Content-Type": "application/json" } }
        )
      }
      const url = request.nextUrl.clone()
      url.pathname = "/paid-restricted"
      url.searchParams.set("state", stateCode)
      return NextResponse.redirect(url)
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

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
