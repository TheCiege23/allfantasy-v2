import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { syncWalletEarnings } from "@/lib/league-economy/WalletService"

export const dynamic = "force-dynamic"

/**
 * GET /api/marketplace/wallet — current user's wallet (requires auth).
 */
export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const managerId = session.user.id
    const wallet = await syncWalletEarnings(managerId)
    return NextResponse.json(wallet)
  } catch (e) {
    console.error("[marketplace/wallet GET]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: "Failed to load wallet" },
      { status: 500 }
    )
  }
}
