import { NextResponse } from "next/server";
import { LeagueSport } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireVerifiedUser } from "@/lib/auth-guard";
import {
  processLeague,
  upsertSleeperLeagueMetadataOnly,
  type SleeperLeague,
} from "@/lib/league/sleeper-import-process";
import { upsertPlatformIdentity, isPlatformRankLocked, lockPlatformRank } from "@/lib/platform-identity";
import { computeAndSaveRank } from "@/lib/ranking/computeAndSaveRank";
import { refreshUserRankingsContext } from "@/lib/rankings/refreshUserContext";
import { syncLeagueHistory } from "@/lib/league/syncLeagueHistory";
import {
  consumeRateLimit,
  getClientIp,
  buildRateLimit429,
} from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Vercel Pro / Enterprise: extend serverless timeout for multi-year Sleeper scans. */
export const maxDuration = 60;

const SLEEPER_LAUNCH_YEAR = 2017;

const sportMap: Record<"nfl" | "nba", LeagueSport> = {
  nfl: LeagueSport.NFL,
  nba: LeagueSport.NBA,
};

type SleeperLeagueWithMeta = SleeperLeague & { _year: number; _sport: "nfl" | "nba" };

function getSleeperAvatarUrl(avatar: string | null | undefined): string | null {
  if (!avatar) return null;
  return `https://sleepercdn.com/avatars/${avatar}`;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function buildYearRange(): number[] {
  const currentYear = new Date().getFullYear();
  const len = currentYear - SLEEPER_LAUNCH_YEAR + 2;
  return Array.from({ length: len }, (_, i) => SLEEPER_LAUNCH_YEAR + i);
}

async function fetchUserLeaguesForYear(
  sleeperUserId: string,
  sport: "nfl" | "nba",
  year: number
): Promise<SleeperLeagueWithMeta[]> {
  const url = `https://api.sleeper.app/v1/user/${encodeURIComponent(sleeperUserId)}/leagues/${sport}/${year}`;
  const rows = await fetchJson<SleeperLeague[]>(url);
  if (!Array.isArray(rows)) return [];
  return rows.map((l) => ({ ...l, _year: year, _sport: sport }));
}

/** All NFL/NBA × years concurrently to stay under Vercel timeouts. */
async function fetchAllSleeperLeaguesParallel(sleeperUserId: string): Promise<SleeperLeagueWithMeta[]> {
  const years = buildYearRange();
  const sports: ("nfl" | "nba")[] = ["nfl", "nba"];
  const requests = sports.flatMap((sport) => years.map((year) => ({ sport, year })));

  const allResults = await Promise.allSettled(
    requests.map(({ sport, year }) => fetchUserLeaguesForYear(sleeperUserId, sport, year))
  );

  const flat: SleeperLeagueWithMeta[] = [];
  for (const r of allResults) {
    if (r.status === "fulfilled") flat.push(...r.value);
  }
  return flat;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    console.log("[import] body:", JSON.stringify(body));

    const rawUsername = body.username ?? body.sleeperUsername ?? body.sleeper_username;
    const platform = typeof body.platform === "string" ? body.platform : "sleeper";

    if (platform !== "sleeper") {
      return NextResponse.json({ error: "Only Sleeper imports are supported in this endpoint." }, { status: 400 });
    }

    if (!rawUsername || typeof rawUsername !== "string") {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    const username = rawUsername.trim();
    if (!username || username.length > 100) {
      return NextResponse.json({ error: "Invalid username" }, { status: 400 });
    }

    const auth = await requireVerifiedUser();
    if (!auth.ok) {
      return auth.response;
    }
    const userId = auth.userId;
    const ip = getClientIp(req);

    const rl = consumeRateLimit({
      scope: "import",
      action: "sleeper_multi_year",
      ip,
      maxRequests: 3,
      windowMs: 60 * 1000,
    });
    if (!rl.success) {
      return NextResponse.json(buildRateLimit429({ rl }), { status: 429 });
    }

    console.log("[import] Starting for user:", userId, "username:", username);

    const profileUrl = `https://api.sleeper.app/v1/user/${encodeURIComponent(username)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let sleeperProfile: {
      user_id?: string;
      username?: string;
      display_name?: string;
      avatar?: string | null;
    };
    try {
      const sleeperUserRes = await fetch(profileUrl, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!sleeperUserRes.ok) {
        return NextResponse.json(
          { error: "Sleeper user not found. Check your username." },
          { status: 404 }
        );
      }
      sleeperProfile = (await sleeperUserRes.json()) as typeof sleeperProfile;
    } catch (err: unknown) {
      clearTimeout(timeout);
      console.error("[import] Sleeper profile fetch failed:", err);
      return NextResponse.json(
        { error: "Could not reach Sleeper. Try again." },
        { status: 502 }
      );
    }

    if (!sleeperProfile?.user_id) {
      return NextResponse.json(
        { error: "Could not find Sleeper account for that username." },
        { status: 404 }
      );
    }

    const sleeperUserId = sleeperProfile.user_id;
    console.log("[import] Sleeper user_id:", sleeperUserId);

    await prisma.userProfile.upsert({
      where: { userId },
      update: {
        sleeperUserId,
        sleeperUsername: sleeperProfile.username ?? username,
        sleeperLinkedAt: new Date(),
      },
      create: {
        userId,
        sleeperUserId,
        sleeperUsername: sleeperProfile.username ?? username,
        sleeperLinkedAt: new Date(),
      },
    });

    const flat = await fetchAllSleeperLeaguesParallel(sleeperUserId);
    console.log("[import] Total leagues found:", flat.length);

    const sportCounts: Record<string, number> = {};
    for (const l of flat) {
      const s = (l._sport || "nfl").toUpperCase();
      sportCounts[s] = (sportCounts[s] || 0) + 1;
    }
    const uniqueSeasons = new Set(flat.map((l) => l._year)).size;
    const yearsList = [...new Set(flat.map((l) => l._year))].sort((a, b) => a - b);

    if (flat.length === 0) {
      await refreshUserRankingsContext(userId);
      return NextResponse.json({
        success: true,
        imported: 0,
        scannedRows: 0,
        uniqueLeagues: 0,
        seasons: 0,
        years: [] as number[],
        sports: {} as Record<string, number>,
        leagues: [] as { name: string; sport: string; seasons: string[] }[],
        sleeperUserId,
      });
    }

    const byLeagueId = new Map<string, SleeperLeagueWithMeta[]>();
    for (const league of flat) {
      const id = league.league_id?.toString();
      if (!id) continue;
      const arr = byLeagueId.get(id) ?? [];
      arr.push(league);
      byLeagueId.set(id, arr);
    }

    let seasonRows = 0;
    const leagueSummaries: { name: string; sport: string; seasons: string[] }[] = [];
    const historySyncJobs: { leagueId: string; platformLeagueId: string }[] = [];

    for (const [, versions] of byLeagueId) {
      const sorted = [...versions].sort((a, b) => a._year - b._year);
      const latest = sorted[sorted.length - 1];
      const sportKey = latest._sport;
      const sportLabel = sportMap[sportKey];

      const seasonLabels = [...new Set(sorted.map((v) => String(v._year)))].sort(
        (a, b) => Number(a) - Number(b)
      );
      leagueSummaries.push({
        name: latest.name || "Unnamed League",
        sport: sportLabel,
        seasons: seasonLabels,
      });

      for (let i = 0; i < sorted.length - 1; i++) {
        const v = sorted[i];
        const { _year, _sport, ...rest } = v;
        void _sport;
        await upsertSleeperLeagueMetadataOnly(rest, userId, _year, sportLabel);
        seasonRows += 1;
      }

      const last = sorted[sorted.length - 1];
      const { _year, _sport, ...rest } = last;
      void _sport;
      const processed = await processLeague(rest, userId, _year, sportLabel).catch((err) => {
        console.error(`[leagues/import] processLeague ${last.league_id}:`, err);
        return null;
      });
      if (processed) {
        seasonRows += 1;
      } else {
        await upsertSleeperLeagueMetadataOnly(rest, userId, _year, sportLabel);
        seasonRows += 1;
      }

      const sleeperPid = String(last.league_id);
      const row = await prisma.league.findUnique({
        where: {
          userId_platform_platformLeagueId_season: {
            userId,
            platform: "sleeper",
            platformLeagueId: sleeperPid,
            season: _year,
          },
        },
        select: { id: true },
      });
      if (row) {
        historySyncJobs.push({ leagueId: row.id, platformLeagueId: sleeperPid });
      }
    }

    const uniqueLeagues = byLeagueId.size;

    try {
      await upsertPlatformIdentity({
        afUserId: userId,
        platform: "sleeper",
        platformUserId: sleeperProfile.user_id,
        platformUsername: sleeperProfile.username ?? username,
        displayName: sleeperProfile.display_name ?? sleeperProfile.username ?? username,
        avatarUrl: getSleeperAvatarUrl(sleeperProfile.avatar) ?? undefined,
        sport: "nfl",
      });

      const legacyUser = await prisma.legacyUser.findUnique({
        where: { sleeperUserId },
        select: { id: true },
      });
      const isLocked = await isPlatformRankLocked(userId, "sleeper");
      if (!isLocked && legacyUser) {
        await computeAndSaveRank(userId, legacyUser);
        await lockPlatformRank(userId, "sleeper");
      }
    } catch (err) {
      console.error("[leagues/import] rank lock error:", err);
    }

    await refreshUserRankingsContext(userId);

    for (const job of historySyncJobs) {
      void syncLeagueHistory(job.leagueId, job.platformLeagueId, userId).catch((err) =>
        console.error(`[leagues/import] History sync failed for ${job.platformLeagueId}:`, err)
      );
    }

    return NextResponse.json({
      success: true,
      imported: flat.length,
      scannedRows: flat.length,
      uniqueLeagues,
      seasons: uniqueSeasons,
      years: yearsList,
      sports: sportCounts,
      seasonRows,
      leagues: leagueSummaries,
      sleeperUserId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Import failed";
    const stack = err instanceof Error ? err.stack?.slice(0, 300) : undefined;
    console.error("[import] ERROR:", message, stack);
    return NextResponse.json({ error: message || "Import failed" }, { status: 500 });
  }
}
