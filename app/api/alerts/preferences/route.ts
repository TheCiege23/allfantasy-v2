import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getAlertPreferences, setAlertPreferences } from "@/lib/sports-alerts"

export const dynamic = "force-dynamic"

/**
 * GET /api/alerts/preferences
 * Returns current user's sports alert preferences (injury, performance, lineup).
 */
export async function GET() {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { id?: string }
  } | null

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const prefs = await getAlertPreferences(session.user.id)
  return NextResponse.json(prefs)
}

/**
 * PATCH /api/alerts/preferences
 * Body: { injuryAlerts?, performanceAlerts?, lineupAlerts? } (boolean).
 */
export async function PATCH(req: Request) {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { id?: string }
  } | null

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const result = await setAlertPreferences(session.user.id, {
    injuryAlerts: body.injuryAlerts,
    performanceAlerts: body.performanceAlerts,
    lineupAlerts: body.lineupAlerts,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Failed to save" }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}
