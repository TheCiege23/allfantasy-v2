import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getAchievementsForUser } from "@/lib/achievement-system"

export const dynamic = "force-dynamic"

/**
 * GET /api/achievements
 * Returns all progression achievements with earned status for the current user.
 * No money rewards — XP/progression only.
 */
export async function GET() {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { id?: string }
  } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const achievements = await getAchievementsForUser(session.user.id)
    return NextResponse.json({ achievements })
  } catch (e) {
    console.error("[api/achievements] error:", e)
    return NextResponse.json(
      { error: "Failed to load achievements" },
      { status: 500 }
    )
  }
}
