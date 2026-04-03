import { NextResponse } from "next/server";
import { z } from "zod";
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

const SLEEPER_LAUNCH_YEAR = 2017;

const sportMap: Record<"nfl" | "nba", LeagueSport> = {
  nfl: LeagueSport.NFL,
  nba: LeagueSport.NBA,
};

const bodySchema = z.object({
  username: z.string().min(1).max(100).trim(),
  platform: z.literal("sleeper"),
});

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

async function fetchAllSleeperLeaguesBatched(sleeperUserId: string): Promise<SleeperLeagueWithMeta[]> {
  const years = buildYearRange();
  const sports: ("nfl" | "nba")[] = ["nfl", "nba"];
  const out: SleeperLeagueWithMeta[] = [];

  for (const sport of sports) {
    for (let i = 0; i < years.length; i += 3) {
      const batch = years.slice(i, i + 3);
      const batchResults = await Promise.all(
        batch.map((year) => fetchUserLeaguesForYear(sleeperUserId, sport, year))
      );
      out.push(...batchResults.flat());
    }
  }
  return out;
}

export async function POST(req: Request) {
  try {
    const rawBody = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    console.log("[import] body received:", JSON.stringify(rawBody));

    const usernameRaw =
      (typeof rawBody?.username === "string" ? rawBody.username : null) ??
      (typeof rawBody?.sleeperUsername === "string" ? rawBody.sleeperUsername : null) ??
      (typeof rawBody?.sleeper_username === "string" ? rawBody.sleeper_username : null) ??
      "";
    const usernameTrimmed = usernameRaw.trim();
    console.log("[import] username:", usernameTrimmed);

    if (!usernameTrimmed) {
      console.log("[import] ERROR: no username in body");
      return NextResponse.json({ error: "Username required" }, { status: 400 });
    }

    const parsed = bodySchema.safeParse({
      username: usernameTrimmed,
      platform: "sleeper" as const,
    });
    if (!parsed.success) {
      console.log("[import] validation error:", parsed.error.flatten().fieldErrors);
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { username } = parsed.data;

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

    const sleeperUserUrl = `https://api.sleeper.app/v1/user/${encodeURIComponent(username)}`;
    console.log("[import] fetching Sleeper user:", username);
    const userRes = await fetch(sleeperUserUrl, {
      headers: { Accept: "application/json" },
    });
    console.log("[import] Sleeper user status:", userRes.status);
    const sleeperProfile = (await userRes.json().catch(() => null)) as {
      user_id?: string;
      username?: string;
      display_name?: string;
      avatar?: string | null;
    } | null;
    console.log("[import] Sleeper user data:", JSON.stringify(sleeperProfile));

    if (!sleeperProfile?.user_id) {
      console.log("[import] ERROR: Sleeper user not found");
      return NextResponse.json({ error: "Sleeper username not found" }, { status: 404 });
    }

    const sleeperUserId = sleeperProfile.user_id;

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

    const flat = await fetchAllSleeperLeaguesBatched(sleeperUserId);

    if (flat.length === 0) {
      await refreshUserRankingsContext(userId);
      return NextResponse.json({
        success: true,
        imported: 0,
        seasons: 0,
        years: [] as number[],
        leagues: [] as { name: string; sport: string; seasons: string[] }[],
        sports: {} as Record<string, number>,
        sleeperUserId,
      });
    }

    const yearsWithData = [...new Set(flat.map((l) => l._year))].sort((a, b) => a - b);

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

    const sportsCounts: Record<string, number> = {};
    for (const row of leagueSummaries) {
      const k = String(row.sport);
      sportsCounts[k] = (sportsCounts[k] ?? 0) + 1;
    }

    return NextResponse.json({
      success: true,
      imported: uniqueLeagues,
      seasons: seasonRows,
      years: yearsWithData,
      leagues: leagueSummaries,
      sports: sportsCounts,
      sleeperUserId,
    });
  } catch (error) {
    console.error("[leagues/import]", error);
    const message = error instanceof Error ? error.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
