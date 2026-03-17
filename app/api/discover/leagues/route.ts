import { NextRequest, NextResponse } from "next/server"
import { discoverPublicLeagues } from "@/lib/public-discovery"
import type {
  DiscoveryFormat,
  DiscoverySort,
  EntryFeeFilter,
  VisibilityFilter,
} from "@/lib/public-discovery/types"

export const dynamic = "force-dynamic"

function getBaseUrl(req: NextRequest): string {
  return req.headers.get("x-forwarded-host")
    ? `${req.headers.get("x-forwarded-proto") || "https"}://${req.headers.get("x-forwarded-host")}`
    : process.env.NEXTAUTH_URL ?? "https://allfantasy.ai"
}

function parseIntParam(sp: URLSearchParams, key: string): number | undefined {
  const v = sp.get(key)
  if (v == null || v === "") return undefined
  const n = parseInt(v, 10)
  return Number.isNaN(n) ? undefined : n
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const query = sp.get("q") ?? sp.get("query") ?? null
    const sport = sp.get("sport") ?? null
    const format = (sp.get("format") as DiscoveryFormat) ?? "all"
    const sort = (sp.get("sort") as DiscoverySort) ?? "popularity"
    const entryFee = (sp.get("entryFee") as EntryFeeFilter) ?? "all"
    const visibility = (sp.get("visibility") as VisibilityFilter) ?? "public"
    const teamCountMin = parseIntParam(sp, "teamCountMin")
    const teamCountMax = parseIntParam(sp, "teamCountMax")
    const aiEnabled = sp.get("aiEnabled") === "true"
    const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10))
    const limit = Math.min(24, Math.max(6, parseInt(sp.get("limit") ?? "12", 10)))

    const result = await discoverPublicLeagues(
      {
        query,
        sport,
        format,
        sort,
        entryFee,
        visibility,
        teamCountMin: teamCountMin ?? null,
        teamCountMax: teamCountMax ?? null,
        aiEnabled: aiEnabled || null,
        page,
        limit,
      },
      getBaseUrl(req)
    )
    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
    })
  } catch (err: unknown) {
    console.error("[discover/leagues]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Discovery failed" },
      { status: 500 }
    )
  }
}
