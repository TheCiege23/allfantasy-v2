import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveOrCreateLegacyUser } from "@/lib/legacy-user-resolver";
import { linkAfUserToLegacy } from "@/lib/legacy/linkAfUserToLegacy";

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
 * Fast phase: discover NFL seasons (2017→current), create `LegacyImportJob`, background `processImportJob`.
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
    const username = raw.trim();
    if (!username) {
      return NextResponse.json({ error: "Sleeper username is required" }, { status: 400 });
    }

    const session = (await getServerSession(authOptions as never)) as {
      user?: { id?: string };
    } | null;
    if (!session?.user?.id) {
      return NextResponse.json({ error: "You must be logged in to import" }, { status: 401 });
    }
    const appUserId = session.user.id;

    const userRes = await fetch(`https://api.sleeper.app/v1/user/${encodeURIComponent(username)}`, {
      signal: abortAfter(5000),
      headers: { "User-Agent": "AllFantasy/1.0", Accept: "application/json" },
    });
    if (!userRes.ok) {
      return NextResponse.json(
        { error: `Sleeper account "${username}" not found. Double-check your username at sleeper.app.` },
        { status: 404 },
      );
    }
    const sleeperUser = (await userRes.json()) as SleeperUserApi;
    const sleeperUserId = sleeperUser?.user_id;
    if (!sleeperUserId) {
      return NextResponse.json(
        { error: `Sleeper account "${username}" not found. Double-check your username at sleeper.app.` },
        { status: 404 },
      );
    }

    try {
      await prisma.userProfile.upsert({
        where: { userId: appUserId },
        update: {
          sleeperUserId,
          sleeperUsername: sleeperUser.username ?? username,
          sleeperLinkedAt: new Date(),
        },
        create: {
          userId: appUserId,
          sleeperUserId,
          sleeperUsername: sleeperUser.username ?? username,
          sleeperLinkedAt: new Date(),
        },
      });
    } catch (e: unknown) {
      console.warn("[import] Could not save sleeperUserId:", e);
    }

    const resolvedLegacy = await resolveOrCreateLegacyUser(username);
    if (!resolvedLegacy) {
      return NextResponse.json(
        { error: "Could not resolve Sleeper legacy profile for this username." },
        { status: 502 },
      );
    }
    const linkedLegacy = await linkAfUserToLegacy(appUserId, resolvedLegacy, { skipComputeRank: true });
    if (!linkedLegacy.ok) {
      return linkedLegacy.response;
    }

    const legacyUserId = resolvedLegacy.id;
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let y = LAUNCH_YEAR; y <= currentYear; y++) years.push(y);

    const seasonChecks = await Promise.all(
      years.map(async (year) => {
        try {
          const res = await fetch(
            `https://api.sleeper.app/v1/user/${encodeURIComponent(sleeperUserId)}/leagues/nfl/${year}`,
            { signal: abortAfter(4000), headers: { "User-Agent": "AllFantasy/1.0", Accept: "application/json" } },
          );
          const data = res.ok ? await res.json() : [];
          if (Array.isArray(data) && data.length > 0) return year;
        } catch {
          /* skip */
        }
        return null;
      }),
    );

    const seasons = seasonChecks.filter((y): y is number => y != null).sort((a, b) => a - b);

    if (seasons.length === 0) {
      return NextResponse.json(
        { error: "No Sleeper NFL leagues found for this account between 2017 and the current season." },
        { status: 404 },
      );
    }

    const job = await prisma.legacyImportJob.create({
      data: {
        userId: legacyUserId,
        appUserId,
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

    void import("@/lib/import/processImportJob")
      .then((m) =>
        m.processImportJob(job.id, appUserId, sleeperUserId, seasons).catch((e: unknown) => {
          console.error("[import] bg error:", e);
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
        }),
      )
      .catch((e: unknown) => console.error("[import] bg load error:", e));

    return NextResponse.json({
      success: true,
      jobId: job.id,
      totalSeasons: seasons.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[import] Fatal error:", message);
    return NextResponse.json({ error: message || "Import failed" }, { status: 500 });
  }
}
