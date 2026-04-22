import { NextRequest, NextResponse } from "next/server"
import { decideWaiverClaimsRequest } from "@/lib/ai/opponents/aiOpponentEngine"
import { assertLeagueAiAllowed, verifyCronSecret, verifyInternalAiKey } from "@/lib/ai/opponents/apiGuards"
import { getAssignmentForTeam, logBotAction, profileFromDbRow } from "@/lib/ai/opponents/db"
import type { WaiverContext } from "@/lib/ai/opponents/waivers/aiOpponentWaivers"

export const dynamic = "force-dynamic"
export const maxDuration = 30

export async function POST(req: NextRequest) {
  if (!verifyInternalAiKey(req) && !verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as {
    leagueId?: string
    leagueTeamId?: string
    ctx?: Omit<WaiverContext, "bot">
  } | null

  if (!body?.leagueId || !body.leagueTeamId || !body.ctx) {
    return NextResponse.json({ error: "leagueId, leagueTeamId, ctx required" }, { status: 400 })
  }

  const gate = await assertLeagueAiAllowed(body.leagueId)
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 403 })

  const assign = await getAssignmentForTeam(body.leagueTeamId)
  if (!assign || assign.leagueId !== body.leagueId || assign.paused) {
    return NextResponse.json({ error: "No active AI assignment" }, { status: 404 })
  }

  const bot = profileFromDbRow(assign.profile)
  if (!bot) return NextResponse.json({ error: "Bot profile not found" }, { status: 500 })

  const t0 = Date.now()
  const decision = decideWaiverClaimsRequest({ ...body.ctx, bot })
  await logBotAction({
    leagueId: body.leagueId,
    leagueTeamId: body.leagueTeamId,
    botProfileId: assign.profile.botId,
    actionType: "waiver_run",
    result: decision as object,
    durationMs: Date.now() - t0,
  })

  return NextResponse.json({ ok: true, decision })
}
