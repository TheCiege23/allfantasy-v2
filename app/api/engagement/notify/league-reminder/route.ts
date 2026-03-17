import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sendLeagueReminder } from "@/lib/engagement-engine"

export const dynamic = "force-dynamic"

/**
 * POST /api/engagement/notify/league-reminder
 * Send a league reminder notification (for QA or cron).
 * Body: { leagueId, title?, body?, actionLabel? }
 */
export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { id?: string }
  } | null

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const leagueId = body.leagueId as string | undefined
  if (!leagueId || typeof leagueId !== "string") {
    return NextResponse.json({ error: "leagueId required" }, { status: 400 })
  }

  const ok = await sendLeagueReminder({
    userId: session.user.id,
    leagueId,
    title: body.title ?? "League reminder",
    body: body.body,
    actionLabel: body.actionLabel,
  })
  if (!ok) {
    return NextResponse.json({ error: "Failed to send league reminder" }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
