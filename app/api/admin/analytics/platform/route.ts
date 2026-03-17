import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/adminAuth"
import { getPlatformAnalytics } from "@/lib/platform-analytics"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res
  try {
    const { searchParams } = new URL(req.url)
    const from = searchParams.get("from") ?? undefined
    const to = searchParams.get("to") ?? undefined
    const sport = searchParams.get("sport") ?? undefined
    const result = await getPlatformAnalytics({ from, to, sport })
    return NextResponse.json(result)
  } catch (e) {
    console.error("[admin/analytics/platform]", e)
    return NextResponse.json(
      { error: "Failed to load platform analytics" },
      { status: 500 }
    )
  }
}
