import { NextRequest, NextResponse } from "next/server"
import { getTrendingLeagues } from "@/lib/public-discovery"

export const dynamic = "force-dynamic"

function getBaseUrl(req: NextRequest): string {
  return req.headers.get("x-forwarded-host")
    ? `${req.headers.get("x-forwarded-proto") || "https"}://${req.headers.get("x-forwarded-host")}`
    : process.env.NEXTAUTH_URL ?? "https://allfantasy.ai"
}

export async function GET(req: NextRequest) {
  try {
    const sport = req.nextUrl.searchParams.get("sport") ?? null
    const limit = Math.min(12, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") ?? "6", 10)))
    const leagues = await getTrendingLeagues(limit, sport, getBaseUrl(req))
    return NextResponse.json({ ok: true, leagues }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
    })
  } catch (err: unknown) {
    console.error("[discover/trending]", err)
    return NextResponse.json({ error: "Failed to load trending" }, { status: 500 })
  }
}
