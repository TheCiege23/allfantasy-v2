import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getEngagementStreak } from "@/lib/engagement-engine"

export const dynamic = "force-dynamic"

/**
 * GET /api/retention/streak
 * Returns engagement streak for the current user (consecutive days with app activity; non-gambling).
 */
export async function GET() {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const data = await getEngagementStreak(session.user.id)
    return NextResponse.json(data)
  } catch (e) {
    console.error("[api/retention/streak]", e)
    return NextResponse.json(
      { error: "Failed to load streak" },
      { status: 500 }
    )
  }
}
