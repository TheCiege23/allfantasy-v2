import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tournamentId = searchParams.get("tournamentId")
    const nodeId = searchParams.get("nodeId")
    const leagueId = searchParams.get("leagueId")
    const scopeParam = searchParams.get("scope") || "global"

    if (!tournamentId || !nodeId) {
      return NextResponse.json(
        { error: "tournamentId and nodeId are required" },
        { status: 400 },
      )
    }

    const scope = scopeParam === "league" && leagueId ? "league" : "global"

    const where: any = {
      tournamentId,
      nodeId,
      scope,
    }
    if (scope === "league") {
      where.leagueId = leagueId
    } else {
      where.leagueId = null
    }

    const rows = await prisma.bracketPickPopularity.findMany({
      where,
      orderBy: { pickCount: "desc" },
    })

    if (!rows.length) {
      return NextResponse.json({
        ok: true,
        scope,
        tournamentId,
        nodeId,
        popularity: [],
      })
    }

    const popularity = rows.map((r) => ({
      teamName: r.teamName,
      pickCount: r.pickCount,
      pickPct: Math.round(r.pickPct * 10) / 10,
    }))

    return NextResponse.json({
      ok: true,
      scope,
      tournamentId,
      nodeId,
      popularity,
    })
  } catch (err: any) {
    console.error("[bracket/popularity] Error:", err)
    return NextResponse.json(
      { error: "Failed to load popularity" },
      { status: 500 },
    )
  }
}

