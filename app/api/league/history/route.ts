import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeAllTimeStandings } from "@/lib/league/history-aggregates";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null;
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const leagueId = req.nextUrl.searchParams.get("leagueId")?.trim();
  if (!leagueId) {
    return NextResponse.json({ error: "leagueId required" }, { status: 400 });
  }

  const league = await prisma.league.findFirst({
    where: { id: leagueId },
    select: { userId: true },
  });
  if (!league) {
    return NextResponse.json({ error: "League not found" }, { status: 404 });
  }

  const isOwner = league.userId === userId;
  if (!isOwner) {
    const member = await prisma.leagueTeam.findFirst({
      where: { leagueId, claimedByUserId: userId },
      select: { id: true },
    });
    if (!member) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const seasons = await prisma.leagueSeason.findMany({
    where: { leagueId },
    orderBy: { season: "desc" },
  });

  const allTimeStandings = computeAllTimeStandings(seasons);

  return NextResponse.json({
    seasons,
    allTimeStandings,
  });
}
