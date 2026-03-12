import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tournamentId = searchParams.get("tournamentId")
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const pageSize = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") || "50", 10)))

    if (!tournamentId) {
      return NextResponse.json({ error: "tournamentId is required" }, { status: 400 })
    }

    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id as string | undefined
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const followees = await prisma.userFollow.findMany({
      where: { followerId: userId },
      select: { followeeId: true },
    })
    const friendIds = followees.map((f) => f.followeeId)
    friendIds.push(userId)

    if (!friendIds.length) {
      return NextResponse.json({
        ok: true,
        totalEntries: 0,
        page,
        totalPages: 0,
        rows: [],
      })
    }

    const leagues = await prisma.bracketLeague.findMany({
      where: { tournamentId },
      select: { id: true },
    })
    const leagueIds = leagues.map((l) => l.id)

    if (!leagueIds.length) {
      return NextResponse.json({
        ok: true,
        totalEntries: 0,
        page,
        totalPages: 0,
        rows: [],
      })
    }

    const entries = await prisma.bracketEntry.findMany({
      where: {
        leagueId: { in: leagueIds },
        userId: { in: friendIds },
        status: { notIn: ["DRAFT", "INVALIDATED"] },
      },
      select: { id: true },
    })
    const entryIds = entries.map((e) => e.id)

    if (!entryIds.length) {
      return NextResponse.json({
        ok: true,
        totalEntries: 0,
        page,
        totalPages: 0,
        rows: [],
      })
    }

    const [totalCount, rows] = await Promise.all([
      prisma.bracketLeaderboard.count({
        where: {
          tournamentId,
          entryId: { in: entryIds },
        },
      }),
      prisma.bracketLeaderboard.findMany({
        where: {
          tournamentId,
          entryId: { in: entryIds },
        },
        orderBy: [{ rank: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    const detailedEntries = await prisma.bracketEntry.findMany({
      where: { id: { in: rows.map((r) => r.entryId) } },
      include: {
        user: { select: { id: true, displayName: true, avatarUrl: true } },
        league: { select: { id: true, name: true, tournamentId: true } },
      },
    })
    const byId = new Map(detailedEntries.map((e) => [e.id, e]))

    const healthSnaps = await prisma.bracketHealthSnapshot.findMany({
      where: {
        tournamentId,
        entryId: { in: rows.map((r) => r.entryId) },
      },
      select: {
        entryId: true,
        leagueId: true,
        healthScore: true,
      },
    })
    const healthByKey = new Map(
      healthSnaps.map((h) => [`${h.leagueId}:${h.entryId}`, h.healthScore]),
    )

    const result = rows.map((r) => {
      const e = byId.get(r.entryId)
      const leagueIdForRow = e?.league?.id ?? null
      const healthScore =
        leagueIdForRow != null
          ? healthByKey.get(`${leagueIdForRow}:${r.entryId}`) ?? null
          : null
      return {
        entryId: r.entryId,
        rank: r.rank,
        previousRank: r.previousRank,
        tieGroup: r.tieGroup,
        score: r.score,
        username: e?.user?.displayName ?? null,
        avatarUrl: e?.user?.avatarUrl ?? null,
        leagueId: e?.league?.id ?? null,
        leagueName: e?.league?.name ?? null,
        healthScore,
        updatedAt: r.updatedAt,
      }
    })

    return NextResponse.json({
      ok: true,
      totalEntries: totalCount,
      page,
      totalPages: totalCount ? Math.ceil(totalCount / pageSize) : 0,
      rows: result,
    })
  } catch (err: any) {
    console.error("[leaderboard/friends] Error:", err)
    return NextResponse.json(
      { error: err?.message || "Failed to fetch friends leaderboard" },
      { status: 500 },
    )
  }
}

