import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { recordEngagementEvent } from "@/lib/engagement-engine"
import type { EngagementEventType } from "@/lib/engagement-engine"

export const dynamic = "force-dynamic"

const ALLOWED_EVENT_TYPES: EngagementEventType[] = [
  "app_open",
  "league_view",
  "bracket_view",
  "ai_used",
  "trade_analyzer",
  "mock_draft",
  "waiver_ai",
  "chimmy_chat",
  "lineup_edit",
  "draft_completed",
]

/**
 * POST /api/engagement/activity
 * Record an engagement event for the current user (for retention and weekly recap).
 * Body: { eventType, meta? }
 */
export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { id?: string }
  } | null

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const eventType = body.eventType as string | undefined
  const meta = body.meta as Record<string, unknown> | undefined

  if (!eventType || !ALLOWED_EVENT_TYPES.includes(eventType as EngagementEventType)) {
    return NextResponse.json(
      { error: "Invalid eventType", allowed: ALLOWED_EVENT_TYPES },
      { status: 400 }
    )
  }

  const ok = await recordEngagementEvent(
    session.user.id,
    eventType as EngagementEventType,
    meta
  )
  if (!ok) {
    return NextResponse.json({ error: "Failed to record event" }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
