import { NextResponse } from "next/server";
import pLimit from "p-limit";
import { z } from "zod";
import { LeagueSport } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireVerifiedUser } from "@/lib/auth-guard";
import { upsertPlatformIdentity, isPlatformRankLocked, lockPlatformRank } from "@/lib/platform-identity";
import { computeAndSaveRank } from "@/lib/ranking/computeAndSaveRank";
import { refreshUserRankingsContext } from "@/lib/rankings/refreshUserContext";
import { syncLeagueHistory } from "@/lib/league/syncLeagueHistory";
import {
  processLeague,
  cachedSleeperFetch,
  getSleeperAvatarUrl,
  getErrorMessage,
  sumCommentaryTelemetry,
  type SleeperLeague,
  type SleeperUser,
  type MatchupCommentaryTelemetry,
} from "@/lib/league/sleeper-import-process";
import {
  consumeRateLimit,
  getClientIp,
  buildRateLimit429,
} from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CURRENT_IMPORT_SEASON = new Date().getFullYear();

const leagueImportLimit = pLimit(8);

const bodySchema = z.object({
  sleeperUserId: z.string().min(1).max(100),
  sport: z.enum(["nfl", "nba", "mlb"]).default("nfl"),
  season: z.number().int().min(2020).max(2035).default(CURRENT_IMPORT_SEASON),
  isLegacy: z.boolean().default(false),
});

const sportMap: Record<"nfl" | "nba" | "mlb", LeagueSport> = {
  nfl: LeagueSport.NFL,
  nba: LeagueSport.NBA,
  mlb: LeagueSport.MLB,
};

export async function POST(req: Request) {
  try {
    const auth = await requireVerifiedUser();
    if (!auth.ok) {
      return auth.response;
    }
    const userId = auth.userId;

    const ip = getClientIp(req);

    const rl = consumeRateLimit({
      scope: "import",
      action: "sleeper_sync",
      ip,
      maxRequests: 5,
      windowMs: 60 * 1000,
    });

    if (!rl.success) {
      return NextResponse.json(buildRateLimit429({ rl }), { status: 429 });
    }

    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { sleeperUserId, sport, season, isLegacy } = parsed.data;
    const sportLabel = sportMap[sport];

    const leaguesData = await cachedSleeperFetch<SleeperLeague[]>(
      `https://api.sleeper.app/v1/user/${encodeURIComponent(sleeperUserId)}/leagues/${encodeURIComponent(sport)}/${season}`,
      `sleeper:user_leagues:${sleeperUserId}:${sport}:${season}`
    );

    if (!Array.isArray(leaguesData) || leaguesData.length === 0) {
      return NextResponse.json(
        { error: "No leagues found for this user" },
        { status: 404 }
      );
    }

    const results = await Promise.all(
      leaguesData.map((leagueData) =>
        leagueImportLimit(() =>
          processLeague(leagueData, userId, season, sportLabel).catch((error) => {
            console.error(
              `[Import Sleeper] Failed league ${leagueData.league_id}:`,
              getErrorMessage(error)
            );
            return null;
          })
        )
      )
    );

    const successfulImports = results.filter(
      (result): result is { leagueId: string; commentaryTelemetry: MatchupCommentaryTelemetry } =>
        result !== null
    );
    const imported = successfulImports.length;
    const failed = results.length - imported;
    const commentaryTelemetry = sumCommentaryTelemetry(successfulImports);

    try {
      const [sleeperUser, legacyUser] = await Promise.all([
        cachedSleeperFetch<SleeperUser>(
          `https://api.sleeper.app/v1/user/${encodeURIComponent(sleeperUserId)}`,
          `sleeper:user_profile:${sleeperUserId}`
        ),
        prisma.legacyUser.findUnique({
          where: { sleeperUserId },
          select: { id: true },
        }),
      ]);

      await upsertPlatformIdentity({
        afUserId: userId,
        platform: "sleeper",
        platformUserId: sleeperUser?.user_id ?? sleeperUserId,
        platformUsername: sleeperUser?.username ?? sleeperUserId,
        displayName: sleeperUser?.display_name ?? sleeperUser?.username ?? sleeperUserId,
        avatarUrl: getSleeperAvatarUrl(sleeperUser?.avatar) ?? undefined,
        sport,
      });

      const isLocked = await isPlatformRankLocked(userId, "sleeper");
      if (!isLocked && legacyUser) {
        await computeAndSaveRank(userId, legacyUser);
        await lockPlatformRank(userId, "sleeper");
      }
    } catch (err) {
      console.error("[import-sleeper] rank lock error:", err);
    }

    try {
      await refreshUserRankingsContext(userId);
    } catch (err) {
      console.error("[import-sleeper] rankings context error:", err);
    }

    for (let i = 0; i < leaguesData.length; i++) {
      const row = results[i];
      if (!row) continue;
      const platformLeagueId = leaguesData[i]?.league_id?.toString();
      if (!platformLeagueId) continue;
      void syncLeagueHistory(row.leagueId, platformLeagueId, userId).catch((err) =>
        console.error(`[import-sleeper] History sync failed for ${platformLeagueId}:`, err)
      );
    }

    return NextResponse.json({
      success: true,
      imported,
      failed,
      total: leaguesData.length,
      isLegacy,
      provider: "sleeper",
      sport,
      season,
      commentaryTelemetry,
    });
  } catch (error) {
    console.error("[Import Sleeper]", error);

    return NextResponse.json(
      { error: getErrorMessage(error) || "Import failed" },
      { status: 500 }
    );
  }
}
