import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { TokenSpendService } from "@/lib/tokens/TokenSpendService"
import { isSubscriptionEntitlementBypassUserId } from "@/lib/dev-admin/access"

export const dynamic = "force-dynamic"

/**
 * GET /api/tokens/history
 *
 * `isAdminBypassAccount: true` signals that this account's AI spend is
 * bypassed and will never write real ledger entries, so an empty `entries`
 * array is expected and correct — not a bug.
 */
export async function GET(req: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as {
      user?: { id?: string; email?: string | null }
    } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(req.url)
    const limit = Number.parseInt(url.searchParams?.get("limit") ?? "30", 10)
    const offset = Number.parseInt(url.searchParams?.get("offset") ?? "0", 10)
    const isAdminBypassAccount = isSubscriptionEntitlementBypassUserId(
      session.user.id,
      session.user.email
    )
    const service = new TokenSpendService()
    const entries = await service.listUsageHistory(session.user.id, { limit, offset })

    // Echo back the clamped values so the client knows the effective pagination
    const effectiveLimit = Math.max(1, Math.min(100, Number.isFinite(limit) ? limit : 30))
    const effectiveOffset = Math.max(0, Number.isFinite(offset) ? offset : 0)
    return NextResponse.json({
      entries,
      limit: effectiveLimit,
      offset: effectiveOffset,
      isAdminBypassAccount,
    })
  } catch (error) {
    console.error("[tokens/history GET]", error instanceof Error ? error.message : error)
    return NextResponse.json({ error: "Failed to load token usage history" }, { status: 500 })
  }
}

