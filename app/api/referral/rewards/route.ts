import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { listRewards } from "@/lib/referral"

export const runtime = "nodejs"

export async function GET() {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const list = await listRewards(session.user.id)
  return NextResponse.json({ ok: true, rewards: list })
}
