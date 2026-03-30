import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { TokenSpendService } from "@/lib/tokens/TokenSpendService"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(req.url)
    const limit = Number.parseInt(url.searchParams.get("limit") ?? "30", 10)
    const offset = Number.parseInt(url.searchParams.get("offset") ?? "0", 10)
    const service = new TokenSpendService()
    const entries = await service.listUsageHistory(session.user.id, { limit, offset })

    return NextResponse.json({
      entries,
      limit: Math.max(1, Math.min(100, Number.isFinite(limit) ? limit : 30)),
      offset: Math.max(0, Number.isFinite(offset) ? offset : 0),
    })
  } catch (error) {
    console.error("[tokens/history GET]", error instanceof Error ? error.message : error)
    return NextResponse.json({ error: "Failed to load token usage history" }, { status: 500 })
  }
}
