import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { resolveAllCosmeticsForManager } from "@/lib/league-economy/CosmeticResolver"

export const dynamic = "force-dynamic"

/**
 * GET /api/marketplace/cosmetics — resolved cosmetics for current user (for profile display).
 */
export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const cosmetics = await resolveAllCosmeticsForManager(session.user.id)
    return NextResponse.json({ cosmetics })
  } catch (e) {
    console.error("[marketplace/cosmetics GET]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: "Failed to load cosmetics" },
      { status: 500 }
    )
  }
}
