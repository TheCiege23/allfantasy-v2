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
        faabBalance: true,
      },
    })

    const balance = roster?.faabBalance ?? 100

    return NextResponse.json({ balance })
  } catch (error) {
    console.error("Failed to fetch balance:", error)
    return NextResponse.json(
      { error: "Failed to fetch balance" },
      { status: 500 }
    )
  }
}