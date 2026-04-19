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
      select: { id: true, platform: true, platformLeagueId: true },
    });

    const sleeperLeague = await prisma.sleeperLeague.findFirst({
      where: { id, userId },
      select: { id: true, sleeperLeagueId: true },
    });

    const tournament = await prisma.legacyTournament.findFirst({
      where: { id, creatorId: userId },
      select: { id: true },
    });

    if (!league && !sleeperLeague && !tournament) {
      return NextResponse.json({
        ok: true,
        removed: {
          leagueRows: 0,
          sleeperLeagueRows: 0,
          tournamentRows: 0,
        },
      });
    }

    const normalizedPlatform = String(league?.platform ?? "").toLowerCase();
    const linkedSleeperLeagueId =
      normalizedPlatform === "sleeper" && typeof league?.platformLeagueId === "string"
        ? league.platformLeagueId
        : sleeperLeague?.sleeperLeagueId ?? null;

    const [deletedLeagueRows, deletedSleeperRows, deletedTournamentRows] =
      await prisma.$transaction([
        prisma.league.deleteMany({
          where: {
            userId,
            OR: [
              { id },
              ...(linkedSleeperLeagueId
                ? [
                    {
                      platform: "sleeper",
                      platformLeagueId: linkedSleeperLeagueId,
                    },
                  ]
                : []),
            ],
          },
        }),
        prisma.sleeperLeague.deleteMany({
          where: {
            userId,
            OR: [
              { id },
              ...(linkedSleeperLeagueId
                ? [{ sleeperLeagueId: linkedSleeperLeagueId }]
                : []),
            ],
          },
        }),
        // Dashboard reader also surfaces `LegacyTournament` rows as leagues (tournament hubs).
        // If we leave them, a deleted "league" can re-appear on refresh as its tournament row.
        // Scope by `creatorId` to mirror the reader and avoid touching other users' rows.
        prisma.legacyTournament.deleteMany({
          where: {
            creatorId: userId,
            id,
          },
        }),
      ]);

    return NextResponse.json({
      ok: true,
      removed: {
        leagueRows: deletedLeagueRows.count,
        sleeperLeagueRows: deletedSleeperRows.count,
        tournamentRows: deletedTournamentRows.count,
      },
    });
  } catch (e: unknown) {
    console.error("[api/league/[leagueId] DELETE]", e);
    return NextResponse.json(
      { error: "Could not remove league. It may still be in use elsewhere." },
      { status: 500 }
    );
  }
}
