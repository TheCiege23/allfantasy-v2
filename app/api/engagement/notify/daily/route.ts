import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sendDailyDigest } from "@/lib/engagement-engine"

export const dynamic = "force-dynamic"

/**
 * POST /api/engagement/notify/daily
 * Send a daily digest notification to the current user (for QA or cron).
 * Body: { title?, body?, actionHref?, actionLabel?, leagueId? }
 */
export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { id?: string }
  } | null

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const ok = await sendDailyDigest({
    userId: session.user.id,
    title: body.title ?? "Your daily digest",
    body: body.body,
    actionHref: body.actionHref,
    actionLabel: body.actionLabel,
    leagueId: body.leagueId,
  })
  if (!ok) {
    return NextResponse.json({ error: "Failed to send daily digest" }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
