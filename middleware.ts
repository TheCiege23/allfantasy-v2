import { getToken } from "next-auth/jwt"
import { NextRequest, NextResponse } from "next/server"

/**
 * Public routes that do not require authentication.
 * All other page routes are protected and require a valid session.
 */
const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify",
  "/pricing",
  "/privacy",
  "/terms",
  "/support",
  "/early-access",
  "/rankings",
  "/robots.txt",
  "/sitemap.xml",
])

/** Prefixes whose page routes are always public. */
const PUBLIC_PREFIXES = [
  "/auth/",
  "/api/",
  "/_next/",
  "/favicon",
]

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  })

  if (!token) {
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = "/login"
    // Only pass a relative callbackUrl to prevent open-redirect attacks.
    // req.nextUrl.pathname always starts with '/' (guaranteed by the URL API),
    // but we double-check here to be explicit.
    const callbackPath = pathname.startsWith("/") && !pathname.startsWith("//")
      ? pathname
      : "/"
    loginUrl.searchParams.set("callbackUrl", callbackPath)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT static files and images.
     * Next.js static assets and API routes handle their own auth.
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
}
