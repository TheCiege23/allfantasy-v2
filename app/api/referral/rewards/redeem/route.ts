import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getReferralStats, redeemReward } from "@/lib/referral"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const rewardId = typeof body?.rewardId === "string" ? body.rewardId.trim() : null
  if (!rewardId) return NextResponse.json({ error: "Missing rewardId" }, { status: 400 })

  const result = await redeemReward(rewardId, session.user.id)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  const stats = await getReferralStats(session.user.id)
  return NextResponse.json({ ok: true, reward: result.reward, stats })
}
