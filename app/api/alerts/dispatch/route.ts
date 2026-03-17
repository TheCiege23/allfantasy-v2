import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { dispatchSportsAlert } from "@/lib/sports-alerts"
import type { SportsAlertPayload } from "@/lib/sports-alerts"

export const dynamic = "force-dynamic"

/**
 * POST /api/alerts/dispatch
 * Dispatches a sports alert to the current user (for QA or cron).
 * Body: { type, title, body, actionHref, actionLabel?, leagueId?, playerId?, playerName?, sport? }.
 */
export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { id?: string }
  } | null

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const type = body.type as string
  if (!type || !["injury_alert", "performance_alert", "lineup_alert"].includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 })
  }
  if (!body.title || typeof body.title !== "string") {
    return NextResponse.json({ error: "title required" }, { status: 400 })
  }
  if (!body.actionHref || typeof body.actionHref !== "string") {
    return NextResponse.json({ error: "actionHref required" }, { status: 400 })
  }

  const payload: SportsAlertPayload = {
    type: type as SportsAlertPayload["type"],
    title: body.title,
    body: body.body ?? "",
    actionHref: body.actionHref,
    actionLabel: body.actionLabel,
    leagueId: body.leagueId,
    playerId: body.playerId,
    playerName: body.playerName,
    sport: body.sport,
  }

  const { sent, skipped } = await dispatchSportsAlert(payload, [session.user.id])
  return NextResponse.json({ ok: true, sent, skipped })
}
