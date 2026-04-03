import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncLeagueHistory } from "@/lib/league/syncLeagueHistory";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
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
    select: { id: true, platform: true, platformLeagueId: true, userId: true },
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

  if (league.platform !== "sleeper" || !league.platformLeagueId) {
    return NextResponse.json({ error: "History sync is only available for Sleeper leagues" }, { status: 400 });
  }

  try {
    const summary = await syncLeagueHistory(league.id, league.platformLeagueId, userId);
    return NextResponse.json({ success: true, ...summary });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sync failed";
    console.error("[sync-history]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
