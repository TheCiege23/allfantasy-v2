import { NextResponse } from "next/server";
import pLimit from "p-limit";
import { z } from "zod";
import { LeagueSport } from "@prisma/client";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import {
  consumeRateLimit,
  getClientIp,
  buildRateLimit429,
} from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const leagueImportLimit = pLimit(8);
const weekImportLimit = pLimit(4);

const CACHE_TTL_MS = 1000 * 60 * 60 * 24;

const bodySchema = z.object({
  sleeperUserId: z.string().min(1).max(100),
  sport: z.enum(["nfl", "nba", "mlb"]).default("nfl"),
  season: z.number().int().min(2020).max(2030).default(2025),
  isLegacy: z.boolean().default(false),
});

const sportMap: Record<"nfl" | "nba" | "mlb", LeagueSport> = {
  nfl: LeagueSport.NFL,
  nba: LeagueSport.NBA,
  mlb: LeagueSport.MLB,
};

type SleeperLeague = {
  league_id?: string | number;
  name?: string;
  avatar?: string | null;
  total_rosters?: number | null;
  status?: string | null;
  scoring_settings?: {
    rec?: number | null;
  } | null;
  settings?: {
    type?: number | null;
    leg?: number | null;
    [key: string]: unknown;
  } | null;
  roster_positions?: string[] | null;
};

type SleeperUser = {
  user_id?: string;
  display_name?: string;
  metadata?: {
    team_name?: string;
    avatar?: string;
  } | null;
};

type SleeperRoster = {
  roster_id?: number | string;
  owner_id?: string;
  settings?: {
    wins?: number;
    losses?: number;
    ties?: number;
    fpts?: number;
    fpts_decimal?: number;
    fpts_against?: number;
    fpts_against_decimal?: number;
  } | null;
};

type SleeperMatchup = {
  roster_id?: number | string;
  points?: number | null;
};

function getSleeperAvatarUrl(avatar: string | null | undefined): string | null {
  if (!avatar) return null;
  return `https://sleepercdn.com/avatars/${avatar}`;
}

function getScoringType(league: SleeperLeague): "ppr" | "half-ppr" | "standard" {
  const rec = league.scoring_settings?.rec;

  if (rec === 1) return "ppr";
  if (rec === 0.5) return "half-ppr";
  return "standard";
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

async function fetchJsonWithTimeout<T>(url: string, timeoutMs = 10000): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      return null;
    }

    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function cachedSleeperFetch<T>(url: string, cacheKey: string): Promise<T | null> {
  const cached = await prisma.sportsDataCache.findUnique({
    where: { key: cacheKey },
  });

  if (cached && cached.expiresAt > new Date()) {
    return cached.data as T;
  }

  const data = await fetchJsonWithTimeout<T>(url);
  if (data == null) {
    return null;
  }

  await prisma.sportsDataCache.upsert({
    where: { key: cacheKey },
    update: {
      data,
      expiresAt: new Date(Date.now() + CACHE_TTL_MS),
    },
    create: {
      key: cacheKey,
      data,
      expiresAt: new Date(Date.now() + CACHE_TTL_MS),
    },
  });

  return data;
}

function buildLeagueUpdateData(leagueData: SleeperLeague, season: number, sportLabel: LeagueSport) {
  return {
    name: leagueData.name || "Unnamed League",
    avatarUrl: getSleeperAvatarUrl(leagueData.avatar),
    leagueSize: leagueData.total_rosters ?? null,
    status: leagueData.status || "active",
    season,
    sport: sportLabel,
    scoring: getScoringType(leagueData),
    isDynasty: leagueData.settings?.type === 2,
    ...(leagueData.roster_positions ? { starters: leagueData.roster_positions } : {}),
    ...(leagueData.roster_positions
      ? { rosterSize: leagueData.roster_positions.length }
      : { rosterSize: null }),
    ...(leagueData.settings ? { settings: leagueData.settings } : {}),
  };
}

async function processLeague(
  leagueData: SleeperLeague,
  userId: string,
  season: number,
  sportLabel: LeagueSport
): Promise<string | null> {
  const platformLeagueId = leagueData.league_id?.toString();
  if (!platformLeagueId) return null;

  const leaguePayload = buildLeagueUpdateData(leagueData, season, sportLabel);

  const league = await prisma.league.upsert({
    where: {
      userId_platform_platformLeagueId: {
        userId,
        platform: "sleeper",
        platformLeagueId,
      },
    },
    update: leaguePayload,
    create: {
      userId,
      platform: "sleeper",
      platformLeagueId,
      ...leaguePayload,
    },
  });

  await prisma.sportsDataCache.upsert({
    where: { key: `sleeper:league:${platformLeagueId}` },
    update: {
      data: leagueData,
      expiresAt: new Date(Date.now() + CACHE_TTL_MS),
    },
    create: {
      key: `sleeper:league:${platformLeagueId}`,
      data: leagueData,
      expiresAt: new Date(Date.now() + CACHE_TTL_MS),
    },
  });

  const [users, rosters] = await Promise.all([
    cachedSleeperFetch<SleeperUser[]>(
      `https://api.sleeper.app/v1/league/${encodeURIComponent(platformLeagueId)}/users`,
      `sleeper:users:${platformLeagueId}`
    ),
    cachedSleeperFetch<SleeperRoster[]>(
      `https://api.sleeper.app/v1/league/${encodeURIComponent(platformLeagueId)}/rosters`,
      `sleeper:rosters:${platformLeagueId}`
    ),
  ]);

  if (!Array.isArray(users) || !Array.isArray(rosters)) {
    return league.id;
  }

  const userMap = new Map<string, SleeperUser>();
  for (const user of users) {
    if (user.user_id) {
      userMap.set(user.user_id, user);
    }
  }

  const teamUpserts = rosters
    .map((roster) => {
      const owner = roster.owner_id ? userMap.get(roster.owner_id) : undefined;
      const ownerName = owner?.display_name || `Owner ${roster.roster_id ?? "Unknown"}`;
      const teamName = owner?.metadata?.team_name || `${ownerName}'s Team`;
      const externalId = roster.roster_id?.toString() || roster.owner_id?.toString();

      if (!externalId) {
        return null;
      }

      const wins = roster.settings?.wins ?? 0;
      const losses = roster.settings?.losses ?? 0;
      const ties = roster.settings?.ties ?? 0;
      const pointsFor =
        (roster.settings?.fpts ?? 0) + (roster.settings?.fpts_decimal ?? 0) / 100;
      const pointsAgainst =
        (roster.settings?.fpts_against ?? 0) +
        (roster.settings?.fpts_against_decimal ?? 0) / 100;

      return prisma.leagueTeam.upsert({
        where: {
          leagueId_externalId: {
            leagueId: league.id,
            externalId,
          },
        },
        update: {
          ownerName,
          teamName,
          avatarUrl:
            getSleeperAvatarUrl(owner?.metadata?.avatar) ??
            getSleeperAvatarUrl(owner?.user_id || roster.owner_id),
          wins,
          losses,
          ties,
          pointsFor,
          pointsAgainst,
        },
        create: {
          leagueId: league.id,
          externalId,
          ownerName,
          teamName,
          avatarUrl:
            getSleeperAvatarUrl(owner?.metadata?.avatar) ??
            getSleeperAvatarUrl(owner?.user_id || roster.owner_id),
          wins,
          losses,
          ties,
          pointsFor,
          pointsAgainst,
        },
      });
    })
    .filter((value) => value !== null);

  await Promise.all(teamUpserts);

  const teams = await prisma.leagueTeam.findMany({
    where: { leagueId: league.id },
    select: { id: true, externalId: true },
  });

  const teamsByExternalId = new Map(teams.map((team) => [team.externalId, team.id]));

  const currentWeek = leagueData.settings?.leg ?? 10;
  const maxWeek = Math.min(currentWeek, 18);

  await Promise.all(
    Array.from({ length: maxWeek }, (_, index) => index + 1).map((week) =>
      weekImportLimit(async () => {
        const matchups = await cachedSleeperFetch<SleeperMatchup[]>(
          `https://api.sleeper.app/v1/league/${encodeURIComponent(platformLeagueId)}/matchups/${week}`,
          `sleeper:matchup:${platformLeagueId}:w${week}`
        );

        if (!Array.isArray(matchups)) {
          return;
        }

        await Promise.all(
          matchups.map(async (matchup) => {
            const teamId = teamsByExternalId.get(matchup.roster_id?.toString() || "");

            if (!teamId || matchup.points == null) {
              return;
            }

            await prisma.teamPerformance.upsert({
              where: {
                teamId_season_week: {
                  teamId,
                  season,
                  week,
                },
              },
              update: {
                points: matchup.points || 0,
              },
              create: {
                teamId,
                season,
                week,
                points: matchup.points || 0,
              },
            });
          })
        );
      })
    )
  );

  return league.id;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ?? null;

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

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

    const imported = results.filter(Boolean).length;
    const failed = results.filter((result) => result === null).length;

    return NextResponse.json({
      success: true,
      imported,
      failed,
      total: leaguesData.length,
      isLegacy,
      provider: "sleeper",
      sport,
      season,
    });
  } catch (error) {
    console.error("[Import Sleeper]", error);

    return NextResponse.json(
      { error: getErrorMessage(error) || "Import failed" },
      { status: 500 }
    );
  }
}