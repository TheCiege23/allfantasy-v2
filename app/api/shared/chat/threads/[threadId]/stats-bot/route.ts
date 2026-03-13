import { NextRequest, NextResponse } from "next/server"
import { createStatsBotMessage } from "@/lib/platform/chat-service"

/**
 * POST: post a Chat Stats Bot message to the thread (weekly update).
 * Call from cron or internal job. Optionally protect with CRON_SECRET or admin auth.
 * Body: { weekLabel, bestTeam, worstTeam, bestPlayer, winStreak, lossStreak }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { threadId: string } }
) {
  const threadId = decodeURIComponent(params.threadId)
  const body = await req.json().catch(() => ({}))
  const weekLabel = typeof body?.weekLabel === "string" ? body.weekLabel : "Week 1"
  const bestTeam = typeof body?.bestTeam === "string" ? body.bestTeam : "—"
  const worstTeam = typeof body?.worstTeam === "string" ? body.worstTeam : "—"
  const bestPlayer = typeof body?.bestPlayer === "string" ? body.bestPlayer : "—"
  const winStreak = typeof body?.winStreak === "string" ? body.winStreak : "—"
  const lossStreak = typeof body?.lossStreak === "string" ? body.lossStreak : "—"

  const created = await createStatsBotMessage(threadId, {
    weekLabel,
    bestTeam,
    worstTeam,
    bestPlayer,
    winStreak,
    lossStreak,
  })

  if (!created) return NextResponse.json({ error: "Failed to create stats message" }, { status: 500 })
  return NextResponse.json({ status: "ok", message: created })
}
