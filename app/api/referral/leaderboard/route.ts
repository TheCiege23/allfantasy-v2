import { NextRequest, NextResponse } from "next/server"
import { getReferralLeaderboard } from "@/lib/referral"
import type { LeaderboardSort } from "@/lib/referral"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const sortBy = (req.nextUrl.searchParams.get("sortBy") as LeaderboardSort) || "signups"
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit")) || 50, 100)

  const entries = await getReferralLeaderboard({ limit, sortBy })
  return NextResponse.json({ ok: true, leaderboard: entries })
}
