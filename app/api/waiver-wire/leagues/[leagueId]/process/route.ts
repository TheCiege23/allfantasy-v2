import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { processWaiverClaimsForLeague } from "@/lib/waiver-wire"

/**
 * POST: run waiver processing for the league (cron or commissioner).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { leagueId: string } }
) {
  const session = await getServerSession(authOptions as any)
  const userId = (session?.user as any)?.id
  const leagueId = params.leagueId

  const league = await (prisma as any).league.findFirst({
    where: { id: leagueId },
    select: { userId: true },
  })
  if (!league) return NextResponse.json({ error: "League not found" }, { status: 404 })

  if (league.userId !== userId) {
    const cronSecret = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("cronSecret")
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  const results = await processWaiverClaimsForLeague(leagueId)
  return NextResponse.json({ status: "ok", processed: results.length, results })
}
