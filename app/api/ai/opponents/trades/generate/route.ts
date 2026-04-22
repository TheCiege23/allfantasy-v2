import { NextRequest, NextResponse } from "next/server"
import { decideTradeOfferRequest } from "@/lib/ai/opponents/aiOpponentEngine"
import { assertLeagueAiAllowed, verifyCronSecret, verifyInternalAiKey } from "@/lib/ai/opponents/apiGuards"
import { canProposeTrade, getAssignmentForTeam, logBotAction, profileFromDbRow, recordTradeProposal } from "@/lib/ai/opponents/db"

export const dynamic = "force-dynamic"
export const maxDuration = 15

export async function POST(req: NextRequest) {
  if (!verifyInternalAiKey(req) && !verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as {
    leagueId?: string
    leagueTeamId?: string
  } | null

  if (!body?.leagueId || !body.leagueTeamId) {
    return NextResponse.json({ error: "leagueId, leagueTeamId required" }, { status: 400 })
  }

  const gate = await assertLeagueAiAllowed(body.leagueId)
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 403 })

  const assign = await getAssignmentForTeam(body.leagueTeamId)
  if (!assign || assign.leagueId !== body.leagueId || assign.paused) {
    return NextResponse.json({ error: "No active AI assignment" }, { status: 404 })
  }

  const bot = profileFromDbRow(assign.profile)
  if (!bot) return NextResponse.json({ error: "Bot profile not found" }, { status: 500 })

  const cooldownOk = await canProposeTrade(body.leagueId, body.leagueTeamId, 48)
  const decision = decideTradeOfferRequest(bot, body.leagueId, body.leagueTeamId, !cooldownOk)

  if (decision.shouldPropose) {
    await recordTradeProposal(body.leagueId, body.leagueTeamId)
  }

  await logBotAction({
    leagueId: body.leagueId,
    leagueTeamId: body.leagueTeamId,
    botProfileId: assign.profile.botId,
    actionType: "trade_generate",
    result: decision as object,
  })

  return NextResponse.json({ ok: true, decision })
}
