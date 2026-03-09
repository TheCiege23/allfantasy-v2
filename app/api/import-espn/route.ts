import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { LeagueSport } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  leagueId: z.string().min(1),
  season: z.number().int().default(2025),
  espnS2: z.string().optional(),
  swid: z.string().optional(),
});

type EspnTeam = {
  id?: number;
  logo?: string | null;
  location?: string;
  nickname?: string;
  name?: string;
  abbrev?: string;
  points?: number;
  owners?: Array<{
    firstName?: string;
    lastName?: string;
  }>;
  record?: {
    overall?: {
      wins?: number;
      losses?: number;
      ties?: number;
      pointsFor?: number;
      pointsAgainst?: number;
    };
  };
};

type EspnMatchupSide = {
  teamId?: number;
  totalPoints?: number | null;
};

type EspnMatchup = {
  matchupPeriodId?: number;
  home?: EspnMatchupSide;
  away?: EspnMatchupSide;
};

type EspnLeagueResponse = {
  settings?: {
    name?: string;
    size?: number;
    scoringSettings?: {
      scoringType?: string;
    };
    rosterSettings?: {
      lineupSlotCounts?: Record<string, number>;
    };
  };
  status?: {
    currentMatchupPeriod?: number;
  };
  scoringPeriodId?: number;
  teams?: EspnTeam[];
  schedule?: EspnMatchup[];
  scoreboard?: {
    matchups?: Array<{
      home?: EspnMatchupSide;
      away?: EspnMatchupSide;
    }>;
  };
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

async function fetchJsonWithTimeout<T>(
  url: string,
  headers: Record<string, string>,
  timeoutMs = 10000
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      method: "GET",
      headers,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function getEspnScoring(scoringType: string | undefined): string {
  if (scoringType === "H2H_POINTS") return "h2h-points";
  if (scoringType === "H2H_CATEGORY") return "h2h-category";
  if (scoringType === "TOTAL_POINTS") return "total-points";
  return "standard";
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

    const { leagueId, season, espnS2, swid } = parsed.data;

    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (compatible; AllFantasy/1.0)",
      Accept: "application/json",
    };

    const cookies: string[] = [];
    if (espnS2) cookies.push(`espn_s2=${espnS2}`);
    if (swid) cookies.push(`SWID=${swid}`);
    if (cookies.length > 0) {
      headers.Cookie = cookies.join("; ");
    }

    const baseUrl = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${encodeURIComponent(leagueId)}`;

    const leagueRes = await fetchJsonWithTimeout(
      `${baseUrl}?view=mTeam&view=mRoster&view=mMatchup&view=mScoreboard&view=mSettings`,
      headers
    );

    if (!leagueRes.ok) {
      if (leagueRes.status === 404) {
        return NextResponse.json(
          { error: "League not found. Check the League ID." },
          { status: 404 }
        );
      }

      if (leagueRes.status === 401 || leagueRes.status === 403) {
        return NextResponse.json(
          {
            error: "This league is private. Please provide your ESPN S2 cookie and SWID.",
          },
          { status: 401 }
        );
      }

      throw new Error(`ESPN API returned ${leagueRes.status}`);
    }

    const data = (await leagueRes.json()) as EspnLeagueResponse;

    const leagueName = data.settings?.name || "ESPN League";
    const leagueSize = data.settings?.size || data.teams?.length || 0;
    const scoringType = data.settings?.scoringSettings?.scoringType;
    const scoring = getEspnScoring(scoringType);
    const rosterSlots = data.settings?.rosterSettings?.lineupSlotCounts;

    const settingsPayload = {
      ...(scoringType ? { scoringType } : {}),
      ...(rosterSlots ? { rosterSlots } : {}),
      ...(data.status?.currentMatchupPeriod
        ? { currentMatchupPeriod: data.status.currentMatchupPeriod }
        : {}),
    };

    const league = await prisma.league.upsert({
      where: {
        userId_platform_platformLeagueId: {
          userId,
          platform: "espn",
          platformLeagueId: leagueId,
        },
      },
      update: {
        name: leagueName,
        leagueSize,
        status: data.status?.currentMatchupPeriod ? "in_season" : "active",
        season,
        sport: LeagueSport.NFL,
        scoring,
        ...(Object.keys(settingsPayload).length > 0
          ? { settings: settingsPayload }
          : {}),
      },
      create: {
        userId,
        platform: "espn",
        platformLeagueId: leagueId,
        name: leagueName,
        sport: LeagueSport.NFL,
        season,
        leagueSize,
        status: "active",
        scoring,
        ...(Object.keys(settingsPayload).length > 0
          ? { settings: settingsPayload }
          : {}),
      },
    });

    const espnTeams = data.teams || [];

    await Promise.all(
      espnTeams.map(async (team) => {
        const externalId = team.id?.toString();
        if (!externalId) return;

        const ownerName = team.owners?.[0]
          ? `${team.owners[0].firstName || ""} ${team.owners[0].lastName || ""}`.trim() ||
            `Owner ${team.id}`
          : `Owner ${team.id}`;

        const teamName =
          team.location && team.nickname
            ? `${team.location} ${team.nickname}`
            : team.name || team.abbrev || `${ownerName}'s Team`;

        const record = team.record?.overall || {};

        await prisma.leagueTeam.upsert({
          where: {
            leagueId_externalId: {
              leagueId: league.id,
              externalId,
            },
          },
          update: {
            ownerName,
            teamName,
            avatarUrl: team.logo || null,
            wins: record.wins ?? 0,
            losses: record.losses ?? 0,
            ties: record.ties ?? 0,
            pointsFor: record.pointsFor ?? team.points ?? 0,
            pointsAgainst: record.pointsAgainst ?? 0,
          },
          create: {
            leagueId: league.id,
            externalId,
            ownerName,
            teamName,
            avatarUrl: team.logo || null,
            wins: record.wins ?? 0,
            losses: record.losses ?? 0,
            ties: record.ties ?? 0,
            pointsFor: record.pointsFor ?? team.points ?? 0,
            pointsAgainst: record.pointsAgainst ?? 0,
          },
        });
      })
    );

    const dbTeams = await prisma.leagueTeam.findMany({
      where: { leagueId: league.id },
      select: { id: true, externalId: true },
    });

    const teamIdMap = new Map(dbTeams.map((team) => [team.externalId, team.id]));

    const schedule = data.schedule || [];
    await Promise.all(
      schedule.map(async (matchup) => {
        const week = matchup.matchupPeriodId;
        if (!week || week < 1 || week > 18) return;

        if (matchup.home) {
          const teamId = teamIdMap.get(matchup.home.teamId?.toString() || "");
          if (teamId && matchup.home.totalPoints != null) {
            await prisma.teamPerformance.upsert({
              where: { teamId_season_week: { teamId, season, week } },
              update: { points: matchup.home.totalPoints || 0 },
              create: { teamId, week, season, points: matchup.home.totalPoints || 0 },
            });
          }
        }

        if (matchup.away) {
          const teamId = teamIdMap.get(matchup.away.teamId?.toString() || "");
          if (teamId && matchup.away.totalPoints != null) {
            await prisma.teamPerformance.upsert({
              where: { teamId_season_week: { teamId, season, week } },
              update: { points: matchup.away.totalPoints || 0 },
              create: { teamId, week, season, points: matchup.away.totalPoints || 0 },
            });
          }
        }
      })
    );

    if (data.scoreboard?.matchups) {
      const currentWeek = data.scoringPeriodId || data.status?.currentMatchupPeriod || 1;

      await Promise.all(
        data.scoreboard.matchups.map(async (matchup) => {
          for (const side of [matchup.home, matchup.away]) {
            if (!side) continue;

            const teamId = teamIdMap.get(side.teamId?.toString() || "");
            if (teamId && side.totalPoints != null) {
              await prisma.teamPerformance.upsert({
                where: {
                  teamId_season_week: {
                    teamId,
                    season,
                    week: currentWeek,
                  },
                },
                update: {
                  points: side.totalPoints || 0,
                },
                create: {
                  teamId,
                  week: currentWeek,
                  season,
                  points: side.totalPoints || 0,
                },
              });
            }
          }
        })
      );
    }

    return NextResponse.json({
      success: true,
      imported: 1,
      leagueName,
      provider: "espn",
      season,
    });
  } catch (error) {
    console.error("[Import ESPN]", error);

    return NextResponse.json(
      { error: getErrorMessage(error) || "ESPN import failed" },
      { status: 500 }
    );
  }
}