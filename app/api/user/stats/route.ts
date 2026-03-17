import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getCrossLeagueUserStats } from "@/lib/user-stats"

export const dynamic = "force-dynamic"

/**
 * GET: Cross-league user stats for the current user (wins, losses, championships, playoff appearances, draft grades, trade success).
 */
export async function GET() {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const stats = await getCrossLeagueUserStats(userId)
    return NextResponse.json(
      { ok: true, stats },
      { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" } }
    )
  } catch (err: unknown) {
    console.error("[user/stats]", err)
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 })
  }
}
