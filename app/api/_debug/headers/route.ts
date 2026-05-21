import { NextResponse } from "next/server"
import { headers } from "next/headers"

/**
 * Safe diagnostic endpoint. Returns a small, non-secret slice of request
 * metadata so we can confirm whether the upstream proxy (Railway, Vercel, etc.)
 * preserves the middleware-injected `x-af-pathname` header that the root layout
 * historically relied on for auth-route detection.
 *
 * No cookies, no authorization, no env values are returned.
 */
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const SAFE_HEADER_KEYS = [
  "x-af-pathname",
  "next-url",
  "x-next-url",
  "x-invoke-path",
  "x-matched-path",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-forwarded-for",
  "x-vercel-deployment-url",
  "x-railway-edge",
  "host",
  "referer",
  "user-agent",
] as const

export async function GET(request: Request) {
  const headerList = await headers()
  const safeHeaders: Record<string, string | null> = {}
  for (const key of SAFE_HEADER_KEYS) {
    safeHeaders[key] = headerList.get(key)
  }

  const url = new URL(request.url)

  return NextResponse.json(
    {
      ok: true,
      requestUrl: {
        pathname: url.pathname,
        search: url.search,
      },
      headers: safeHeaders,
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    },
  )
}
