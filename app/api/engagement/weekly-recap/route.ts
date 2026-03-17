import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  buildWeeklyRecap,
  generateAndSendWeeklyRecap,
} from "@/lib/engagement-engine"

export const dynamic = "force-dynamic"

/**
 * GET /api/engagement/weekly-recap
 * Preview weekly recap for the current user (no notification sent).
 */
export async function GET() {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { id?: string }
  } | null

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const payload = await buildWeeklyRecap(session.user.id)
  return NextResponse.json({ ok: true, recap: payload })
}

/**
 * POST /api/engagement/weekly-recap
 * Generate and send weekly recap notification to the current user.
 */
export async function POST() {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { id?: string }
  } | null

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const ok = await generateAndSendWeeklyRecap(session.user.id)
  if (!ok) {
    return NextResponse.json({ error: "Failed to send weekly recap" }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
