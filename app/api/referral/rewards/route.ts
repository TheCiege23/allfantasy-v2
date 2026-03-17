import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { listRewards, getRewardLabel } from "@/lib/referral"

export const runtime = "nodejs"

export async function GET() {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const list = await listRewards(session.user.id)
  const rewards = list.map((r) => ({
    id: r.id,
    type: r.type,
    label: getRewardLabel(r.type),
    status: r.status,
    grantedAt: r.grantedAt.toISOString(),
    redeemedAt: r.redeemedAt?.toISOString() ?? null,
  }))
  return NextResponse.json({ ok: true, rewards })
}
