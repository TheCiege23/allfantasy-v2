import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const matches = await (prisma as any).worldCupBracketMatch.findMany({
      where: { status: { in: ["live", "halftime"] } },
      orderBy: [{ startsAt: "asc" }, { matchNumber: "asc" }],
      take: 20,
      select: {
        id: true,
        challengeId: true,
        round: true,
        matchNumber: true,
        homeTeamName: true,
        awayTeamName: true,
        homeScore: true,
        awayScore: true,
        status: true,
        startsAt: true,
      },
    })

    return NextResponse.json({ matches })
  } catch (error) {
    console.error("[world-cup/live] failed to load live matches", error)
    return NextResponse.json({ matches: [] })
  }
}
