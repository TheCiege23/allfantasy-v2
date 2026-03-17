import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sendAIInsight } from "@/lib/engagement-engine"

export const dynamic = "force-dynamic"

/**
 * POST /api/engagement/notify/ai-insight
 * Send an AI insight notification (for QA or server-triggered).
 * Body: { title, body?, actionHref?, actionLabel?, leagueId? }
 */
export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { id?: string }
  } | null

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const title = body.title as string | undefined
  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "title required" }, { status: 400 })
  }

  const ok = await sendAIInsight({
    userId: session.user.id,
    title,
    body: body.body,
    actionHref: body.actionHref,
    actionLabel: body.actionLabel,
    leagueId: body.leagueId,
  })
  if (!ok) {
    return NextResponse.json({ error: "Failed to send AI insight" }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
