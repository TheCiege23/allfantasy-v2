import { NextRequest, NextResponse } from "next/server"
import { decideDraftPickRequest } from "@/lib/ai/opponents/aiOpponentEngine"
import { assertLeagueAiAllowed, verifyCronSecret, verifyInternalAiKey } from "@/lib/ai/opponents/apiGuards"
import { getAssignmentForTeam, logBotAction, profileFromDbRow } from "@/lib/ai/opponents/db"
import type { DraftDecisionContext } from "@/lib/ai/opponents/types"

export const dynamic = "force-dynamic"
export const maxDuration = 15

export async function POST(req: NextRequest) {
  if (!verifyInternalAiKey(req) && !verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as {
    leagueId?: string
    leagueTeamId?: string
    context?: Omit<DraftDecisionContext, "bot">
  } | null

  if (!body?.leagueId || !body.leagueTeamId || !body.context) {
    return NextResponse.json({ error: "leagueId, leagueTeamId, context required" }, { status: 400 })
  }

  const gate = await assertLeagueAiAllowed(body.leagueId)
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 403 })

  const t0 = Date.now()
  const assign = await getAssignmentForTeam(body.leagueTeamId)
  if (!assign || assign.leagueId !== body.leagueId || assign.paused) {
    return NextResponse.json({ error: "No active AI assignment for team" }, { status: 404 })
  }

  const bot = profileFromDbRow(assign.profile)
  if (!bot) return NextResponse.json({ error: "Bot profile not found" }, { status: 500 })

  try {
    const decision = decideDraftPickRequest({ ...body.context, bot })
    await logBotAction({
      leagueId: body.leagueId,
      leagueTeamId: body.leagueTeamId,
      botProfileId: assign.profile.botId,
      actionType: "draft_pick",
      payload: body.context as object,
      result: decision as object,
      durationMs: Date.now() - t0,
    })
    return NextResponse.json({ ok: true, decision })
  } catch (e) {
    await logBotAction({
      leagueId: body.leagueId,
      leagueTeamId: body.leagueTeamId,
      botProfileId: assign.profile.botId,
      actionType: "draft_pick_error",
      errorMessage: e instanceof Error ? e.message : "error",
    })
    return NextResponse.json({ error: "Draft decision failed" }, { status: 500 })
  }
}
