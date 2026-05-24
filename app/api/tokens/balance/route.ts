import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { TokenBalanceResolver } from "@/lib/tokens/TokenBalanceResolver"
import { isSubscriptionEntitlementBypassUserId } from "@/lib/dev-admin/access"

export const dynamic = "force-dynamic"

/**
 * GET /api/tokens/balance
 * Returns current user's persisted token balance + lifetime stats for UI widgets.
 *
 * `isAdminBypassAccount: true` means the returned `balance` is a synthetic
 * dev-admin value (not from DB). In that case, token history will be empty
 * because AI spends are also bypassed and not written to the ledger.
 */
export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as {
      user?: { id?: string; email?: string | null }
    } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const isAdminBypassAccount = isSubscriptionEntitlementBypassUserId(
      session.user.id,
      session.user.email
    )
    const resolver = new TokenBalanceResolver()
    const snapshot = await resolver.resolveForUser(session.user.id, session.user.email)

    return NextResponse.json({
      balance: Number(snapshot.balance),
      lifetimePurchased: Number(snapshot.lifetimePurchased ?? 0),
      lifetimeSpent: Number(snapshot.lifetimeSpent ?? 0),
      lifetimeRefunded: Number(snapshot.lifetimeRefunded ?? 0),
      updatedAt: String(snapshot.updatedAt),
      isAdminBypassAccount,
    })
  } catch (e) {
    console.error("[tokens/balance GET]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: "Failed to load balance" },
      { status: 500 }
    )
  }
}
