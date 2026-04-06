import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runLeagueImportDetailSync, type LeagueImportKey } from "@/lib/leagues/runLeagueImportDetailSync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const session = (await getServerSession(authOptions as never)) as {
      user?: { id?: string };
    } | null;
    if (!session?.user?.id) {
      return NextResponse.json({ error: "You must be logged in" }, { status: 401 });
    }
    const userId = session.user.id;

    let body: { leagueKeys?: unknown };
    try {
      body = (await req.json()) as { leagueKeys?: unknown };
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const rawKeys = body.leagueKeys;
    if (!Array.isArray(rawKeys) || rawKeys.length === 0) {
      return NextResponse.json({ error: "leagueKeys array required" }, { status: 400 });
    }

    const leagueKeys: LeagueImportKey[] = [];
    for (const entry of rawKeys) {
      if (!entry || typeof entry !== "object") continue;
      const o = entry as Record<string, unknown>;
      const platformLeagueId =
        typeof o.platformLeagueId === "string"
          ? o.platformLeagueId
          : typeof o.leagueId === "string"
            ? o.leagueId
            : null;
      const season = typeof o.season === "number" ? o.season : Number(o.season);
      if (!platformLeagueId || !Number.isFinite(season)) continue;
      leagueKeys.push({ platformLeagueId, season });
    }

    if (leagueKeys.length === 0) {
      return NextResponse.json({ error: "No valid league keys" }, { status: 400 });
    }

    const appUser = await prisma.appUser.findUnique({
      where: { id: userId },
      select: {
        legacyUserId: true,
      },
    });
    if (!appUser?.legacyUserId) {
      return NextResponse.json({ error: "Legacy profile not linked" }, { status: 400 });
    }

    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { sleeperUserId: true },
    });
    const sleeperUserId = profile?.sleeperUserId;
    if (!sleeperUserId) {
      return NextResponse.json({ error: "Sleeper user id missing on profile" }, { status: 400 });
    }

    await runLeagueImportDetailSync({
      userId,
      legacyUserId: appUser.legacyUserId,
      sleeperUserId,
      leagueKeys,
    });

    return NextResponse.json({ success: true, synced: leagueKeys.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[import/sync]", err);
    return NextResponse.json({ error: message || "Sync failed" }, { status: 500 });
  }
}
