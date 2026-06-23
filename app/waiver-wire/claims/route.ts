import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const leagueId = searchParams.get("leagueId")

  if (!leagueId) {
    return NextResponse.json({ error: "League ID required" }, { status: 400 })
  }

  try {
    const roster = await prisma.redraftRoster.findFirst({
      where: {
        season: {
          leagueId: leagueId,
        },
        ownerId: session.user.id,
      },
      select: {
        id: true,
      },
    })

    if (!roster) {
      return NextResponse.json({ claims: [] })
    }

    const claims = await prisma.redraftWaiverClaim.findMany({
      where: {
        rosterId: roster.id,
        leagueId: leagueId,
      },
      orderBy: {
        submittedAt: "desc",
      },
      take: 10,
      select: {
        id: true,
        addPlayerId: true,
        addPlayerName: true,
        bidAmount: true,
        status: true,
        submittedAt: true,
      },
    })

    const formattedClaims = claims.map((c: any) => ({
      id: c.id,
      playerId: c.addPlayerId,
      playerName: c.addPlayerName || "Unknown",
      bidAmount: c.bidAmount || 0,
      status: c.status || "pending",
      createdAt: c.submittedAt,
    }))

    return NextResponse.json({ claims: formattedClaims })
  } catch (error) {
    console.error("Failed to fetch claims:", error)
    return NextResponse.json(
      { error: "Failed to fetch claims" },
      { status: 500 }
    )
  }
}