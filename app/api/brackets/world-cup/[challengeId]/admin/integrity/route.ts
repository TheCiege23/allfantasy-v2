import { NextResponse } from "next/server"
import { getWorldCupChallengeIntegrityReport } from "@/lib/world-cup"
import {
  assertWorldCupManager,
  requireWorldCupApiUser,
  worldCupChallengeParamsSchema,
} from "../../../_utils"

export const runtime = "nodejs"

export async function GET(request: Request, context: { params: { challengeId: string } }) {
  const auth = await requireWorldCupApiUser()
  if (!auth.ok) return auth.response

  const params = worldCupChallengeParamsSchema.safeParse(context.params)
  if (!params.success) {
    return NextResponse.json({ error: "Invalid challenge id" }, { status: 400 })
  }

  const access = await assertWorldCupManager(request, params.data.challengeId, auth.user)
  if (!access.ok) return access.response

  const report = await getWorldCupChallengeIntegrityReport(params.data.challengeId)
  if (!report) {
    return NextResponse.json({ error: "Challenge not found" }, { status: 404 })
  }

  return NextResponse.json({ ok: true, report })
}
