import { withApiUsage } from "@/lib/telemetry/usage"
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeTeamAbbrev } from '@/lib/team-abbrev';
import { parseSportsRouteSportParam } from '@/lib/sports-route-params';

export const dynamic = 'force-dynamic';

export const GET = withApiUsage({ endpoint: "/api/sports/injuries", tool: "SportsInjuries" })(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const team = searchParams?.get('team');
    const player = searchParams?.get('player');

    let parsedSport: ReturnType<typeof parseSportsRouteSportParam>;
    try {
      parsedSport = parseSportsRouteSportParam(searchParams?.get('sport'));
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Unsupported sport',
          message: error instanceof Error ? error.message : 'Unsupported sport',
          supportedSports: ['nfl', 'mlb', 'nba', 'nhl', 'ncaaf', 'ncaab', 'soccer', 'world-cup'],
        },
        { status: 400 }
      );
    }

    const normalizedTeam = team ? normalizeTeamAbbrev(team) || team : null;
    const normalizedInjurySport = parsedSport.isWorldCup ? 'WC_SOCCER' : parsedSport.sport;
    const where: Record<string, unknown> = {
      sport: parsedSport.sport,
    };

    if (normalizedTeam) {
      where.team = normalizedTeam;
    }

    if (player) {
      where.playerName = { contains: player, mode: 'insensitive' };
    }

    const reportWhere: Record<string, unknown> = {
      sport: normalizedInjurySport,
    };
    if (normalizedTeam) reportWhere.team = normalizedTeam;
    if (player) reportWhere.playerName = { contains: player, mode: 'insensitive' };

    const [sportsInjuries, injuryReports] = await Promise.all([
      prisma.sportsInjury.findMany({
        where,
        orderBy: { fetchedAt: 'desc' },
        take: 300,
      }),
      prisma.injuryReportRecord.findMany({
        where: reportWhere,
        orderBy: { reportDate: 'desc' },
        take: 300,
      }),
    ]);

    const reportRows = injuryReports.map((injury) => ({
      id: injury.id,
      sport: injury.sport,
      externalId: injury.playerId,
      playerName: injury.playerName,
      playerId: injury.playerId,
      team: injury.team,
      status: injury.status,
      type: injury.bodyPart,
      description: injury.notes,
      date: injury.reportDate,
      source: 'injury_reports',
      fetchedAt: injury.reportDate,
      expiresAt: null,
      normalized: true,
    }));
    const injuries = [...sportsInjuries, ...reportRows].slice(0, 300);
    const latestFetched = injuries
      .map((injury) => {
        const value = injury.fetchedAt ?? injury.date ?? null;
        return value instanceof Date ? value : value ? new Date(value) : null;
      })
      .filter((value): value is Date => value != null && Number.isFinite(value.getTime()))
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
    const now = Date.now();
    const staleSportsRows = sportsInjuries.some((injury) => injury.expiresAt < new Date());
    const staleReportRows = injuryReports.some((injury) => now - injury.reportDate.getTime() > 6 * 60 * 60 * 1000);
    const stale = injuries.length > 0 && (staleSportsRows || staleReportRows);

    return NextResponse.json({
      injuries,
      count: injuries.length,
      sport: parsedSport.sport,
      requestedSport: parsedSport.requestedSport,
      isWorldCup: parsedSport.isWorldCup,
      sources: [...new Set(injuries.map(i => i.source))],
      refreshed: false,
      isStale: stale,
      lastSyncedAt: latestFetched?.toISOString() ?? null,
      message:
        injuries.length === 0
          ? `No cached ${parsedSport.isWorldCup ? 'World Cup' : parsedSport.sport} injuries are available yet.`
          : stale
            ? 'Cached injury data is stale. Admin/cron sync must refresh provider data.'
            : null,
    });
  } catch (error) {
    console.error('[Injuries API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch injuries', details: String(error) },
      { status: 500 }
    );
  }
})

