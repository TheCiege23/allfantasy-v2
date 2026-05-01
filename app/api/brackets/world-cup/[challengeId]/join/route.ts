import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { joinWorldCupChallengeByInvite } from "@/lib/world-cup"
import { requireWorldCupApiUser, worldCupChallengeParamsSchema } from "../../_utils"

export const runtime = "nodejs"

export async function POST(_request: Request, context: { params: { challengeId: string } }) {
  const auth = await requireWorldCupApiUser()
  if (!auth.ok) return auth.response

  const params = worldCupChallengeParamsSchema.safeParse(context.params)
  if (!params.success) {
    return NextResponse.json({ error: "Invalid challenge id" }, { status: 400 })
  }

  const challenge = await (prisma as any).worldCupBracketChallenge.findUnique({
    where: { id: params.data.challengeId },
    select: { inviteCode: true, visibility: true },
  })
  if (!challenge) {
    return NextResponse.json({ error: "Challenge not found" }, { status: 404 })
  }
  if (challenge.visibility !== "public") {
    return NextResponse.json({ error: "Invite required to join this bracket" }, { status: 403 })
  }

  const result = await joinWorldCupChallengeByInvite({
    inviteCode: challenge.inviteCode,
    user: auth.user,
  })

  return NextResponse.json({ ok: true, ...result })
}
