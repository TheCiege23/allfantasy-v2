import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getDailyCheckInData } from "@/lib/daily-checkin"
import { recordEngagementEvent } from "@/lib/engagement-engine"

export const dynamic = "force-dynamic"

/**
 * GET /api/daily-checkin
 * Returns today's "Ask Chimmy" prompt, Chimmy href, and streak for the daily engagement card.
 */
export async function GET() {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { id?: string }
  } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const data = await getDailyCheckInData(session.user.id)
    return NextResponse.json(data)
  } catch (e) {
    console.error("[api/daily-checkin] GET error:", e)
    return NextResponse.json(
      { error: "Failed to load daily check-in" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/daily-checkin
 * Records a "daily check-in" engagement event (e.g. user clicked "Ask Chimmy" for today's insight).
 * Keeps streak logic in sync; call before navigating to Chimmy if you want to count the click as check-in.
 */
export async function POST() {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { id?: string }
  } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await recordEngagementEvent(session.user.id, "daily_checkin")
    const data = await getDailyCheckInData(session.user.id)
    return NextResponse.json(data)
  } catch (e) {
    console.error("[api/daily-checkin] POST error:", e)
    return NextResponse.json(
      { error: "Failed to record check-in" },
      { status: 500 }
    )
  }
}
