import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Remove a league from the signed-in user's dashboard (deletes the user's `League` or `SleeperLeague` row).
 * Does not delete the league on Sleeper or other external platforms.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  try {
    const session = (await getServerSession(authOptions as never)) as {
      user?: { id?: string };
    } | null;
    const userId = session?.user?.id?.trim();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { leagueId } = await params;
    const id = leagueId?.trim();
    if (!id) {
      return NextResponse.json({ error: "leagueId required" }, { status: 400 });
    }

    const league = await prisma.league.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (league) {
      await prisma.league.delete({ where: { id } });
      return NextResponse.json({ ok: true, removed: "league" as const });
    }

    const sleeperLeague = await prisma.sleeperLeague.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (sleeperLeague) {
      await prisma.sleeperLeague.delete({ where: { id } });
      return NextResponse.json({ ok: true, removed: "sleeper_league" as const });
    }

    return NextResponse.json({ error: "League not found" }, { status: 404 });
  } catch (e: unknown) {
    console.error("[api/league/[leagueId] DELETE]", e);
    return NextResponse.json(
      { error: "Could not remove league. It may still be in use elsewhere." },
      { status: 500 }
    );
  }
}
