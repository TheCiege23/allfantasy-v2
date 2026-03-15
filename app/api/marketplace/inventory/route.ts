import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getInventory, getPurchaseHistory } from "@/lib/league-economy/InventoryManager"

export const dynamic = "force-dynamic"

/**
 * GET /api/marketplace/inventory?history=0|1 — current user's inventory (and optional purchase history).
 */
export async function GET(req: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const managerId = session.user.id

    const url = new URL(req.url)
    const includeHistory = url.searchParams.get("history") === "1"

    const [inventory, history] = await Promise.all([
      getInventory(managerId),
      includeHistory ? getPurchaseHistory(managerId, { limit: 30 }) : Promise.resolve([]),
    ])
    return NextResponse.json({ inventory, ...(includeHistory ? { history } : {}) })
  } catch (e) {
    console.error("[marketplace/inventory GET]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: "Failed to load inventory" },
      { status: 500 }
    )
  }
}
