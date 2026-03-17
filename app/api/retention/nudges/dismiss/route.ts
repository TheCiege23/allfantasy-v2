import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { dismissNudge } from "@/lib/onboarding-retention"

export const dynamic = "force-dynamic"

/**
 * POST /api/retention/nudges/dismiss
 * Body: { nudgeId: string }
 * Dismisses a nudge (persists; anti-spam cooldown applies before showing again).
 */
export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const nudgeId = typeof body.nudgeId === "string" ? body.nudgeId.trim() : ""

  if (!nudgeId) {
    return NextResponse.json({ error: "nudgeId required" }, { status: 400 })
  }

  const result = await dismissNudge(session.user.id, nudgeId)
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Failed to dismiss" }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
