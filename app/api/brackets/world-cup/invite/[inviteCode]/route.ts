import { NextResponse } from "next/server"
import {
  getWorldCupChallengeByInvite,
  joinWorldCupChallengeByInvite,
} from "@/lib/world-cup"
import { requireWorldCupApiUser, worldCupInviteParamsSchema } from "../../_utils"

export const runtime = "nodejs"

export async function GET(_request: Request, context: { params: { inviteCode: string } }) {
  const params = worldCupInviteParamsSchema.safeParse(context.params)
  if (!params.success) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 400 })
  }

  const invite = await getWorldCupChallengeByInvite(params.data.inviteCode)
  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 })
  }

  return NextResponse.json({ invite })
}

export async function POST(_request: Request, context: { params: { inviteCode: string } }) {
  const auth = await requireWorldCupApiUser()
  if (!auth.ok) return auth.response

  const params = worldCupInviteParamsSchema.safeParse(context.params)
  if (!params.success) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 400 })
  }

  try {
    const result = await joinWorldCupChallengeByInvite({
      inviteCode: params.data.inviteCode,
      user: auth.user,
    })
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to join bracket"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
