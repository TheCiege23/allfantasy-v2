import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveOrCreateLegacyUser } from "@/lib/legacy-user-resolver";
import { linkAfUserToLegacy } from "@/lib/legacy/linkAfUserToLegacy";
import { processImportJob } from "@/lib/import/processImportJob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const LAUNCH_YEAR = 2017;

type SleeperUserApi = {
  user_id?: string;
  display_name?: string;
  username?: string;
};

function abortAfter(ms: number): AbortSignal {
  if (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(ms);
  }
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

/**
 * Fast response: resolve Sleeper user, discover NFL seasons (2017→current), create job, background import.
 * `LegacyImportJob.userId` must reference `LegacyUser`; `appUserId` is the logged-in App user.
 */
export async function POST(req: Request) {
  try {
    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const raw =
      (typeof body.username === "string" && body.username) ||
      (typeof body.sleeperUsername === "string" && body.sleeperUsername) ||
      "";
    const sleeperUsername = raw.trim();
    if (!sleeperUsername) {
      return NextResponse.json({ error: "Username required" }, { status: 400 });
    }

    const session = (await getServerSession(authOptions as never)) as {
      user?: { id?: string };
    } | null;
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const userRes = await fetch(`https://api.sleeper.app/v1/user/${encodeURIComponent(sleeperUsername)}`, {
      signal: abortAfter(5000),
      headers: { "User-Agent": "AllFantasy/1.0", Accept: "application/json" },
    });
    if (!userRes.ok) {
      return NextResponse.json({ error: "Sleeper user not found" }, { status: 404 });
    }
    const sleeperUser = (await userRes.json()) as SleeperUserApi;
    const sleeperUserId = sleeperUser.user_id;
    if (!sleeperUserId) {
      return NextResponse.json({ error: "Sleeper user not found" }, { status: 404 });
    }

    await prisma.userProfile
      .upsert({
        where: { userId },
        update: {
          sleeperUsername: sleeperUser.username ?? sleeperUsername,
          sleeperUserId,
          sleeperLinkedAt: new Date(),
        },
        create: {
          userId,
          sleeperUsername: sleeperUser.username ?? sleeperUsername,
          sleeperUserId,
          sleeperLinkedAt: new Date(),
        },
      })
      .catch(() => {});

    const resolvedLegacy = await resolveOrCreateLegacyUser(sleeperUsername);
    if (!resolvedLegacy) {
      return NextResponse.json({ error: "Could not resolve Sleeper legacy profile for this username." }, { status: 502 });
    }
    const linkedLegacy = await linkAfUserToLegacy(userId, resolvedLegacy, { skipComputeRank: true });
    if (!linkedLegacy.ok) {
      return linkedLegacy.response;
    }

    const currentYear = new Date().getFullYear();
    const seasons: number[] = [];
    for (let year = LAUNCH_YEAR; year <= currentYear; year++) {
      try {
        const r = await fetch(
          `https://api.sleeper.app/v1/user/${encodeURIComponent(sleeperUserId)}/leagues/nfl/${year}`,
          { signal: abortAfter(4000), headers: { "User-Agent": "AllFantasy/1.0", Accept: "application/json" } },
        );
        const data = r.ok ? await r.json() : [];
        if (Array.isArray(data) && data.length > 0) seasons.push(year);
      } catch {
        /* skip year */
      }
    }

    if (seasons.length === 0) {
      return NextResponse.json({ error: "No leagues found" }, { status: 404 });
    }

    const job = await prisma.legacyImportJob.create({
      data: {
        userId: resolvedLegacy.id,
        appUserId: userId,
        status: "running",
        progress: 0,
        totalSeasons: seasons.length,
        seasonsCompleted: 0,
        totalLeaguesSaved: 0,
        startedAt: new Date(),
      },
    });

    try {
      await prisma.importJobSeason.createMany({
        data: seasons.map((season) => ({
          jobId: job.id,
          season,
          status: "pending",
        })),
      });
    } catch (e: unknown) {
      console.warn("[import] importJobSeason seed:", e);
    }

    void processImportJob(job.id, userId, sleeperUserId, seasons).catch((e: unknown) => {
      console.error("[import] bg worker error:", e);
      return prisma.legacyImportJob
        .update({
          where: { id: job.id },
          data: {
            status: "error",
            error: e instanceof Error ? e.message : String(e),
            completedAt: new Date(),
          },
        })
        .catch(() => null);
    });

    return NextResponse.json({
      success: true,
      jobId: job.id,
      totalSeasons: seasons.length,
      seasons,
      message: `Found ${seasons.length} seasons to import`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Import failed";
    console.error("[import] error:", msg);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
