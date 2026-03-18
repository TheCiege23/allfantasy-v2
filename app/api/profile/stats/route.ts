import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getProfileStats } from "@/lib/profile-stats"

export const dynamic = "force-dynamic"

/**
 * GET /api/profile/stats
 * Returns current user's profile stats: record, rankings, achievements (PROMPT 308).
 */
export async function GET() {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { id?: string }
  } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const stats = await getProfileStats(session.user.id)
    return NextResponse.json(stats)
  } catch (e) {
    console.error("[api/profile/stats] error:", e)
    return NextResponse.json(
      { error: "Failed to load profile stats" },
      { status: 500 }
    )
  }
}
