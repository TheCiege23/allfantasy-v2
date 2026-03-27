import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getReferralDashboardData } from "@/lib/referral"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function getBaseUrl(req: NextRequest): string {
  return process.env.NEXTAUTH_URL ?? req.nextUrl?.origin ?? "https://allfantasy.ai"
}

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const dashboard = await getReferralDashboardData(session.user.id, getBaseUrl(req))
  return NextResponse.json({ ok: true, dashboard })
}
