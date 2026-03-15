import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { processPurchase } from "@/lib/league-economy/PurchaseProcessor"

export const dynamic = "force-dynamic"

/**
 * POST /api/marketplace/purchase — body: { itemId: string, sport?: string }.
 */
export async function POST(req: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const managerId = session.user.id

    const body = await req.json().catch(() => ({}))
    const itemId = body.itemId as string
    const sport = body.sport as string | undefined

    if (!itemId) {
      return NextResponse.json({ error: "Missing itemId" }, { status: 400 })
    }

    const result = await processPurchase(managerId, itemId, { sport })
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }
    return NextResponse.json({
      success: true,
      purchaseId: result.purchaseId,
      newBalance: result.newBalance,
    })
  } catch (e) {
    console.error("[marketplace/purchase POST]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: "Purchase failed" },
      { status: 500 }
    )
  }
}
