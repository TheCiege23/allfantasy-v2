import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getReferralStats } from "@/lib/referral"

export const runtime = "nodejs"

export async function GET() {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const stats = await getReferralStats(session.user.id)
  return NextResponse.json({ ok: true, stats })
}
