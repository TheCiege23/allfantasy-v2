import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/adminAuth"
import { TokenSpendService } from "@/lib/tokens/TokenSpendService"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  try {
    const url = new URL(req.url)
    const userId = url.searchParams.get("userId")?.trim() || null
    const limit = Number.parseInt(url.searchParams.get("limit") ?? "50", 10)
    const offset = Number.parseInt(url.searchParams.get("offset") ?? "0", 10)

    const service = new TokenSpendService()
    const entries = await service.listLedgerForAdmin({ userId, limit, offset })
    return NextResponse.json({
      entries,
      limit: Math.max(1, Math.min(200, Number.isFinite(limit) ? limit : 50)),
      offset: Math.max(0, Number.isFinite(offset) ? offset : 0),
      userId,
    })
  } catch (error) {
    console.error("[admin/tokens/ledger GET]", error instanceof Error ? error.message : error)
    return NextResponse.json({ error: "Failed to load token ledger" }, { status: 500 })
  }
}
