import { NextResponse } from "next/server"
import { getPlayoffBracketView } from "@/lib/playoffs/playoffService"
import { playoffChallengeParamsSchema, requireWorldCupApiUser } from "../_utils"

export const runtime = "nodejs"

export async function GET(request: Request, context: { params: { challengeId: string } }) {
  const auth = await requireWorldCupApiUser(request)
  if (!auth.ok) return auth.response

  const params = playoffChallengeParamsSchema.safeParse(context.params)
  if (!params.success) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 })
  }

  const view = await getPlayoffBracketView({
    challengeId: params.data.challengeId,
    user: auth.user,
  })

  if (!view) {
    return NextResponse.json({ error: "Challenge not found" }, { status: 404 })
  }

  return NextResponse.json({ ok: true, view })
}
