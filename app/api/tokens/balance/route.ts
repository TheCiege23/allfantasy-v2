import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { TokenBalanceResolver } from "@/lib/tokens/TokenBalanceResolver"

export const dynamic = "force-dynamic"

/**
 * GET /api/tokens/balance
 * Returns current user's persisted token balance + lifetime stats for UI widgets.
 */
export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const resolver = new TokenBalanceResolver()
    const snapshot = await resolver.resolveForUser(session.user.id)

    return NextResponse.json({
      balance: Number(snapshot.balance),
      lifetimePurchased: Number(snapshot.lifetimePurchased ?? 0),
      lifetimeSpent: Number(snapshot.lifetimeSpent ?? 0),
      lifetimeRefunded: Number(snapshot.lifetimeRefunded ?? 0),
      updatedAt: String(snapshot.updatedAt),
    })
  } catch (e) {
    console.error("[tokens/balance GET]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: "Failed to load balance" },
      { status: 500 }
    )
  }
}
