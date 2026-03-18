import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { buildWeeklyRecapPayload } from "@/lib/weekly-recap-engine"

export const dynamic = "force-dynamic"

/**
 * GET /api/weekly-recap
 * Returns weekly recap for the current user: wins/losses, leagues, best players, AI insights.
 */
export async function GET() {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { id?: string }
  } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const payload = await buildWeeklyRecapPayload(session.user.id)
    return NextResponse.json(payload)
  } catch (e) {
    console.error("[api/weekly-recap] error:", e)
    return NextResponse.json(
      { error: "Failed to build weekly recap" },
      { status: 500 }
    )
  }
}
