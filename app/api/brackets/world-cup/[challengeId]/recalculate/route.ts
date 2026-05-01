import { NextResponse } from "next/server"
import { recalculateWorldCupChallenge } from "@/lib/world-cup"
import {
  assertWorldCupManager,
  requireWorldCupApiUser,
  worldCupChallengeParamsSchema,
} from "../../_utils"

export const runtime = "nodejs"

export async function POST(request: Request, context: { params: { challengeId: string } }) {
  const auth = await requireWorldCupApiUser()
  if (!auth.ok) return auth.response

  const params = worldCupChallengeParamsSchema.safeParse(context.params)
  if (!params.success) {
    return NextResponse.json({ error: "Invalid challenge id" }, { status: 400 })
  }

  const access = await assertWorldCupManager(request, params.data.challengeId, auth.user)
  if (!access.ok) return access.response

  const leaderboard = await recalculateWorldCupChallenge(params.data.challengeId)
  return NextResponse.json({ ok: true, leaderboard })
}
