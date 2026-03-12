import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  req: NextRequest,
  { params }: { params: { leagueId: string } },
) {
  try {
    const { leagueId } = params
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const pageSize = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") || "50", 10)))
    const aroundEntryId = searchParams.get("aroundEntryId") || null

    const league = await prisma.bracketLeague.findUnique({
      where: { id: leagueId },
      select: { id: true, name: true, tournamentId: true },
    })
    if (!league) {
      return NextResponse.json({ error: "League not found" }, { status: 404 })
    }

    const baseWhere: any = {
      tournamentId: league.tournamentId,
      leagueId,
    }

    let offset = (page - 1) * pageSize

    if (aroundEntryId) {
      const target = await prisma.bracketLeaderboard.findUnique({
        where: {
          tournamentId_leagueId_entryId: {
            tournamentId: league.tournamentId,
            leagueId,
            entryId: aroundEntryId,
          },
        },
        select: { rank: true },
      })
      if (target) {
        const centerRank = target.rank
        offset = Math.max(0, centerRank - Math.floor(pageSize / 2))
      }
    }

    const [totalCount, rows] = await Promise.all([
      prisma.bracketLeaderboard.count({ where: baseWhere }),
      prisma.bracketLeaderboard.findMany({
        where: baseWhere,
        orderBy: [{ rank: "asc" }],
        skip: offset,
        take: pageSize,
      }),
    ])

    if (!rows.length) {
      return NextResponse.json({
        ok: true,
        league,
        totalEntries: totalCount,
        page,
        totalPages: totalCount ? Math.ceil(totalCount / pageSize) : 0,
        rows: [],
      })
    }

    const entryIds = rows.map((r) => r.entryId)
    const [entries, healthSnaps] = await Promise.all([
      prisma.bracketEntry.findMany({
        where: { id: { in: entryIds } },
        include: {
          user: { select: { id: true, displayName: true, avatarUrl: true } },
        },
      }),
      prisma.bracketHealthSnapshot.findMany({
        where: {
          tournamentId: league.tournamentId,
          leagueId,
          entryId: { in: entryIds },
        },
        select: {
          entryId: true,
          healthScore: true,
        },
      }),
    ])
    const entryById = new Map(entries.map((e) => [e.id, e]))
    const healthByEntry = new Map(healthSnaps.map((h) => [h.entryId, h.healthScore]))

    const result = rows.map((r) => {
      const e = entryById.get(r.entryId)
      const healthScore = healthByEntry.get(r.entryId) ?? null
      return {
        entryId: r.entryId,
        rank: r.rank,
        previousRank: r.previousRank,
        tieGroup: r.tieGroup,
        score: r.score,
        username: e?.user?.displayName ?? null,
        avatarUrl: e?.user?.avatarUrl ?? null,
        healthScore,
        updatedAt: r.updatedAt,
      }
    })

    return NextResponse.json({
      ok: true,
      league,
      totalEntries: totalCount,
      page,
      totalPages: totalCount ? Math.ceil(totalCount / pageSize) : 0,
      rows: result,
    })
  } catch (err: any) {
    console.error("[leaderboard/league] Error:", err)
    return NextResponse.json(
      { error: err?.message || "Failed to fetch league leaderboard" },
      { status: 500 },
    )
  }
}

