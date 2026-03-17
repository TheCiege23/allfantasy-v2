import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getNudges } from "@/lib/onboarding-retention"

export const dynamic = "force-dynamic"

/**
 * GET /api/retention/nudges
 * Returns personalized retention nudges (recap, return, reminders, creator recs, sport-season).
 */
export async function GET() {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const nudges = await getNudges(session.user.id)
    return NextResponse.json({ nudges })
  } catch (e) {
    console.error("[api/retention/nudges] GET error:", e)
    return NextResponse.json({ error: "Failed to load nudges" }, { status: 500 })
  }
}
