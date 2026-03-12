import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tournamentId = searchParams.get("tournamentId")
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const pageSize = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") || "50", 10)))
    const aroundEntryId = searchParams.get("aroundEntryId") || null

    if (!tournamentId) {
      return NextResponse.json({ error: "tournamentId is required" }, { status: 400 })
    }

    const tournament = await prisma.bracketTournament.findUnique({
      where: { id: tournamentId },
      select: { id: true, name: true, season: true },
    })
    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 })
    }

    const baseWhere: any = {
      tournamentId,
      leagueId: null,
    }

    let offset = (page - 1) * pageSize

    if (aroundEntryId) {
      const target = await prisma.bracketLeaderboard.findUnique({
        where: {
          tournamentId_leagueId_entryId: {
            tournamentId,
            leagueId: null,
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
        tournament,
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
          league: { select: { id: true, name: true } },
        },
      }),
      prisma.bracketHealthSnapshot.findMany({
        where: {
          tournamentId,
          entryId: { in: entryIds },
        },
        select: {
          entryId: true,
          leagueId: true,
          healthScore: true,
        },
      }),
    ])
    const entryById = new Map(entries.map((e) => [e.id, e]))
    const healthByEntry = new Map(
      healthSnaps.map((h) => [`${h.leagueId}:${h.entryId}`, h.healthScore]),
    )

    const result = rows.map((r) => {
      const e = entryById.get(r.entryId)
      const leagueIdForRow = e?.league?.id ?? null
      const healthScore =
        leagueIdForRow != null
          ? healthByEntry.get(`${leagueIdForRow}:${r.entryId}`) ?? null
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
      tournament,
      totalEntries: totalCount,
      page,
      totalPages: totalCount ? Math.ceil(totalCount / pageSize) : 0,
      rows: result,
    })
  } catch (err: any) {
    console.error("[leaderboard/global] Error:", err)
    return NextResponse.json(
      { error: err?.message || "Failed to fetch global leaderboard" },
      { status: 500 },
    )
  }
}

